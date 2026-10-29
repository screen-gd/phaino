"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocialAccounts } from "./studio/useSocialAccounts";

type Status = { configured: boolean; maskedKey: string | null };

const ZERNIO_URL = "https://zernio.com";

/** Bring-your-own Zernio key for posting outputs to connected accounts. */
export function ZernioSettings({ onSaved }: { onSaved?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const accounts = useSocialAccounts(status?.configured === true);

  const load = useCallback(async () => {
    const res = await fetch("/api/social/credentials").catch(() => null);
    if (res?.ok) setStatus((await res.json()) as Status);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/social/credentials", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = (await res.json().catch(() => null)) as (Status & { error?: string }) | null;
      if (!res.ok || !data) {
        setFormError(data?.error ?? "Could not save the key");
        return;
      }
      setStatus(data);
      setKey("");
      accounts.reload();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/social/credentials", { method: "DELETE" });
      if (res.ok) setStatus((await res.json()) as Status);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section aria-labelledby="zernio-title" className="mt-6">
      <h2 id="zernio-title" className="mb-3 text-lead font-semibold">
        Social posting
      </h2>
      <div className="grid gap-3 rounded-panel border border-line bg-s1 p-3.5">
        <div className="flex items-center justify-between gap-2 font-semibold">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${status?.configured ? "bg-ok" : "bg-t3"}`}
            />
            Zernio
          </span>
          <span className="font-mono text-caption font-normal text-t2">
            {status?.configured ? `Key ${status.maskedKey ?? ""}` : "Not set"}
          </span>
        </div>
        {status?.configured && (
          <div className="text-caption text-t2">
            {accounts.error ? (
              <span className="text-destructive">{accounts.error}</span>
            ) : accounts.loading ? (
              "Loading accounts..."
            ) : accounts.items.length === 0 ? (
              "No connected accounts. Connect platforms in Zernio."
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {accounts.items.map((a) => (
                  <li key={a.id} className="rounded-md border border-line px-2 py-0.5">
                    <span className="capitalize">{a.platform}</span>
                    <span className="text-t3"> · {a.handle ?? a.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Zernio API key"
            autoComplete="off"
            aria-label="Zernio API key"
          />
          {formError && <p className="font-mono text-caption text-destructive">{formError}</p>}
          <div className="flex items-center gap-2">
            <Button onClick={() => void save()} loading={saving} disabled={key.trim().length < 8}>
              Save and test
            </Button>
            {status?.configured && (
              <Button variant="ghost" size="sm" onClick={() => void remove()} loading={removing}>
                Remove
              </Button>
            )}
            <a
              href={ZERNIO_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-caption text-t3 underline-offset-4 hover:text-t1 hover:underline"
            >
              Get a Zernio key ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
