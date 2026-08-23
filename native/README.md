# biashara native

Inference, integrity, and benchmarking for Biashara Local.

## Layout

```
native/
  biashara/
    inference.py         llama-cpp-python wrapper
    integrity.py         Merkle + ed25519 verifier
    service.py           FastAPI streaming bridge for the UI
    bench/
      harness.py         model bake-off runner
      prompts.json       fixed prompt set (10 items)
      scoring.py         ADTC Sperf/Seff/Pthermal formulas
      rescore.py         re-emit markdown from an existing JSON report
    scripts/
      build_manifest.py  builds and signs assets/manifest.json
      constrain_env.sh   pins CPU governor + freq for stable bench runs
  tests/
    test_integrity.py    7 tests covering happy path + tampering
    test_scoring.py      13 tests covering the ADTC formulas
    test_service.py      4 tests: app wiring + live NDJSON streaming
  pyproject.toml
```

## Setup

Python 3.11 to 3.13 supported. `llama-cpp-python` builds against the local
CPU, so first install can take a few minutes.

```
cd native
python3 -m venv .venv
.venv/bin/pip install -e .[dev]
```

If `llama-cpp-python` fails to build on Python 3.13, drop to 3.12:
```
python3.12 -m venv .venv
```

## Running tests

Integrity round trip and tampering tests do not need a model:
```
.venv/bin/pytest tests/ -v
```

## Building the signed manifest

```
.venv/bin/python -m biashara.scripts.build_manifest \
    --assets ../assets \
    --key ~/.biashara/dev.ed25519.pem \
    --key-id biashara-dev-2026
```

First run generates a keypair. The private key stays on the build machine.
The public key is committed with the app.

## Running the bake-off

The harness refuses to start unless the CPU governor is `performance` and
turbo boost is off, which keeps token throughput deterministic across
runs. On Linux, `sudo biashara/scripts/constrain_env.sh` sets both. Pass
`--no-strict-env` to bypass for local iteration only.

With GGUF files under `../assets/models/`:

```
.venv/bin/python -m biashara.bench.harness \
    --model qwen0.8b:Q4_K_M:../assets/models/qwen2.5-0.5b-instruct-q4_k_m.gguf \
    --model qwen2b:Q4_K_M:../assets/models/qwen2.5-1.5b-instruct-q4_k_m.gguf \
    --reps 3 --ctx 2048 --kv q8_0
```

Reports land in `../bench/reports/bakeoff_<timestamp>.{json,md}` plus a
rolling `bakeoff.md`.

## Public API

Load and verify an asset before using it (used by the retrieval layer):
```python
from biashara.integrity import Verifier, load_public_key

verifier = Verifier(assets_root, load_public_key(pub_key_path))
pdf_bytes = verifier.read_verified("corpus/kra_etims.pdf")
# chunk and embed pdf_bytes downstream
```

Load a model and stream tokens directly from Python:
```python
from pathlib import Path
from biashara.inference import Session, LoadCfg, GenParams

session = Session(Path("assets/models/qwen0.8b.q4_k_m.gguf"), LoadCfg())
for piece in session.generate(prompt, GenParams(max_tokens=256)):
    handle_token(piece)
```

## Serving the model to the UI

`biashara.service` exposes a small FastAPI app bound to `127.0.0.1` that
streams tokens over NDJSON. Intended to be embedded next to the Tauri or
webview shell.

```
BIASHARA_MODEL_PATH=/absolute/path/to/qwen2.5-0.5b-instruct-q4_k_m.gguf \
    .venv/bin/python -m biashara.service
```

Endpoints:

- `GET /health` returns model info and thread count.
- `POST /generate` accepts `{prompt, max_tokens?, temperature?, top_p?, stop?}`
  and streams `application/x-ndjson` lines: one `{"type":"token","text":"..."}`
  per token, terminated by `{"type":"done","tokens_generated":N,"duration_s":T}`.

Environment:

- `BIASHARA_MODEL_PATH` (required) absolute path to a `.gguf` file
- `BIASHARA_CTX` (default 2048)
- `BIASHARA_KV_TYPE` (default `q8_0`)
- `BIASHARA_HOST` (default `127.0.0.1`; do not change without reason)
- `BIASHARA_PORT` (default `8765`)

Frontend consumption sketch (fetch + streaming reader):
```javascript
const res = await fetch("http://127.0.0.1:8765/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, max_tokens: 256 }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
    if (!line.trim()) continue;
    const evt = JSON.parse(line);
    if (evt.type === "token") appendToUi(evt.text);
    if (evt.type === "done")  markComplete(evt);
    if (evt.type === "error") showError(evt.message);
  }
}
```

## Acceptance criteria

- Bake-off report committed under `bench/reports/`, median of three runs,
  captured on hardware that matches or approximates the ADTC profile. The
  approximation, if any, is noted in the report.
- Peak process RAM under 1.2 GB as measured by the ADTC profiler.
- Sustained decode throughput above 20 tokens per second across three
  60 second runs.
- No thermal throttle events and no core above 85 C during those runs.
- Integrity verifier accepts a valid signed manifest and rejects mutated
  files, tampered signatures, tampered root, missing files, and manifests
  signed by a different key. Covered by `tests/test_integrity.py`.
- All benchmark numbers reproducible via
  `python -m biashara.bench.harness` from a clean checkout.
