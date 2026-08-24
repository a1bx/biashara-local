"""Tests for compliance corpus chunking and retrieval."""

from __future__ import annotations

from pathlib import Path

import pytest

from biashara.retrieval.chunking import parse_corpus_dir, parse_corpus_file
from biashara.retrieval.eval_scoring import EvalItem, sacc, score_item, token_f1
from biashara.retrieval.index import build_index, export_corpus_json, load_meta
from biashara.retrieval.search import SearchEngine

REPO = Path(__file__).resolve().parents[2]
CORPUS = REPO / "assets" / "corpus"


def test_parse_corpus_files():
    assert CORPUS.is_dir()
    docs, chunks = parse_corpus_dir(CORPUS)
    assert len(docs) >= 8
    assert len(chunks) >= 40
    assert all(c.keywords for c in chunks)
    assert all(c.bullets for c in chunks)


def test_vat_threshold_chunk():
    path = CORPUS / "kra-vat-guide.txt"
    doc, chunks = parse_corpus_file(path)
    assert doc.category == "VAT"
    headings = [c.heading for c in chunks]
    assert "VAT registration threshold" in headings
    threshold = next(c for c in chunks if "threshold" in c.heading.lower())
    assert "5,000,000" in threshold.text or "5 million" in " ".join(threshold.bullets).lower()


def test_build_index_no_embed(tmp_path):
    docs, chunks = parse_corpus_dir(CORPUS)
    db = tmp_path / "test.sqlite"
    meta = build_index(db, docs, chunks, embeddings=None)
    assert meta.chunk_count == len(chunks)
    assert load_meta(db) is not None
    exported = export_corpus_json(db)
    assert len(exported["documents"]) == meta.doc_count


def test_search_vat_threshold(tmp_path):
    docs, chunks = parse_corpus_dir(CORPUS)
    db = tmp_path / "test.sqlite"
    build_index(db, docs, chunks)
    engine = SearchEngine(db)
    results = engine.retrieve("What is the VAT registration threshold for businesses in Kenya?")
    assert results
    assert any("threshold" in r.heading.lower() or "vat" in r.heading.lower() for r in results)


def test_search_kra_pin_disambiguation(tmp_path):
    docs, chunks = parse_corpus_dir(CORPUS)
    db = tmp_path / "test.sqlite"
    build_index(db, docs, chunks)
    engine = SearchEngine(db)
    results = engine.retrieve("How do I obtain a KRA PIN for my business?")
    assert results
    assert "obtaining-a-kra-pin" in results[0].chunk_id


def test_search_etims(tmp_path):
    docs, chunks = parse_corpus_dir(CORPUS)
    db = tmp_path / "test.sqlite"
    build_index(db, docs, chunks)
    engine = SearchEngine(db)
    results = engine.retrieve("How do I register for eTIMS?")
    assert results
    assert "etims" in results[0].heading.lower() or "etims" in results[0].chunk_id


def test_token_f1():
    ref = "Turnover tax is 1.5% of gross monthly turnover."
    cand = "Turnover tax is 1.5% of gross monthly turnover filed on iTax."
    assert token_f1(ref, cand) > 0.7


def test_score_item_hit():
    item = EvalItem(
        id="t1",
        question="q",
        reference_answer="VAT threshold is five million.",
        expected_chunk_ids=["vat-threshold"],
        category="VAT",
        difficulty="easy",
    )
    sc = score_item(item, ["vat-threshold", "other"], "VAT threshold is five million shillings.")
    assert sc.retrieval_hit
    assert sc.score > 0.5


def test_sacc_mean():
    items = [
        score_item(
            EvalItem("a", "q", "answer text here.", ["c1"], "VAT", "easy"),
            ["c1"],
            "answer text here.",
        ),
        score_item(
            EvalItem("b", "q", "other answer.", ["c2"], "VAT", "easy"),
            ["wrong"],
            "unrelated.",
        ),
    ]
    assert sacc(items) == pytest.approx(50.0, abs=0.1)
