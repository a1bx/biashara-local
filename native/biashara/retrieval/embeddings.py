"""Build-time embedding helpers.

The embedding model (all-MiniLM-L6-v2, 384 dims) runs only during
`build_index`, never on the target laptop at query time.
"""

from __future__ import annotations

import struct
from typing import TYPE_CHECKING

EMBED_DIM = 384
EMBED_MODEL = "all-MiniLM-L6-v2"


def embedding_to_blob(vec: list[float]) -> bytes:
    return struct.pack(f"{len(vec)}f", *vec)


def blob_to_embedding(blob: bytes) -> list[float]:
    n = len(blob) // 4
    return list(struct.unpack(f"{n}f", blob))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def average_vectors(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    dim = len(vectors[0])
    acc = [0.0] * dim
    for v in vectors:
        for i, x in enumerate(v):
            acc[i] += x
    n = len(vectors)
    avg = [x / n for x in acc]
    # L2-normalize
    norm = sum(x * x for x in avg) ** 0.5
    if norm == 0:
        return avg
    return [x / norm for x in avg]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts using sentence-transformers (build-time only)."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        raise ImportError(
            "sentence-transformers required for build_index. "
            "Install with: pip install -e '.[build]'"
        ) from e

    model = SentenceTransformer(EMBED_MODEL)
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vecs]


if TYPE_CHECKING:
    pass
