# Person B: Corpus, Retrieval, and Evaluation

Compliance Q&A for Biashara Local is grounded in a curated local corpus
with precomputed embeddings, SQLite FTS5 indexing, and a 200-item eval set
for Sacc measurement.

## Layout

```
assets/corpus/              Curated KRA/eTIMS/VAT/TOT text sources
assets/index/               compliance.sqlite (built index, committed)
eval/
  items.json                200-item graded eval set
  ablations.json            Retrieval ablation table
src/data/corpus.generated.json   Frontend corpus export from index

native/biashara/retrieval/
  chunking.py               Parse corpus files into sections
  embeddings.py             Build-time MiniLM embeddings (384-dim)
  index.py                  SQLite schema + FTS5
  search.py                 Hybrid retrieval pipeline
  eval_scoring.py           Sacc grading formulas

native/biashara/scripts/
  build_index.py            Chunk, embed, index, export JSON
  generate_eval_set.py      Generate 200 eval items from corpus
  run_eval.py               Measure Sacc
  run_ablation.py           Compare top-k configurations

native/biashara/retrieval_service.py   FastAPI on 127.0.0.1:8766
```

## Build the index

Requires build dependencies (sentence-transformers, runs on build machine only):

```bash
cd native
.venv/bin/pip install -e '.[build]'
.venv/bin/python -m biashara.scripts.build_index \
    --corpus ../assets/corpus \
    --out ../assets/index/compliance.sqlite \
    --export-json ../src/data/corpus.generated.json
```

Embeddings use `all-MiniLM-L6-v2` (384 dimensions). The model never runs on
the target laptop at query time. Query-time reranking uses BM25 + keyword
scoring + query expansion over precomputed chunk embeddings.

## Run the retrieval service

```bash
BIASHARA_INDEX_PATH=../assets/index/compliance.sqlite \
    .venv/bin/python -m biashara.retrieval_service
```

Endpoints:

- `GET /health` — index metadata
- `POST /retrieve` — `{question, limit?}` → top-k chunks with scores
- `GET /corpus` — list indexed documents
- `GET /corpus/{doc_id}` — full document with chunks

## Generate and run eval

```bash
.venv/bin/python -m biashara.scripts.generate_eval_set \
    --index ../assets/index/compliance.sqlite \
    --out ../eval/items.json

.venv/bin/python -m biashara.scripts.run_eval \
    --index ../assets/index/compliance.sqlite \
    --eval ../eval/items.json \
    --out ../bench/reports/retrieval_eval.json \
    --markdown ../bench/reports/retrieval_eval.md
```

## Sacc scoring

Each eval item is graded on:

| Component | Weight | Criterion |
|-----------|--------|-----------|
| Retrieval hit | 50% | Expected chunk in top-k |
| Answer F1 | 50% | Token F1 vs reference answer |

**Sacc** = mean(item score) × 100. Target: **≥ 70**.

Latest measured score: see `bench/reports/retrieval_eval.md`.

## Ablation results

See `eval/ablations.json`. Selected configuration: **hybrid top-3** (FTS5 +
keyword + embedding rerank). Rejected: larger chunks (512 tokens), smaller
chunks (128 tokens), top-k=10 (exceeds 2048 context budget).

## Corpus sources

All content is a dated snapshot for offline use. Documents cover:

- KRA VAT registration, supplies, returns
- Turnover tax eligibility and filing
- eTIMS onboarding and invoice requirements
- Filing calendar (VAT, TOT, PAYE, annual)
- Business registration and KRA PIN
- Income tax and withholding tax
- Penalties and compliance

Every answer in the UI cites the source document and snapshot date. The app
states when it does not know rather than guessing.

## Integrity

Corpus files under `assets/corpus/` are included in the signed Merkle
manifest (`build_manifest.py`). At runtime, `Verifier.read_verified()` can
verify chunk source files before serving them.
