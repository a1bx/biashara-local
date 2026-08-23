"""Integrity round trip and negative tests.

Covered:
  - Round trip: build manifest, verify all files.
  - Mutation: flip a byte in a file, verifier rejects.
  - Signature: tamper with the signature, verifier rejects.
  - Root: tamper with the root hash, verifier rejects.
  - Missing file: delete a file listed in the manifest, verifier rejects.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from biashara import integrity


def _seed_assets(tmp_path: Path) -> Path:
    assets = tmp_path / "assets"
    (assets / "models").mkdir(parents=True)
    (assets / "corpus").mkdir(parents=True)
    (assets / "models" / "fake_model.gguf").write_bytes(b"MODEL_BYTES_ABC" * 1024)
    (assets / "corpus" / "kra_etims.txt").write_text("eTIMS rule text placeholder.")
    (assets / "corpus" / "tot_rules.txt").write_text("Turnover tax rule text.")
    return assets


def _build_signed_manifest(assets: Path):
    sk, pk = integrity.generate_keypair()
    manifest = integrity.build_manifest(
        root_dir=assets,
        signing_key=sk,
        key_id="test-key",
        created_utc=datetime.now(timezone.utc).isoformat(),
    )
    (assets / "manifest.json").write_text(json.dumps(manifest))
    return pk


def test_roundtrip_verifies_all_files(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    v = integrity.Verifier(assets, pk)
    v.verify_file("models/fake_model.gguf")
    v.verify_file("corpus/kra_etims.txt")
    v.verify_file("corpus/tot_rules.txt")


def test_read_verified_returns_bytes(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    v = integrity.Verifier(assets, pk)
    data = v.read_verified("corpus/kra_etims.txt")
    assert data == b"eTIMS rule text placeholder."


def test_mutated_file_rejected(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    target = assets / "corpus" / "kra_etims.txt"
    b = bytearray(target.read_bytes())
    b[0] ^= 0x01
    target.write_bytes(bytes(b))

    v = integrity.Verifier(assets, pk)
    with pytest.raises(integrity.IntegrityError, match="hash mismatch"):
        v.verify_file("corpus/kra_etims.txt")


def test_tampered_signature_rejected(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    mpath = assets / "manifest.json"
    m = json.loads(mpath.read_text())
    sig = bytearray(bytes.fromhex(m["signature"]["sig"]))
    sig[0] ^= 0xFF
    m["signature"]["sig"] = bytes(sig).hex()
    mpath.write_text(json.dumps(m))

    with pytest.raises(integrity.IntegrityError, match="signature invalid"):
        integrity.Verifier(assets, pk)


def test_tampered_root_rejected(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    mpath = assets / "manifest.json"
    m = json.loads(mpath.read_text())
    # Flip one hex char of the root, keeping signature intact.
    root = m["root"]
    m["root"] = ("0" if root[0] != "0" else "1") + root[1:]
    mpath.write_text(json.dumps(m))
    with pytest.raises(integrity.IntegrityError):
        integrity.Verifier(assets, pk)


def test_missing_file_rejected(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    pk = _build_signed_manifest(assets)
    (assets / "corpus" / "tot_rules.txt").unlink()
    v = integrity.Verifier(assets, pk)
    with pytest.raises(integrity.IntegrityError, match="missing file"):
        v.verify_file("corpus/tot_rules.txt")


def test_wrong_public_key_rejected(tmp_path: Path) -> None:
    assets = _seed_assets(tmp_path)
    _build_signed_manifest(assets)
    _, other_pk = integrity.generate_keypair()
    with pytest.raises(integrity.IntegrityError):
        integrity.Verifier(assets, other_pk)
