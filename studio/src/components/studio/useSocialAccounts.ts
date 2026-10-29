"use client";

import { useCallback, useEffect, useState } from "react";

export type SocialAccount = {
  id: string;
  platform: string;
  name: string;
  handle?: string;
  status: string;
};

/** Connected Zernio accounts; loads when enabled. */
export function useSocialAccounts(enabled: boolean) {
  const [items, setItems] = useState<SocialAccount[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch("/api/social/accounts")
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as
            | { configured?: boolean; accounts?: SocialAccount[]; error?: string }
            | null;
          if (!live) return;
          if (!res.ok || !data) {
            setError(data?.error ?? "Could not load accounts");
            return;
          }
          setConfigured(data.configured ?? false);
          setItems(data.accounts ?? []);
        })
        .catch(() => live && setError("Could not load accounts"))
        .finally(() => live && setLoading(false));
    }, 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [enabled, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { items, configured, loading, error, reload };
}
