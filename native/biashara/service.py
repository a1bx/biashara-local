"""Local streaming inference service for the Biashara Local UI.

Exposes a small FastAPI app bound to 127.0.0.1 that loads a GGUF model
once and streams tokens over NDJSON. Designed to be embedded in a Tauri
or webview shell; do not bind to a public interface.

Endpoints:
    GET  /health    - basic liveness + model info
    POST /generate  - streams NDJSON lines with token pieces and a final
                      {"type": "done"} marker

Request body for /generate:
    {
      "prompt": "...",                (required)
      "max_tokens": 256,              (optional, default 256)
      "temperature": 0.3,             (optional, default 0.3)
      "top_p": 0.9,                   (optional, default 0.9)
      "stop": ["..."]                 (optional)
    }

Response stream (application/x-ndjson):
    {"type":"token","text":"Hel"}
    {"type":"token","text":"lo"}
    {"type":"done","tokens_generated":42,"duration_s":1.83}

Environment variables:
    BIASHARA_MODEL_PATH   required, absolute path to a .gguf file
    BIASHARA_CTX          optional, context window (default 2048)
    BIASHARA_KV_TYPE      optional, KV cache type (default q8_0)
    BIASHARA_HOST         optional, bind host (default 127.0.0.1)
    BIASHARA_PORT         optional, bind port (default 8765)

Run:
    BIASHARA_MODEL_PATH=/absolute/path.gguf \\
        python -m biashara.service
"""

from __future__ import annotations

import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from biashara import __version__
from biashara.inference import GenParams, LoadCfg, Session


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    max_tokens: int = Field(256, ge=1, le=4096)
    temperature: float = Field(0.3, ge=0.0, le=2.0)
    top_p: float = Field(0.9, ge=0.0, le=1.0)
    stop: Optional[list[str]] = None


class HealthResponse(BaseModel):
    ok: bool
    version: str
    model_path: str
    ctx: int
    kv_type: str
    n_threads: int


_session: Optional[Session] = None
_model_path: Optional[Path] = None
_cfg: Optional[LoadCfg] = None


def _load_session() -> Session:
    global _session, _model_path, _cfg
    if _session is not None:
        return _session

    raw_path = os.environ.get("BIASHARA_MODEL_PATH")
    if not raw_path:
        raise RuntimeError(
            "BIASHARA_MODEL_PATH is not set; point it at a .gguf file"
        )
    p = Path(raw_path).expanduser().resolve()
    if not p.exists():
        raise RuntimeError(f"model file not found: {p}")

    ctx = int(os.environ.get("BIASHARA_CTX", "2048"))
    kv_type = os.environ.get("BIASHARA_KV_TYPE", "q8_0")

    cfg = LoadCfg(ctx=ctx, kv_type_k=kv_type, kv_type_v=kv_type)
    _session = Session(p, cfg)
    _model_path = p
    _cfg = cfg
    return _session


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _load_session()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="biashara-local", version=__version__, lifespan=_lifespan)

    # Vite dev server picks whatever port is free (5173, 5174, ...); allow
    # any localhost port during dev. The service itself is bound to
    # 127.0.0.1, so this is not an exposure change.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^(http://(localhost|127\.0\.0\.1):\d+|tauri://localhost)$",
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        s = _load_session()
        assert _model_path is not None and _cfg is not None
        return HealthResponse(
            ok=True,
            version=__version__,
            model_path=_model_path.name,  # only the filename, not the fs path
            ctx=_cfg.ctx,
            kv_type=_cfg.kv_type_k,
            n_threads=s.n_threads,
        )

    @app.post("/generate")
    def generate(req: GenerateRequest) -> StreamingResponse:
        try:
            session = _load_session()
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

        params = GenParams(
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            top_p=req.top_p,
            stop=req.stop or [],
        )

        def _iter() -> AsyncIterator[str]:  # sync generator, FastAPI adapts
            t0 = time.perf_counter()
            n_tokens = 0
            try:
                for piece in session.generate(req.prompt, params):
                    n_tokens += 1
                    yield json.dumps({"type": "token", "text": piece}) + "\n"
                yield (
                    json.dumps({
                        "type": "done",
                        "tokens_generated": n_tokens,
                        "duration_s": round(time.perf_counter() - t0, 3),
                    })
                    + "\n"
                )
            except Exception as e:  # noqa: BLE001
                yield json.dumps({"type": "error", "message": str(e)}) + "\n"

        return StreamingResponse(_iter(), media_type="application/x-ndjson")

    return app


app = create_app()


def main() -> int:
    import uvicorn
    host = os.environ.get("BIASHARA_HOST", "127.0.0.1")
    port = int(os.environ.get("BIASHARA_PORT", "8765"))
    uvicorn.run(app, host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
