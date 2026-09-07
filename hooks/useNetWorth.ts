'use client';

import { useState, useEffect } from 'react';
import { NetWorthPoint } from '@/types/database';

export function useNetWorth(accountKeys: string[]) {
  const [points, setPoints] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const joinedKeys = accountKeys.join('|');

  // Load on mount and re-fetch whenever the set of connected account ids
  // changes (add / remove / refresh all write snapshots on the server).
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch('/api/balance-history');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch balance history (${res.status})`);
        }
        const data = await res.json();
        if (isMounted && Array.isArray(data.points)) {
          setPoints(data.points);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Unknown error loading balance history';
          console.warn('Unable to load balance history:', msg);
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [joinedKeys]);

  return {
    points,
    loading,
    error,
  };
}