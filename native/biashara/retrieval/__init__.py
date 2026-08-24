"""Compliance corpus retrieval for Biashara Local (Person B).

Build-time: chunk corpus, embed with sentence-transformers, store in SQLite.
Runtime: hybrid FTS5 + keyword retrieval with precomputed embedding rerank.
No embedding model runs on the target laptop at query time.
"""

from biashara.retrieval.search import RetrievalResult, SearchEngine

__all__ = ["SearchEngine", "RetrievalResult"]
