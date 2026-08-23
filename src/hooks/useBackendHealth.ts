import { useEffect, useState } from 'react';
import { checkHealth } from '../services/inference';
import type { Health } from '../services/inference';

/**
 * Poll the local inference backend for liveness. Returns the last health
 * result along with a "loading" flag for the very first check. Polls at
 * `intervalMs` and cheaply aborts if the component unmounts.
 */
export function useBackendHealth(intervalMs = 5000): {health: Health | null;loading: boolean;} {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      const h = await checkHealth();
      if (!alive) return;
      setHealth(h);
      setLoading(false);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return { health, loading };
}
