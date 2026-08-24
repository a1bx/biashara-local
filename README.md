# Biashara Local

Offline business assistant for Kenyan SMEs — ADTC 2026.

Runs entirely on-device with no internet after install. Three capabilities:

1. **Statement understanding** — M-Pesa CSV parsing, analytics, narrated Q&A
2. **Document drafting** — quotations, invoices, receipts, letters
3. **Compliance Q&A** — grounded KRA/eTIMS/VAT/TOT answers with citations

## Quick start

```bash
# Frontend
npm install
npm run dev

# Native inference (port 8765) — requires a GGUF model
cd native && pip install -e .
BIASHARA_MODEL_PATH=/path/to/model.gguf python -m biashara.service

# Compliance retrieval (port 8766)
BIASHARA_INDEX_PATH=../assets/index/compliance.sqlite \
    python -m biashara.retrieval_service
```

## Project structure

| Area | Owner | Location |
|------|-------|----------|
| Inference & integrity | Person A | `native/biashara/inference.py`, `integrity.py`, `bench/` |
| Corpus & retrieval | Person B | `assets/corpus/`, `native/biashara/retrieval/`, `eval/` |
| UI & parsers | Person C | `src/` |

See `eval/README.md` and `native/README.md` for detailed docs.

## Person B deliverables

- **Corpus:** 8 curated compliance guides (`assets/corpus/`)
- **Index:** SQLite + FTS5 + precomputed MiniLM embeddings (`assets/index/`)
- **Retrieval:** Hybrid BM25/keyword/embedding rerank, no runtime embedder
- **Eval set:** 200 graded items (`eval/items.json`)
- **Sacc:** 77.4 measured (target ≥ 70) — see `bench/reports/retrieval_eval.md`

Build index: `python -m biashara.scripts.build_index --corpus ../assets/corpus --out ../assets/index/compliance.sqlite --export-json ../src/data/corpus.generated.json`
