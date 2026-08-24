/**
 * Client for the local biashara retrieval service (Person B).
 *
 * Runs on http://127.0.0.1:8766 by default. Works independently of the
 * LLM inference service on :8765.
 */

export const DEFAULT_RETRIEVAL_URL = 'http://127.0.0.1:8766';

export type RetrievalHealth = {
  ok: true;
  version: string;
  indexPath: string;
  docCount: number;
  chunkCount: number;
  embedModel: string;
} | {
  ok: false;
  error: string;
};

export type RetrievedChunk = {
  chunkId: string;
  docId: string;
  docTitle: string;
  category: string;
  docType: string;
  snapshot: string;
  heading: string;
  text: string;
  keywords: string[];
  bullets: string[];
  followUps: string[];
  score: number;
};

export type RetrieveResponse = {
  matches: RetrievedChunk[];
  confident: boolean;
};

export async function checkRetrievalHealth(
  baseUrl: string = DEFAULT_RETRIEVAL_URL
): Promise<RetrievalHealth> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.json();
    return {
      ok: true,
      version: body.version,
      indexPath: body.index_path,
      docCount: body.doc_count,
      chunkCount: body.chunk_count,
      embedModel: body.embed_model,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retrieveRemote(
  question: string,
  options: { limit?: number; baseUrl?: string; signal?: AbortSignal } = {}
): Promise<RetrieveResponse | null> {
  const baseUrl = options.baseUrl ?? DEFAULT_RETRIEVAL_URL;
  try {
    const res = await fetch(`${baseUrl}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, limit: options.limit ?? 3 }),
      signal: options.signal ?? AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return {
      confident: Boolean(body.confident),
      matches: (body.matches ?? []).map((m: Record<string, unknown>) => ({
        chunkId: String(m.chunk_id),
        docId: String(m.doc_id),
        docTitle: String(m.doc_title),
        category: String(m.category),
        docType: String(m.doc_type),
        snapshot: String(m.snapshot),
        heading: String(m.heading),
        text: String(m.text),
        keywords: m.keywords as string[],
        bullets: m.bullets as string[],
        followUps: m.follow_ups as string[],
        score: Number(m.score),
      })),
    };
  } catch {
    return null;
  }
}
