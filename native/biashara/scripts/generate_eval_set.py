"""Generate the 200-item compliance evaluation set from the corpus index.

Items are derived from chunk content with paraphrased questions and
reference answers grounded in the source text. Each item cites expected
chunk IDs for retrieval grading.
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path

from biashara.retrieval.index import _connect


QUESTION_TEMPLATES = [
    ("What is {topic}?", "easy"),
    ("How does {topic} work in Kenya?", "easy"),
    ("Explain {topic} for a small business.", "medium"),
    ("When must I {action}?", "medium"),
    ("What are the requirements for {topic}?", "medium"),
    ("Do I need to {action}?", "easy"),
    ("What happens if I don't {action}?", "hard"),
    ("What is the deadline for {topic}?", "medium"),
    ("Who must {action}?", "medium"),
    ("Can a small business {action}?", "hard"),
    ("What rate applies to {topic}?", "easy"),
    ("How do I {action}?", "easy"),
    ("What documents do I need for {topic}?", "medium"),
    ("Is {topic} mandatory for SMEs?", "hard"),
    ("What penalties apply to {topic}?", "hard"),
]

PARAPHRASE_PREFIXES = [
    "", "As a shop owner, ", "For my M-Pesa business, ", "I'm a sole proprietor — ",
    "My turnover is growing — ", "Quick question: ", "For compliance purposes, ",
]

TOPIC_ACTION_MAP = {
    "vat registration threshold": ("VAT registration", "register for VAT"),
    "turnover tax basics": ("turnover tax", "pay turnover tax"),
    "registering for etims": ("eTIMS registration", "register for eTIMS"),
    "electronic tax invoice requirements": ("tax invoices", "issue eTIMS invoices"),
    "common filing obligations": ("tax filing", "file tax returns"),
    "paye obligations for employers": ("PAYE", "deduct and remit PAYE"),
    "registering a business in Kenya": ("business registration", "register my business"),
    "obtaining a kra pin": ("a KRA PIN", "apply for a KRA PIN"),
    "income tax for small businesses": ("income tax", "pay income tax on profits"),
    "withholding tax on rent": ("withholding tax on rent", "deduct WHT on rent"),
    "late filing penalties": ("late filing penalties", "file returns on time"),
    "tot returns and payment": ("TOT returns", "file turnover tax returns"),
    "vat returns and payment": ("VAT returns", "file VAT returns"),
    "county business permits": ("county business permits", "obtain a business permit"),
    "etims solutions for smes": ("eTIMS for SMEs", "use the eTIMS mobile app"),
    "input vat recovery": ("input VAT recovery", "claim input VAT"),
    "instalment tax": ("instalment tax", "pay instalment tax"),
    "nil returns": ("nil returns", "file a nil return"),
    "eligibility for turnover tax": ("TOT eligibility", "register for turnover tax"),
    "taxable, zero-rated and exempt supplies": ("VATable supplies", "determine if supplies are taxable"),
}


def _reference_from_chunk(text: str, heading: str) -> str:
    """Reference answer for grading: lead sentences from chunk body."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    # Use first two sentences — matches what retrieval returns as chunk text
    lead = " ".join(sentences[:2]) if sentences else text[:300]
    return lead.strip()


def _slug_key(heading: str) -> str:
    return heading.lower().strip()


def generate_items(db_path: Path, target: int = 200, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            """
            SELECT c.id, c.doc_id, c.heading, c.text, d.category, d.title
            FROM chunks c
            JOIN documents d ON d.id = c.doc_id
            ORDER BY c.id
            """
        ).fetchall()
    finally:
        conn.close()

    items: list[dict] = []
    seen_questions: set[str] = set()

    for row in rows:
        heading_key = _slug_key(row["heading"])
        topic, action = TOPIC_ACTION_MAP.get(
            heading_key,
            (row["heading"].lower(), row["heading"].lower()),
        )
        ref = _reference_from_chunk(row["text"], row["heading"])

        for template, difficulty in QUESTION_TEMPLATES:
            if len(items) >= target:
                break
            if "{topic}" in template:
                q_core = template.format(topic=topic)
            else:
                q_core = template.format(action=action)
            # Skip templates that produce nonsense for this topic
            q_lower = q_core.lower()
            if "rate applies" in q_lower and "tax" not in topic and "tot" not in topic:
                continue
            if "what happens if i don't" in q_lower and "register" not in action and "file" not in action:
                continue
            prefix = rng.choice(PARAPHRASE_PREFIXES)
            question = (prefix + q_core).strip()
            q_norm = question.lower()
            if q_norm in seen_questions:
                continue
            seen_questions.add(q_norm)

            items.append({
                "id": f"eval-{len(items) + 1:03d}",
                "question": question,
                "reference_answer": ref,
                "expected_chunk_ids": [row["id"]],
                "category": row["category"],
                "difficulty": difficulty,
                "source_doc": row["title"],
                "source_heading": row["heading"],
            })

    # Fill remaining slots with keyword-variant questions
    extra_templates = [
        "Tell me about {heading}.",
        "What should I know about {heading}?",
        "Summarize {heading} for my business.",
        "{heading} — what are the rules?",
        "I need help understanding {heading}.",
    ]
    idx = 0
    while len(items) < target and rows:
        row = rows[idx % len(rows)]
        tmpl = extra_templates[idx % len(extra_templates)]
        question = tmpl.format(heading=row["heading"])
        q_norm = question.lower()
        if q_norm not in seen_questions:
            seen_questions.add(q_norm)
            ref = _reference_from_chunk(row["text"], row["heading"])
            items.append({
                "id": f"eval-{len(items) + 1:03d}",
                "question": question,
                "reference_answer": ref,
                "expected_chunk_ids": [row["id"]],
                "category": row["category"],
                "difficulty": "medium",
                "source_doc": row["title"],
                "source_heading": row["heading"],
            })
        idx += 1

    return items[:target]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--count", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args(argv)

    if not args.index.exists():
        print(f"error: index not found: {args.index}", file=sys.stderr)
        return 2

    items = generate_items(args.index, target=args.count, seed=args.seed)
    payload = {
        "version": 1,
        "count": len(items),
        "description": "Graded compliance Q&A eval set for Sacc measurement",
        "items": items,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2))
    print(f"wrote {args.out} ({len(items)} items)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
