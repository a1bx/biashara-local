"""Smoke tests for the FastAPI service.

Kept lightweight: verifies app construction, route registration, and the
request-schema contract. Live model tests are skipped unless the small
0.5B GGUF is present in the expected location, so CI without weights
still passes.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from biashara import service


MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "assets"
    / "models"
    / "qwen2.5-0.5b-instruct-q4_k_m.gguf"
)


def test_app_has_expected_routes() -> None:
    app = service.create_app()
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/health" in paths
    assert "/generate" in paths


def test_generate_request_rejects_empty_prompt() -> None:
    from biashara.service import GenerateRequest
    with pytest.raises(Exception):
        GenerateRequest(prompt="")


def test_generate_request_rejects_out_of_range_temperature() -> None:
    from biashara.service import GenerateRequest
    with pytest.raises(Exception):
        GenerateRequest(prompt="hi", temperature=5.0)


@pytest.mark.skipif(
    not MODEL_PATH.exists(),
    reason="model file not present; skipping live-inference smoke",
)
def test_live_generate_streams_ndjson(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BIASHARA_MODEL_PATH", str(MODEL_PATH))
    # Reset any cached session from a previous test.
    service._session = None
    service._model_path = None
    service._cfg = None

    with TestClient(service.create_app()) as client:
        health = client.get("/health").json()
        assert health["ok"] is True
        assert health["model_path"].endswith(".gguf")

        with client.stream(
            "POST",
            "/generate",
            json={"prompt": "Reply with the single word: pong.", "max_tokens": 8},
        ) as resp:
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("application/x-ndjson")
            events = []
            for line in resp.iter_lines():
                if line.strip():
                    events.append(json.loads(line))

    assert any(e["type"] == "token" for e in events)
    assert events[-1]["type"] == "done"
    assert events[-1]["tokens_generated"] >= 1
    assert events[-1]["duration_s"] > 0.0
