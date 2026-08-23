"""Build a signed manifest for the assets directory.

Usage:
    python -m biashara.scripts.build_manifest \\
        --assets ../assets \\
        --key ~/.biashara/dev.ed25519.pem \\
        --key-id biashara-dev-2026

If --key does not exist, a fresh keypair is generated and both halves are
written next to it (dev.ed25519.pem, dev.ed25519.pub.pem). Never commit
the private key.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from biashara import integrity


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", required=True, type=Path,
                    help="assets root directory (contains models/, corpus/)")
    ap.add_argument("--key", required=True, type=Path,
                    help="path to ed25519 private key PEM")
    ap.add_argument("--key-id", required=True,
                    help="identifier baked into the manifest")
    args = ap.parse_args(argv)

    if not args.assets.is_dir():
        print(f"error: assets dir not found: {args.assets}", file=sys.stderr)
        return 2

    if args.key.exists():
        sk = integrity.load_private_key(args.key)
    else:
        args.key.parent.mkdir(parents=True, exist_ok=True)
        sk, pk = integrity.generate_keypair()
        integrity.save_private_key(sk, args.key)
        pub_path = args.key.with_suffix(".pub.pem")
        integrity.save_public_key(pk, pub_path)
        print(f"generated new keypair. public: {pub_path}", file=sys.stderr)

    manifest = integrity.build_manifest(
        root_dir=args.assets,
        signing_key=sk,
        key_id=args.key_id,
        created_utc=_iso_now(),
    )
    out = args.assets / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2, sort_keys=True))
    print(f"wrote {out} ({len(manifest['files'])} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
