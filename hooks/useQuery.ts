import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { friendlyError } from "../lib/errors";
import { useDataStore } from "../store/dataStore";

export interface QueryState<T> {
  data: T | undefined;
  /** True only for the first load (nothing to show yet). */
  loading: boolean;
  /** True while re-loading data that is already on screen. */
  refreshing: boolean;
  error: string | null;
  reload: () => void;
}

interface Result<T> {
  key: string;
  token: string;
  data: T | undefined;
  error: string | null;
}

/**
 * Small data loader: runs `fetcher` when `key` changes or when the shared
 * data version changes (after any save/edit/delete), and exposes
 * loading / error / reload for the loading-empty-error UI.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>, enabled = true): QueryState<T> {
  const version = useDataStore((s) => s.version);
  const [manual, setManual] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  // Each (key, data version, manual reload) combination is one request.
  const token = `${key}|${version}|${manual}`;
  const runFetcher = useEffectEvent(() => fetcher());

  useEffect(() => {
    if (!enabled) return;
    let alive = true; // ignore answers that arrive after a newer request started
    runFetcher()
      .then((data) => {
        if (alive) setResult({ key, token, data, error: null });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setResult((prev) => ({
          key,
          token,
          // Keep showing the old data for the same screen/filters if a refresh fails.
          data: prev?.key === key ? prev.data : undefined,
          error: friendlyError(err),
        }));
      });
    return () => {
      alive = false;
    };
  }, [key, token, enabled]);

  const reload = useCallback(() => setManual((n) => n + 1), []);

  const sameKey = result?.key === key;
  const data = sameKey ? result.data : undefined;
  const pending = enabled && result?.token !== token;
  const error = sameKey && !pending ? result.error : null;

  return {
    data,
    loading: pending && data === undefined,
    refreshing: pending && data !== undefined,
    error,
    reload,
  };
}
