"""Build the compliance retrieval index from corpus text files.

Usage:
    python -m biashara.scripts.build_index \\
        --corpus ../assets/corpus \\
        --out ../assets/index/compliance.sqlite \\
        --export-json ../src/data/corpus.generated.json

Requires sentence-transformers (pip install -e '.[build]').
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from biashara.retrieval.chunking import parse_corpus_dir
from biashara.retrieval.embeddings import embed_texts
from biashara.retrieval.index import build_index, export_corpus_json


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build compliance retrieval index")
    ap.add_argument("--corpus", type=Path, required=True, help="corpus text directory")
    ap.add_argument("--out", type=Path, required=True, help="output SQLite path")
    ap.add_argument("--export-json", type=Path, help="export frontend corpus JSON")
    ap.add_argument("--no-embed", action="store_true", help="skip embedding (FTS only)")
    args = ap.parse_args(argv)

    if not args.corpus.is_dir():
        print(f"error: corpus dir not found: {args.corpus}", file=sys.stderr)
        return 2

    docs, chunks = parse_corpus_dir(args.corpus)
    if not chunks:
        print("error: no chunks parsed", file=sys.stderr)
        return 2

    embeddings = None
    if not args.no_embed:
        texts = [f"{c.heading}. {c.text}" for c in chunks]
        print(f"embedding {len(texts)} chunks...", file=sys.stderr)
        embeddings = embed_texts(texts)

    meta = build_index(args.out, docs, chunks, embeddings)
    print(
        f"index: {args.out} ({meta.doc_count} docs, {meta.chunk_count} chunks, "
        f"model={meta.embed_model})"
    )

    if args.export_json:
        args.export_json.parent.mkdir(parents=True, exist_ok=True)
        payload = export_corpus_json(args.out)
        args.export_json.write_text(json.dumps(payload, indent=2))
        print(f"exported {args.export_json}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
