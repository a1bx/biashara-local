import { useEffect, useState } from 'react';
import { checkRetrievalHealth, type RetrievalHealth } from '../services/retrieval';

export function useRetrievalHealth(pollMs = 5000): RetrievalHealth | null {
  const [health, setHealth] = useState<RetrievalHealth | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const h = await checkRetrievalHealth();
      if (!cancelled) setHealth(h);
    };

    void poll();
    const id = window.setInterval(() => void poll(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return health;
}
