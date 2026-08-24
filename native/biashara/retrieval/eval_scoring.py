"""Sacc scoring for the 200-item compliance eval set.

Each item is graded on:
  - retrieval hit: expected chunk_id in top-k (50%)
  - answer overlap: token F1 against reference answer (50%)

Sacc = mean(item_score) * 100, target >= 70.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


STOP = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "this", "that", "these", "those", "i",
    "you", "he", "she", "it", "we", "they", "what", "which", "who", "whom",
    "my", "your", "his", "her", "its", "our", "their", "me", "him", "us",
    "them", "business", "businesses", "kenya", "kenyan",
})


def _tokens(text: str) -> set[str]:
    return {
        t for t in re.findall(r"[a-z0-9]+", text.lower())
        if len(t) > 2 and t not in STOP
    }


def token_f1(reference: str, candidate: str) -> float:
    ref = _tokens(reference)
    cand = _tokens(candidate)
    if not ref:
        return 1.0 if not cand else 0.0
    if not cand:
        return 0.0
    common = ref & cand
    if not common:
        return 0.0
    precision = len(common) / len(cand)
    recall = len(common) / len(ref)
    return 2 * precision * recall / (precision + recall)


@dataclass(frozen=True)
class EvalItem:
    id: str
    question: str
    reference_answer: str
    expected_chunk_ids: list[str]
    category: str
    difficulty: str  # easy | medium | hard


@dataclass(frozen=True)
class ItemScore:
    item_id: str
    retrieval_hit: bool
    retrieval_rank: int | None
    answer_f1: float
    score: float


def score_item(
    item: EvalItem,
    retrieved_chunk_ids: list[str],
    generated_answer: str,
    top_k: int = 3,
) -> ItemScore:
    hit = False
    rank: int | None = None
    for i, cid in enumerate(retrieved_chunk_ids[:top_k]):
        if cid in item.expected_chunk_ids:
            hit = True
            rank = i + 1
            break

    retrieval_score = 1.0 if hit else 0.0
    f1 = token_f1(item.reference_answer, generated_answer)
    combined = 0.5 * retrieval_score + 0.5 * f1

    return ItemScore(
        item_id=item.id,
        retrieval_hit=hit,
        retrieval_rank=rank,
        answer_f1=round(f1, 4),
        score=round(combined, 4),
    )


def sacc(scores: list[ItemScore]) -> float:
    if not scores:
        return 0.0
    return round(100.0 * sum(s.score for s in scores) / len(scores), 2)
