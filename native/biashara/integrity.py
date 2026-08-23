"""Authenticated retrieval for model weights and the compliance corpus.

The manifest is a JSON document that lists every shipped asset with its
SHA-256 hash and size. A Merkle root over the sorted leaves is signed with
an ed25519 key. At runtime the app verifies the signature, then verifies
each file against its leaf before loading.

This is authenticated retrieval, not zero-knowledge anything. It defends
against tampering during USB or LAN distribution.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PrivateFormat,
    PublicFormat,
    NoEncryption,
)

MANIFEST_VERSION = 1
HASH_CHUNK = 1 << 20  # 1 MiB


class IntegrityError(Exception):
    pass


@dataclass(frozen=True)
class FileEntry:
    path: str
    sha256: str
    size: int

    def leaf(self) -> bytes:
        # leaf = sha256(path || 0x00 || sha256(file_bytes))
        h = hashlib.sha256()
        h.update(self.path.encode("utf-8"))
        h.update(b"\x00")
        h.update(bytes.fromhex(self.sha256))
        return h.digest()


def sha256_file(path: Path) -> tuple[str, int]:
    h = hashlib.sha256()
    size = 0
    with path.open("rb") as f:
        while True:
            b = f.read(HASH_CHUNK)
            if not b:
                break
            h.update(b)
            size += len(b)
    return h.hexdigest(), size


def merkle_root(leaves: Iterable[bytes]) -> bytes:
    layer = list(leaves)
    if not layer:
        raise IntegrityError("empty manifest")
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])
        layer = [
            hashlib.sha256(layer[i] + layer[i + 1]).digest()
            for i in range(0, len(layer), 2)
        ]
    return layer[0]


def _sorted_entries(entries: Iterable[FileEntry]) -> list[FileEntry]:
    return sorted(entries, key=lambda e: e.path)


def build_manifest(
    root_dir: Path,
    signing_key: Ed25519PrivateKey,
    key_id: str,
    created_utc: str,
) -> dict:
    entries: list[FileEntry] = []
    for p in sorted(root_dir.rglob("*")):
        if not p.is_file():
            continue
        if p.name == "manifest.json":
            continue
        rel = p.relative_to(root_dir).as_posix()
        digest, size = sha256_file(p)
        entries.append(FileEntry(rel, digest, size))

    entries = _sorted_entries(entries)
    root = merkle_root(e.leaf() for e in entries)
    sig = signing_key.sign(root).hex()

    return {
        "version": MANIFEST_VERSION,
        "created_utc": created_utc,
        "root": root.hex(),
        "files": [
            {"path": e.path, "sha256": e.sha256, "size": e.size} for e in entries
        ],
        "signature": {"alg": "ed25519", "key_id": key_id, "sig": sig},
    }


class Verifier:
    """Loads a manifest, verifies its signature, and verifies files on demand."""

    def __init__(self, root_dir: Path, verify_key: Ed25519PublicKey) -> None:
        self.root_dir = root_dir
        self._vk = verify_key
        self._manifest = self._load_and_verify_manifest()
        self._entries: dict[str, FileEntry] = {
            e["path"]: FileEntry(e["path"], e["sha256"], e["size"])
            for e in self._manifest["files"]
        }
        self._verified_paths: set[str] = set()

    def _load_and_verify_manifest(self) -> dict:
        mpath = self.root_dir / "manifest.json"
        if not mpath.exists():
            raise IntegrityError(f"missing manifest at {mpath}")
        m = json.loads(mpath.read_text())
        if m.get("version") != MANIFEST_VERSION:
            raise IntegrityError("unsupported manifest version")
        sig_hex = m["signature"]["sig"]
        try:
            self._vk.verify(bytes.fromhex(sig_hex), bytes.fromhex(m["root"]))
        except InvalidSignature as e:
            raise IntegrityError("manifest signature invalid") from e

        entries = [
            FileEntry(f["path"], f["sha256"], f["size"]) for f in m["files"]
        ]
        entries = _sorted_entries(entries)
        recomputed = merkle_root(e.leaf() for e in entries).hex()
        if recomputed != m["root"]:
            raise IntegrityError("manifest root does not match file list")
        return m

    def verify_file(self, rel_path: str) -> Path:
        """Verify a shipped file against its manifest leaf. Returns absolute path."""
        if rel_path in self._verified_paths:
            return self.root_dir / rel_path
        entry = self._entries.get(rel_path)
        if entry is None:
            raise IntegrityError(f"file not in manifest: {rel_path}")
        abs_path = self.root_dir / rel_path
        if not abs_path.exists():
            raise IntegrityError(f"missing file: {rel_path}")
        digest, size = sha256_file(abs_path)
        if size != entry.size or digest != entry.sha256:
            raise IntegrityError(f"hash mismatch: {rel_path}")
        self._verified_paths.add(rel_path)
        return abs_path

    def read_verified(self, rel_path: str) -> bytes:
        """Verify and return full file bytes. Use for corpus chunks."""
        p = self.verify_file(rel_path)
        return p.read_bytes()


def generate_keypair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    sk = Ed25519PrivateKey.generate()
    return sk, sk.public_key()


def save_private_key(sk: Ed25519PrivateKey, path: Path) -> None:
    path.write_bytes(
        sk.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption(),
        )
    )


def save_public_key(pk: Ed25519PublicKey, path: Path) -> None:
    path.write_bytes(
        pk.public_bytes(encoding=Encoding.PEM, format=PublicFormat.SubjectPublicKeyInfo)
    )


def load_public_key(path: Path) -> Ed25519PublicKey:
    from cryptography.hazmat.primitives.serialization import load_pem_public_key
    key = load_pem_public_key(path.read_bytes())
    if not isinstance(key, Ed25519PublicKey):
        raise IntegrityError("expected ed25519 public key")
    return key


def load_private_key(path: Path) -> Ed25519PrivateKey:
    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    key = load_pem_private_key(path.read_bytes(), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise IntegrityError("expected ed25519 private key")
    return key
