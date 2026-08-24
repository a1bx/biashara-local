"""SQLite index with FTS5 and precomputed embedding blobs."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from biashara.retrieval.chunking import ParsedChunk, ParsedDocument
from biashara.retrieval.embeddings import EMBED_DIM, EMBED_MODEL, embedding_to_blob


SCHEMA_VERSION = 1


@dataclass(frozen=True)
class IndexMeta:
    version: int
    embed_model: str
    embed_dim: int
    chunk_count: int
    doc_count: int
    created_utc: str


def _connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            snapshot TEXT NOT NULL,
            source_path TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL REFERENCES documents(id),
            heading TEXT NOT NULL,
            text TEXT NOT NULL,
            keywords_json TEXT NOT NULL,
            bullets_json TEXT NOT NULL,
            follow_ups_json TEXT NOT NULL,
            embedding BLOB
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            chunk_id UNINDEXED,
            doc_title,
            category,
            heading,
            text,
            keywords,
            content='',
            tokenize='porter unicode61'
        );
        """
    )


def build_index(
    db_path: Path,
    docs: list[ParsedDocument],
    chunks: list[ParsedChunk],
    embeddings: list[list[float]] | None = None,
) -> IndexMeta:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    conn = _connect(db_path)
    try:
        create_schema(conn)
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        for doc in docs:
            conn.execute(
                """
                INSERT INTO documents (id, title, category, doc_type, snapshot, source_path)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (doc.id, doc.title, doc.category, doc.doc_type, doc.snapshot, doc.source_path),
            )

        doc_titles = {d.id: d.title for d in docs}
        doc_cats = {d.id: d.category for d in docs}

        for i, chunk in enumerate(chunks):
            blob = None
            if embeddings and i < len(embeddings):
                blob = embedding_to_blob(embeddings[i])
            conn.execute(
                """
                INSERT INTO chunks
                    (id, doc_id, heading, text, keywords_json, bullets_json, follow_ups_json, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    chunk.id,
                    chunk.doc_id,
                    chunk.heading,
                    chunk.text,
                    json.dumps(chunk.keywords),
                    json.dumps(chunk.bullets),
                    json.dumps(chunk.follow_ups),
                    blob,
                ),
            )
            conn.execute(
                """
                INSERT INTO chunks_fts (chunk_id, doc_title, category, heading, text, keywords)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    chunk.id,
                    doc_titles.get(chunk.doc_id, ""),
                    doc_cats.get(chunk.doc_id, ""),
                    chunk.heading,
                    chunk.text,
                    " ".join(chunk.keywords),
                ),
            )

        meta = IndexMeta(
            version=SCHEMA_VERSION,
            embed_model=EMBED_MODEL if embeddings else "none",
            embed_dim=EMBED_DIM if embeddings else 0,
            chunk_count=len(chunks),
            doc_count=len(docs),
            created_utc=now,
        )
        for k, v in [
            ("schema_version", str(meta.version)),
            ("embed_model", meta.embed_model),
            ("embed_dim", str(meta.embed_dim)),
            ("chunk_count", str(meta.chunk_count)),
            ("doc_count", str(meta.doc_count)),
            ("created_utc", meta.created_utc),
        ]:
            conn.execute("INSERT INTO meta (key, value) VALUES (?, ?)", (k, v))

        conn.commit()
        return meta
    finally:
        conn.close()


def load_meta(db_path: Path) -> IndexMeta | None:
    if not db_path.exists():
        return None
    conn = _connect(db_path)
    try:
        rows = {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM meta")}
        if not rows:
            return None
        return IndexMeta(
            version=int(rows.get("schema_version", "0")),
            embed_model=rows.get("embed_model", "none"),
            embed_dim=int(rows.get("embed_dim", "0")),
            chunk_count=int(rows.get("chunk_count", "0")),
            doc_count=int(rows.get("doc_count", "0")),
            created_utc=rows.get("created_utc", ""),
        )
    finally:
        conn.close()


def export_corpus_json(db_path: Path) -> dict:
    """Export index contents for the frontend bundle."""
    conn = _connect(db_path)
    try:
        docs = []
        for row in conn.execute("SELECT * FROM documents ORDER BY title"):
            doc_id = row["id"]
            chunks = []
            for cr in conn.execute(
                "SELECT * FROM chunks WHERE doc_id = ? ORDER BY heading", (doc_id,)
            ):
                chunks.append({
                    "id": cr["id"],
                    "heading": cr["heading"],
                    "text": cr["text"],
                    "keywords": json.loads(cr["keywords_json"]),
                    "bullets": json.loads(cr["bullets_json"]),
                    "followUps": json.loads(cr["follow_ups_json"]),
                })
            docs.append({
                "id": doc_id,
                "title": row["title"],
                "category": row["category"],
                "docType": row["doc_type"],
                "snapshot": row["snapshot"],
                "status": "Indexed",
                "chunks": chunks,
            })
        meta = load_meta(db_path)
        return {
            "meta": {
                "chunkCount": meta.chunk_count if meta else 0,
                "docCount": meta.doc_count if meta else 0,
                "embedModel": meta.embed_model if meta else "none",
                "createdUtc": meta.created_utc if meta else "",
            },
            "documents": docs,
        }
    finally:
        conn.close()
