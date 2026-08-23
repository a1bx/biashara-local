/**
 * Client for the local biashara-native FastAPI service.
 *
 * The backend is expected on http://127.0.0.1:8765 by default. It streams
 * NDJSON lines: {"type":"token","text":"..."} per token, followed by a
 * single {"type":"done", ...} marker, or a {"type":"error", ...} marker
 * on failure.
 *
 * Nothing in this module talks to the internet. The base URL is
 * always a loopback address.
 */

export const DEFAULT_BASE_URL = 'http://127.0.0.1:8765';

export type HealthOk = {
  ok: true;
  version: string;
  modelPath: string;
  ctx: number;
  kvType: string;
  nThreads: number;
};
export type HealthErr = {ok: false;error: string;};
export type Health = HealthOk | HealthErr;

export type TokenEvent = {type: 'token';text: string;};
export type DoneEvent = {type: 'done';tokensGenerated: number;durationS: number;};
export type ErrorEvent = {type: 'error';message: string;};
export type StreamEvent = TokenEvent | DoneEvent | ErrorEvent;

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  signal?: AbortSignal;
  baseUrl?: string;
}

export async function checkHealth(baseUrl: string = DEFAULT_BASE_URL): Promise<Health> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      // Short timeout so the UI doesn't hang when the backend is not up.
      signal: AbortSignal.timeout(1500)
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.json();
    return {
      ok: true,
      version: body.version,
      modelPath: body.model_path,
      ctx: body.ctx,
      kvType: body.kv_type,
      nThreads: body.n_threads
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Stream tokens for a prompt. Yields events until either a `done` or `error`
 * event, or the caller aborts.
 *
 *   for await (const evt of generateStream(prompt)) {
 *     if (evt.type === 'token') appendToUi(evt.text);
 *   }
 */
export async function* generateStream(
prompt: string,
options: GenerateOptions = {})
: AsyncIterable<StreamEvent> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const body = {
    prompt,
    max_tokens: options.maxTokens ?? 256,
    temperature: options.temperature ?? 0.3,
    top_p: options.topP ?? 0.9,
    stop: options.stop ?? undefined
  };

  const res = await fetch(`${baseUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', message: `HTTP ${res.status}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue; // ignore malformed lines rather than aborting the stream
        }
        yield normalize(parsed);
      }
    }

    // Handle any trailing line that lacked a newline (server closed cleanly).
    const tail = buf.trim();
    if (tail) {
      try {
        yield normalize(JSON.parse(tail));
      } catch {
        // swallow
      }
    }
  } finally {
    try {reader.releaseLock();} catch {}
  }
}

function normalize(raw: unknown): StreamEvent {
  if (!raw || typeof raw !== 'object') {
    return { type: 'error', message: 'malformed event' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.type === 'token' && typeof obj.text === 'string') {
    return { type: 'token', text: obj.text };
  }
  if (obj.type === 'done') {
    return {
      type: 'done',
      tokensGenerated: Number(obj.tokens_generated ?? 0),
      durationS: Number(obj.duration_s ?? 0)
    };
  }
  if (obj.type === 'error') {
    return { type: 'error', message: String(obj.message ?? 'unknown') };
  }
  return { type: 'error', message: 'unknown event type' };
}

/** Convenience: collect a stream into a single string plus final metadata. */
export async function generateAll(
prompt: string,
options: GenerateOptions = {})
: Promise<{text: string;tokens: number;durationS: number;}> {
  let text = '';
  let tokens = 0;
  let durationS = 0;
  for await (const evt of generateStream(prompt, options)) {
    if (evt.type === 'token') text += evt.text;
    if (evt.type === 'done') {tokens = evt.tokensGenerated;durationS = evt.durationS;}
    if (evt.type === 'error') throw new Error(evt.message);
  }
  return { text, tokens, durationS };
}
