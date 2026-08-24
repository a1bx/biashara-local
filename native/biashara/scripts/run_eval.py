"""Run the compliance retrieval eval set and compute Sacc.

Usage:
    python -m biashara.scripts.run_eval \\
        --index ../assets/index/compliance.sqlite \\
        --eval ../eval/items.json \\
        --out ../bench/reports/retrieval_eval.json

Supports ablation configs via --top-k and --no-embed-rerank.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from biashara.retrieval.eval_scoring import EvalItem, ItemScore, sacc, score_item
from biashara.retrieval.search import SearchEngine


def _answer_from_chunks(question: str, results) -> str:
    """Deterministic answer from retrieved chunks (no LLM)."""
    if not results:
        return ""
    best = results[0]
    return f"{best.text}"


def run_eval(
    engine: SearchEngine,
    items: list[EvalItem],
    top_k: int = 3,
) -> tuple[list[ItemScore], list[dict]]:
    scores: list[ItemScore] = []
    details: list[dict] = []

    for item in items:
        results = engine.retrieve(item.question, limit=top_k)
        chunk_ids = [r.chunk_id for r in results]
        answer = _answer_from_chunks(item.question, results)
        sc = score_item(item, chunk_ids, answer, top_k=top_k)
        scores.append(sc)
        details.append({
            "item_id": item.id,
            "question": item.question,
            "category": item.category,
            "difficulty": item.difficulty,
            "expected_chunks": item.expected_chunk_ids,
            "retrieved_chunks": chunk_ids,
            "retrieval_hit": sc.retrieval_hit,
            "retrieval_rank": sc.retrieval_rank,
            "answer_f1": sc.answer_f1,
            "score": sc.score,
        })

    return scores, details


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=Path, required=True)
    ap.add_argument("--eval", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--top-k", type=int, default=3)
    ap.add_argument("--markdown", type=Path, help="optional markdown summary")
    args = ap.parse_args(argv)

    if not args.index.exists():
        print(f"error: index not found: {args.index}", file=sys.stderr)
        return 2
    if not args.eval.exists():
        print(f"error: eval set not found: {args.eval}", file=sys.stderr)
        return 2

    payload = json.loads(args.eval.read_text())
    items = [
        EvalItem(
            id=i["id"],
            question=i["question"],
            reference_answer=i["reference_answer"],
            expected_chunk_ids=i["expected_chunk_ids"],
            category=i["category"],
            difficulty=i.get("difficulty", "medium"),
        )
        for i in payload["items"]
    ]

    engine = SearchEngine(args.index)
    scores, details = run_eval(engine, items, top_k=args.top_k)

    retrieval_hits = sum(1 for s in scores if s.retrieval_hit)
    avg_f1 = sum(s.answer_f1 for s in scores) / len(scores) if scores else 0
    sacc_score = sacc(scores)

    by_category: dict[str, list[float]] = {}
    by_difficulty: dict[str, list[float]] = {}
    for item, sc in zip(items, scores):
        by_category.setdefault(item.category, []).append(sc.score)
        by_difficulty.setdefault(item.difficulty, []).append(sc.score)

    report = {
        "created_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "index": str(args.index),
        "eval_set": str(args.eval),
        "item_count": len(items),
        "top_k": args.top_k,
        "sacc": sacc_score,
        "retrieval_hit_rate": round(100 * retrieval_hits / len(scores), 2) if scores else 0,
        "mean_answer_f1": round(avg_f1, 4),
        "by_category": {
            k: round(100 * sum(v) / len(v), 2) for k, v in sorted(by_category.items())
        },
        "by_difficulty": {
            k: round(100 * sum(v) / len(v), 2) for k, v in sorted(by_difficulty.items())
        },
        "failures": [
            d for d in details if not d["retrieval_hit"]
        ][:20],
        "details": details,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2))
    print(f"Sacc: {sacc_score} ({len(items)} items, top_k={args.top_k})")
    print(f"Retrieval hit rate: {report['retrieval_hit_rate']}%")
    print(f"Mean answer F1: {report['mean_answer_f1']}")
    print(f"Report: {args.out}")

    if args.markdown:
        md = _markdown_report(report)
        args.markdown.write_text(md)
        print(f"Markdown: {args.markdown}")

    return 0


def _markdown_report(report: dict) -> str:
    lines = [
        "# Compliance Retrieval Eval Report",
        "",
        f"- **Sacc:** {report['sacc']}",
        f"- **Items:** {report['item_count']}",
        f"- **Top-k:** {report['top_k']}",
        f"- **Retrieval hit rate:** {report['retrieval_hit_rate']}%",
        f"- **Mean answer F1:** {report['mean_answer_f1']}",
        f"- **Generated:** {report['created_utc']}",
        "",
        "## By category",
        "",
    ]
    for cat, score in report["by_category"].items():
        lines.append(f"- {cat}: {score}")
    lines.extend(["", "## By difficulty", ""])
    for diff, score in report["by_difficulty"].items():
        lines.append(f"- {diff}: {score}")
    if report["failures"]:
        lines.extend(["", "## Sample retrieval failures", ""])
        for f in report["failures"][:10]:
            lines.append(f"- **{f['item_id']}** ({f['category']}): {f['question']}")
            lines.append(f"  - Expected: {f['expected_chunks']}")
            lines.append(f"  - Got: {f['retrieved_chunks']}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
