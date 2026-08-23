import { useState } from 'react';
import { useBackendHealth } from '../../hooks/useBackendHealth';

/**
 * Small indicator in the top bar showing whether the local inference
 * backend (biashara.service) is reachable. Hover for details.
 */
export function ModelIndicator() {
  const { health, loading } = useBackendHealth();
  const [open, setOpen] = useState(false);

  const state: 'loading' | 'ok' | 'off' = loading ?
  'loading' :
  health?.ok ? 'ok' : 'off';

  const dotClass =
  state === 'ok' ?
  'bg-success' :
  state === 'loading' ?
  'bg-muted animate-pulse' :
  'bg-danger';

  const label =
  state === 'ok' ? 'Model ready' : state === 'loading' ? 'Checking model…' : 'Model offline';

  const sub =
  state === 'ok' && health?.ok ?
  `${health.modelPath}` :
  state === 'off' ?
  'Start native/ service' :
  '…';

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-describedby="model-note"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-raised">

        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="leading-tight">
          <span className="block text-xs font-medium text-ink">{label}</span>
          <span className="block text-2xs text-faint">{sub}</span>
        </span>
      </button>
      {open ?
      <div
        id="model-note"
        role="tooltip"
        className="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-line bg-panel p-3 text-2xs leading-relaxed text-muted shadow-xl">

          {state === 'ok' && health?.ok ?
        <>
              <p className="text-ink">On-device inference is running.</p>
              <ul className="mt-2 space-y-0.5">
                <li>model: <span className="text-ink">{health.modelPath}</span></li>
                <li>context: <span className="text-ink">{health.ctx}</span></li>
                <li>kv cache: <span className="text-ink">{health.kvType}</span></li>
                <li>threads: <span className="text-ink">{health.nThreads}</span></li>
              </ul>
            </> :
        null}
          {state === 'off' ?
        <>
              <p className="text-ink">On-device inference is not running.</p>
              <p className="mt-1">
                Start it from a terminal:
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-raised p-2 text-2xs text-ink">
                BIASHARA_MODEL_PATH=/absolute/path.gguf \{'\n'}
                {'  '}python -m biashara.service
              </pre>
              <p className="mt-2">
                While offline, the app falls back to keyword-only answers.
              </p>
            </> :
        null}
          {state === 'loading' ? <p>Checking backend on 127.0.0.1:8765…</p> : null}
        </div> :
      null}
    </div>);

}
