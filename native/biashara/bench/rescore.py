"""Re-emit the markdown report from an existing bakeoff_*.json.

Useful when the harness has been updated (e.g. new scoring columns) but
you don't want to rerun the bake-off.

Usage:
    python -m biashara.bench.rescore path/to/bakeoff_YYYYMMDDTHHMMSSZ.json
    # writes a sibling .md file (overwrites if present)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from biashara.bench.harness import write_markdown


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path", type=Path)
    ap.add_argument("--out", type=Path, default=None,
                    help="markdown output path (default: sibling .md)")
    args = ap.parse_args(argv)

    report = json.loads(args.json_path.read_text())
    out = args.out or args.json_path.with_suffix(".md")
    write_markdown(report, out)
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
