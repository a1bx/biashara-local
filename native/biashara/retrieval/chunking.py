"""Parse curated corpus text files into structured chunks.

Each corpus file uses a simple header format:

    # Document Title
    Category: VAT
    DocType: Guide (PDF)
    Snapshot: May 2024

    ## Section heading

    Paragraph text...
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class ParsedDocument:
    id: str
    title: str
    category: str
    doc_type: str
    snapshot: str
    source_path: str


@dataclass
class ParsedChunk:
    id: str
    doc_id: str
    heading: str
    text: str
    keywords: list[str] = field(default_factory=list)
    bullets: list[str] = field(default_factory=list)
    follow_ups: list[str] = field(default_factory=list)


_HEADER_RE = re.compile(r"^(\w[\w\s]*):\s*(.+)$")
_HEADING_RE = re.compile(r"^##\s+(.+)$")


def _slug(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "section"


def _extract_keywords(heading: str, text: str) -> list[str]:
    """Derive search keywords from heading and body."""
    combined = f"{heading} {text}".lower()
    # Multi-word phrases common in Kenyan tax queries
    phrases = [
        "vat registration", "turnover tax", "gross turnover", "kra pin",
        "tax invoice", "electronic invoice", "etims", "itax", "paye",
        "withholding tax", "input vat", "output vat", "nil return",
        "late filing", "penalty", "threshold", "5 million", "25 million",
        "1 million", "20th", "business permit", "ecitizen", "credit note",
        "zero rated", "exempt supplies", "taxable supplies", "instalment tax",
        "corporation tax", "sole proprietor", "m-pesa", "control number",
        "business registration", "county permit", "deregistration",
        "voluntary disclosure", "tax audit", "mobile app", "client software",
    ]
    found = [p for p in phrases if p in combined]
    # Heading as a phrase keyword
    heading_lower = heading.lower()
    found.insert(0, heading_lower)
    # Single tokens from heading
    tokens = [t for t in re.findall(r"[a-z0-9]+", heading_lower) if len(t) > 3]
    return list(dict.fromkeys(found + tokens))


def _extract_bullets(text: str) -> list[str]:
    """Split paragraph into bullet-friendly sentences."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 20][:6]


def _default_follow_ups(category: str, heading: str) -> list[str]:
    base = [
        "What is the VAT registration threshold for businesses in Kenya?",
        "What is turnover tax?",
        "How do I register for eTIMS?",
        "What filing obligations apply to me?",
    ]
    h = heading.lower()
    if "vat" in h or category == "VAT":
        return [
            "What are VATable supplies?",
            "How do I register for eTIMS?",
            "What filing obligations apply to me?",
        ]
    if "tot" in h or "turnover" in h.lower():
        return [
            "What is the VAT registration threshold for businesses in Kenya?",
            "What filing obligations apply to me?",
        ]
    if "etims" in h.lower():
        return [
            "What must a tax invoice contain?",
            "What is the VAT registration threshold for businesses in Kenya?",
        ]
    return base[:3]


def parse_corpus_file(path: Path) -> tuple[ParsedDocument, list[ParsedChunk]]:
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    title = path.stem.replace("-", " ").title()
    category = "Business Compliance"
    doc_type = "Guide (PDF)"
    snapshot = "2024"

    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith("# "):
            title = line[2:].strip()
            body_start = i + 1
            break

    for i in range(body_start, min(body_start + 6, len(lines))):
        m = _HEADER_RE.match(lines[i].strip())
        if not m:
            continue
        key, val = m.group(1).lower(), m.group(2).strip()
        if key == "category":
            category = val
        elif key == "doctype":
            doc_type = val
        elif key == "snapshot":
            snapshot = val

    doc_id = path.stem
    doc = ParsedDocument(
        id=doc_id,
        title=title,
        category=category,
        doc_type=doc_type,
        snapshot=snapshot,
        source_path=path.name,
    )

    chunks: list[ParsedChunk] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        if not current_heading:
            return
        text = "\n".join(current_lines).strip()
        if not text:
            return
        chunk_id = f"{doc_id}-{_slug(current_heading)}"
        chunks.append(
            ParsedChunk(
                id=chunk_id,
                doc_id=doc_id,
                heading=current_heading,
                text=text,
                keywords=_extract_keywords(current_heading, text),
                bullets=_extract_bullets(text),
                follow_ups=_default_follow_ups(category, current_heading),
            )
        )

    for line in lines[body_start:]:
        hm = _HEADING_RE.match(line.strip())
        if hm:
            flush()
            current_heading = hm.group(1).strip()
            current_lines = []
        elif current_heading is not None:
            if line.strip() or current_lines:
                current_lines.append(line)

    flush()
    return doc, chunks


def parse_corpus_dir(corpus_dir: Path) -> tuple[list[ParsedDocument], list[ParsedChunk]]:
    docs: list[ParsedDocument] = []
    chunks: list[ParsedChunk] = []
    for path in sorted(corpus_dir.glob("*.txt")):
        doc, doc_chunks = parse_corpus_file(path)
        docs.append(doc)
        chunks.extend(doc_chunks)
    return docs, chunks
