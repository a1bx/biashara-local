"""Standalone retrieval service for compliance Q&A.

Runs independently of the LLM so retrieval works even when no model
is loaded. Binds to 127.0.0.1:8766 by default.

Endpoints:
    GET  /health
    POST /retrieve   {question, limit?}
    GET  /corpus
    GET  /corpus/{doc_id}
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from biashara import __version__
from biashara.retrieval.search import SearchEngine


class RetrieveRequest(BaseModel):
    question: str = Field(..., min_length=1)
    limit: int = Field(3, ge=1, le=10)


class ChunkMatch(BaseModel):
    chunk_id: str
    doc_id: str
    doc_title: str
    category: str
    doc_type: str
    snapshot: str
    heading: str
    text: str
    keywords: list[str]
    bullets: list[str]
    follow_ups: list[str]
    score: float


class RetrieveResponse(BaseModel):
    matches: list[ChunkMatch]
    confident: bool


class HealthResponse(BaseModel):
    ok: bool
    version: str
    index_path: str
    doc_count: int
    chunk_count: int
    embed_model: str


_engine: Optional[SearchEngine] = None
_index_path: Optional[Path] = None


def _default_index_path() -> Path:
    env = os.environ.get("BIASHARA_INDEX_PATH")
    if env:
        return Path(env).expanduser().resolve()
    # Relative to repo root when running from native/
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "assets" / "index" / "compliance.sqlite"
        if candidate.exists():
            return candidate
    return Path("assets/index/compliance.sqlite").resolve()


def _load_engine() -> SearchEngine:
    global _engine, _index_path
    if _engine is not None:
        return _engine
    path = _default_index_path()
    if not path.exists():
        raise RuntimeError(f"compliance index not found: {path}")
    _engine = SearchEngine(path)
    _index_path = path
    return _engine


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _load_engine()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="biashara-retrieval", version=__version__, lifespan=_lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^(http://(localhost|127\.0\.0\.1):\d+|tauri://localhost)$",
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        engine = _load_engine()
        assert engine.meta is not None and _index_path is not None
        return HealthResponse(
            ok=True,
            version=__version__,
            index_path=_index_path.name,
            doc_count=engine.meta.doc_count,
            chunk_count=engine.meta.chunk_count,
            embed_model=engine.meta.embed_model,
        )

    @app.post("/retrieve", response_model=RetrieveResponse)
    def retrieve(req: RetrieveRequest) -> RetrieveResponse:
        try:
            engine = _load_engine()
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e

        results = engine.retrieve(req.question, limit=req.limit)
        matches = [
            ChunkMatch(
                chunk_id=r.chunk_id,
                doc_id=r.doc_id,
                doc_title=r.doc_title,
                category=r.category,
                doc_type=r.doc_type,
                snapshot=r.snapshot,
                heading=r.heading,
                text=r.text,
                keywords=r.keywords,
                bullets=r.bullets,
                follow_ups=r.follow_ups,
                score=r.score,
            )
            for r in results
        ]
        confident = bool(matches and matches[0].score >= 3.0)
        return RetrieveResponse(matches=matches, confident=confident)

    @app.get("/corpus")
    def list_corpus() -> dict:
        engine = _load_engine()
        return {"documents": engine.list_documents()}

    @app.get("/corpus/{doc_id}")
    def get_corpus_doc(doc_id: str) -> dict:
        engine = _load_engine()
        doc = engine.get_document(doc_id)
        if doc is None:
            raise HTTPException(status_code=404, detail="document not found")
        return doc

    return app


app = create_app()


def main() -> int:
    import uvicorn
    host = os.environ.get("BIASHARA_RETRIEVAL_HOST", "127.0.0.1")
    port = int(os.environ.get("BIASHARA_RETRIEVAL_PORT", "8766"))
    uvicorn.run(app, host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
