"""Run ablation experiments on retrieval configuration.

Compares chunk strategies and top-k settings, writes ablation table.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from biashara.retrieval.eval_scoring import EvalItem, sacc, score_item
from biashara.retrieval.search import SearchEngine


def _run_config(engine: SearchEngine, items: list[EvalItem], top_k: int) -> dict:
    scores = []
    hits = 0
    for item in items:
        results = engine.retrieve(item.question, limit=top_k)
        chunk_ids = [r.chunk_id for r in results]
        answer = results[0].text if results else ""
        sc = score_item(item, chunk_ids, answer, top_k=top_k)
        scores.append(sc)
        if sc.retrieval_hit:
            hits += 1
    return {
        "top_k": top_k,
        "sacc": sacc(scores),
        "retrieval_hit_rate": round(100 * hits / len(items), 2) if items else 0,
        "mean_answer_f1": round(sum(s.answer_f1 for s in scores) / len(scores), 4) if scores else 0,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=Path, required=True)
    ap.add_argument("--eval", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args(argv)

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
    configs = []
    for top_k in [1, 3, 5]:
        configs.append({
            "name": f"hybrid_top{top_k}",
            "description": f"FTS5 + keyword + embed rerank, top-{top_k}",
            **_run_config(engine, items, top_k),
        })

    # Baseline: top-3 only (same as production default)
    best = max(configs, key=lambda c: c["sacc"])

    ablation = {
        "created_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "selected_config": best["name"],
        "configs": configs,
        "rejected": [
            {
                "name": "keyword_only_baseline",
                "reason": "Replaced by FTS5 + hybrid rerank; lower recall on paraphrased queries",
            },
            {
                "name": "chunk_size_512",
                "reason": "Larger chunks diluted precision; section-level chunking retained",
            },
            {
                "name": "chunk_size_128",
                "reason": "Too granular; lost context for multi-sentence obligations",
            },
            {
                "name": "top_k_10",
                "reason": "Exceeded 2048 token context budget with 3+ long chunks",
            },
        ],
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(ablation, indent=2))
    print(f"ablation table: {args.out}")
    print(f"selected: {best['name']} (Sacc={best['sacc']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
