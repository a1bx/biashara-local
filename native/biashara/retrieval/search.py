"""Hybrid retrieval: FTS5 BM25 + keyword scoring + embedding rerank.

No embedding model runs at query time. When precomputed embeddings exist,
reranking uses a query vector derived by averaging embeddings of the top
BM25 hits (query expansion), then cosine similarity against all candidates.
"""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from biashara.retrieval.embeddings import (
    average_vectors,
    blob_to_embedding,
    cosine_similarity,
)
from biashara.retrieval.index import _connect, load_meta


# Disambiguation: query phrases that should prefer specific chunk topics
TOPIC_BOOSTS: list[tuple[list[str], list[str], float]] = [
    # (query_must_contain, chunk_id_substrings, boost)
    (["kra pin"], ["obtaining-a-kra-pin", "registering-a-business"], 8.0),
    (["kra pin"], ["etims", "invoice-requirements"], -4.0),
    (["register for etims", "registering for etims", "how do i register for etims"], ["registering-for-etims"], 6.0),
    (["mobile app", "etims mobile"], ["etims-solutions-for-smes"], 8.0),
    (["turnover tax", " tot "], ["turnover-tax", "tot-"], 6.0),
    (["vat threshold", "5 million", "5,000,000"], ["vat-registration-threshold"], 8.0),
    (["withholding tax", "wht"], ["withholding-tax"], 6.0),
    (["business permit", "county permit"], ["county-business-permits"], 8.0),
    (["paye"], ["paye-obligations"], 8.0),
    (["penalt"], ["penalt", "late-filing"], 5.0),
    (["nil return"], ["nil-return"], 8.0),
]

STOP_WORDS = frozenset({
    "what", "is", "the", "a", "an", "for", "of", "in", "to", "do", "i",
    "my", "how", "are", "and", "on", "with", "me", "can", "should", "does",
    "business", "businesses", "kenya", "kenyan", "when", "where", "who",
    "which", "that", "this", "have", "has", "had", "be", "been", "being",
})


@dataclass(frozen=True)
class RetrievalResult:
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
    bm25_rank: float
    embed_rank: float


def _tokenize(text: str) -> list[str]:
    return [
        t for t in re.findall(r"[a-z0-9]+", text.lower())
        if len(t) > 2 and t not in STOP_WORDS
    ]


def _fts_query(tokens: list[str]) -> str:
    """Build FTS5 OR query from tokens."""
    if not tokens:
        return ""
    parts = []
    for t in tokens:
        safe = t.replace('"', "")
        parts.append(f'"{safe}"')
    return " OR ".join(parts)


def _keyword_score(question: str, keywords: list[str], haystack: str) -> float:
    q = question.lower()
    score = 0.0
    for kw in keywords:
        if " " in kw and kw in q:
            score += 4.0
        elif kw in q:
            score += 2.0
    tokens = _tokenize(question)
    hay = haystack.lower()
    for t in tokens:
        if t in hay:
            score += 1.0
    return score


def _topic_boost(question: str, chunk_id: str) -> float:
    q = f" {question.lower()} "
    boost = 0.0
    for must_have, chunk_hints, delta in TOPIC_BOOSTS:
        if any(phrase in q for phrase in must_have):
            if any(hint in chunk_id for hint in chunk_hints):
                boost += delta
    return boost


def _heading_boost(question: str, heading: str) -> float:
    h = heading.lower()
    q = question.lower()
    if h in q:
        return 10.0
    h_tokens = set(_tokenize(h))
    q_tokens = set(_tokenize(q))
    overlap = h_tokens & q_tokens
    return min(6.0, len(overlap) * 2.0)


class SearchEngine:
    """Query the compliance SQLite index."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.meta = load_meta(db_path)
        if self.meta is None:
            raise FileNotFoundError(f"index not found or empty: {db_path}")

    def _load_chunk_row(self, conn: sqlite3.Connection, chunk_id: str) -> sqlite3.Row | None:
        return conn.execute(
            """
            SELECT c.*, d.title AS doc_title, d.category, d.doc_type, d.snapshot
            FROM chunks c
            JOIN documents d ON d.id = c.doc_id
            WHERE c.id = ?
            """,
            (chunk_id,),
        ).fetchone()

    def _row_to_result(
        self,
        row: sqlite3.Row,
        score: float,
        bm25: float = 0.0,
        embed: float = 0.0,
    ) -> RetrievalResult:
        return RetrievalResult(
            chunk_id=row["id"],
            doc_id=row["doc_id"],
            doc_title=row["doc_title"],
            category=row["category"],
            doc_type=row["doc_type"],
            snapshot=row["snapshot"],
            heading=row["heading"],
            text=row["text"],
            keywords=json.loads(row["keywords_json"]),
            bullets=json.loads(row["bullets_json"]),
            follow_ups=json.loads(row["follow_ups_json"]),
            score=score,
            bm25_rank=bm25,
            embed_rank=embed,
        )

    def retrieve(self, question: str, limit: int = 3, candidate_pool: int = 20) -> list[RetrievalResult]:
        tokens = _tokenize(question)
        fts_q = _fts_query(tokens)

        conn = _connect(self.db_path)
        try:
            candidates: dict[str, tuple[float, float]] = {}

            if fts_q:
                rows = conn.execute(
                    """
                    SELECT chunk_id, bm25(chunks_fts) AS rank
                    FROM chunks_fts
                    WHERE chunks_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                    (fts_q, candidate_pool),
                ).fetchall()
                for i, row in enumerate(rows):
                    cid = row["chunk_id"]
                    # bm25 returns negative values; lower is better
                    bm25_score = max(0.0, -float(row["rank"]))
                    candidates[cid] = (bm25_score, 1.0 / (i + 1))

            # Keyword scan fallback / boost
            all_rows = conn.execute(
                """
                SELECT c.id, c.keywords_json, c.heading, c.text,
                       d.title, d.category
                FROM chunks c
                JOIN documents d ON d.id = c.doc_id
                """
            ).fetchall()
            for row in all_rows:
                cid = row["id"]
                kws = json.loads(row["keywords_json"])
                hay = f"{row['title']} {row['category']} {row['heading']} {row['text']}"
                kw = _keyword_score(question, kws, hay)
                kw += _topic_boost(question, cid)
                kw += _heading_boost(question, row["heading"])
                if kw > 0:
                    prev = candidates.get(cid, (0.0, 0.0))
                    candidates[cid] = (prev[0] + kw * 0.5, prev[1])

            if not candidates:
                return []

            # Embedding rerank via query expansion (no runtime embedder)
            embed_scores: dict[str, float] = {}
            if self.meta and self.meta.embed_dim > 0:
                seed_ids = sorted(
                    candidates.keys(),
                    key=lambda c: candidates[c][0],
                    reverse=True,
                )[:5]
                seed_vecs = []
                for sid in seed_ids:
                    row = self._load_chunk_row(conn, sid)
                    if row and row["embedding"]:
                        seed_vecs.append(blob_to_embedding(row["embedding"]))
                if seed_vecs:
                    qvec = average_vectors(seed_vecs)
                    for cid in candidates:
                        row = self._load_chunk_row(conn, cid)
                        if row and row["embedding"]:
                            embed_scores[cid] = cosine_similarity(
                                qvec, blob_to_embedding(row["embedding"])
                            )

            scored: list[tuple[str, float, float, float]] = []
            for cid, (bm25_s, _) in candidates.items():
                emb = embed_scores.get(cid, 0.0)
                combined = bm25_s + emb * 10.0
                scored.append((cid, combined, bm25_s, emb))

            scored.sort(key=lambda x: x[1], reverse=True)
            results: list[RetrievalResult] = []
            for cid, total, bm25_s, emb in scored[:limit]:
                row = self._load_chunk_row(conn, cid)
                if row:
                    results.append(self._row_to_result(row, total, bm25_s, emb))
            return results
        finally:
            conn.close()

    def list_documents(self) -> list[dict]:
        conn = _connect(self.db_path)
        try:
            out = []
            for row in conn.execute("SELECT * FROM documents ORDER BY title"):
                n = conn.execute(
                    "SELECT COUNT(*) AS n FROM chunks WHERE doc_id = ?", (row["id"],)
                ).fetchone()["n"]
                out.append({
                    "id": row["id"],
                    "title": row["title"],
                    "category": row["category"],
                    "docType": row["doc_type"],
                    "snapshot": row["snapshot"],
                    "chunkCount": n,
                })
            return out
        finally:
            conn.close()

    def get_document(self, doc_id: str) -> dict | None:
        conn = _connect(self.db_path)
        try:
            row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
            if not row:
                return None
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
            return {
                "id": row["id"],
                "title": row["title"],
                "category": row["category"],
                "docType": row["doc_type"],
                "snapshot": row["snapshot"],
                "status": "Indexed",
                "chunks": chunks,
            }
        finally:
            conn.close()
