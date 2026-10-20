"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComfyHealth } from "@/lib/health";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { SocialConnections } from "@/components/SocialConnections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshComfyHealth } from "@/lib/useComfyHealth";

const TARGET_LABELS = { cloud: "Comfy Cloud", custom: "Custom endpoint" } as const;

type ComfyCreds = {
  configured: boolean;
  source: "settings" | "env" | null;
  maskedKey: string | null;
  baseUrl: string;
};

const API_KEYS_URL = "https://platform.comfy.org/profile/api-keys";

/** Comfy target status plus the BYOK key form. */
export function SettingsView() {
  const [health, setHealth] = useState<ComfyHealth | null>(null);
  const [creds, setCreds] = useState<ComfyCreds | null>(null);
  const [checking, setChecking] = useState(false);
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [h, c] = await Promise.all([
      fetch("/api/health").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/comfy/credentials")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    if (h) setHealth(h as ComfyHealth);
    if (c) setCreds(c as ComfyCreds);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      await load();
      refreshComfyHealth();
    } finally {
      setChecking(false);
    }
  }, [load]);

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/comfy/credentials", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: key,
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (ComfyCreds & { error?: string })
        | null;
      if (!res.ok || !data) {
        setFormError(data?.error ?? "Could not save the key");
        return;
      }
      setCreds(data);
      setKey("");
      setBaseUrl("");
      refreshComfyHealth();
      void load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/comfy/credentials", { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json()) as ComfyCreds;
        setCreds(data);
        refreshComfyHealth();
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Comfy Cloud</h1>
        <button
          type="button"
          onClick={() => void recheck()}
          className="inline-flex h-11 items-center rounded-full border border-line bg-s2 px-3.5 hover:border-[#3a3a3a] hover:bg-s3"
        >
          {checking ? "Checking..." : "Check again"}
        </button>
      </div>

      <div className="grid gap-3 rounded-[14px] border border-line bg-s2 p-3.5">
        <div className="flex items-center justify-between gap-2 font-semibold">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${
                health?.status === "ok" ? "bg-ok" : "bg-t3"
              }`}
            />
            {health ? TARGET_LABELS[health.target] : "Comfy Cloud"}
          </span>
          <span className="font-mono text-xs font-normal text-t2">
            {health?.status ?? "checking"}
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Host</dt>
          <dd className="text-t2">{health?.host ?? "-"}</dd>
          <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Latency</dt>
          <dd className="text-t2">
            {health?.latencyMs != null ? `${health.latencyMs} ms` : "-"}
          </dd>
          <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Key</dt>
          <dd className="text-t2">
            {creds?.source === "settings"
              ? `Key from Settings ${creds.maskedKey ?? ""}`
              : creds?.source === "env"
                ? `Key from .env.local ${creds.maskedKey ?? ""}`
                : "Not set"}
          </dd>
        </dl>
        {health?.message && (
          <p className="font-mono text-xs text-ac">{health.message}</p>
        )}

        <div className="grid gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Comfy API key"
            autoComplete="off"
            aria-label="Comfy API key"
          />
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="flex items-center gap-1 text-caption text-t3 hover:text-t2"
            aria-expanded={advanced}
          >
            <Icon
              d={SECTION_ICONS.chevronDown}
              className={`h-3 w-3 transition-transform ${advanced ? "rotate-180" : ""}`}
            />
            Advanced
          </button>
          {advanced && (
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Custom endpoint (https, or http://localhost)"
              autoComplete="off"
              aria-label="Custom Comfy endpoint"
            />
          )}
          {formError && (
            <p className="font-mono text-xs text-destructive">{formError}</p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={() => void save()} loading={saving} disabled={key.trim().length < 8}>
              Save and test
            </Button>
            {creds?.source === "settings" && (
              <Button variant="ghost" size="sm" onClick={() => void remove()} loading={removing}>
                Remove
              </Button>
            )}
            <a
              href={API_KEYS_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-caption text-t3 underline-offset-4 hover:text-t1 hover:underline"
            >
              Get an API key ↗
            </a>
          </div>
          <p className="text-caption text-t3">
            Or set COMFY_API_KEY and COMFY_BASE_URL in studio/.env.local.
          </p>
        </div>
      </div>

      <SocialConnections />
    </div>
  );
}
