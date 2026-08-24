# Biashara Local

Offline business assistant for Kenyan SMEs.

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
