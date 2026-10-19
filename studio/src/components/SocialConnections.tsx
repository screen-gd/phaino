"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProviderField = {
  key: string;
  label: string;
  secret?: boolean;
  optional?: boolean;
  placeholder?: string;
  default?: string;
  choices?: string[];
};

type ProviderMeta = {
  id: string;
  label: string;
  kind: "managed" | "direct";
  platforms: string[];
  fields: ProviderField[];
  docsUrl: string;
  note?: string;
};

type MaskedConnection = {
  id: string;
  provider: string;
  providerLabel: string;
  label: string;
  createdAt: string;
  fields: { key: string; label: string; secret: boolean; value: string }[];
};

type AccountsData = {
  configured: boolean;
  accounts: {
    id: string;
    connectionId: string;
    provider: string;
    providerLabel: string;
    platform: string;
    name: string;
  }[];
  errors: { connectionId: string; label: string; message: string }[];
};

/** Add-connection dialog: provider picker plus the registry's field form. */
function AddConnectionDialog({
  providers,
  onSaved,
}: {
  providers: ProviderMeta[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = providers.find((p) => p.id === providerId);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setProviderId("");
    setLabel("");
    setValues({});
    setError(null);
  }

  function selectProvider(id: string) {
    setProviderId(id);
    const p = providers.find((x) => x.id === id);
    const defaults: Record<string, string> = {};
    for (const f of p?.fields ?? []) {
      if (f.default !== undefined) defaults[f.key] = f.default;
    }
    setValues(defaults);
  }

  async function save() {
    if (!provider) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/social/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.id,
          label: label.trim() || provider.label,
          credentials: values,
        }),
      });
      if (!r.ok) {
        const body = (await r.json()) as { error?: string };
        setError(body.error ?? "Connection failed");
        return;
      }
      setOpen(false);
      onSaved();
    } catch {
      setError("Connection request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Add connection
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Add connection</DialogTitle>
          <DialogDescription>
            Connect a managed service or a platform account.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="conn-provider">Provider</Label>
            <Select value={providerId} onValueChange={(v) => selectProvider(String(v))}>
              <SelectTrigger id="conn-provider">
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectPopup>
                <SelectGroup>
                  <SelectGroupLabel>Managed services</SelectGroupLabel>
                  {providers
                    .filter((p) => p.kind === "managed")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectGroupLabel>Direct</SelectGroupLabel>
                  {providers
                    .filter((p) => p.kind === "direct")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectPopup>
            </Select>
            {provider?.note && (
              <p className="text-caption text-t3">{provider.note}</p>
            )}
          </div>

          {provider && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="conn-label">Label</Label>
                <Input
                  id="conn-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={provider.label}
                  maxLength={80}
                />
              </div>
              {provider.fields.map((f) =>
                f.choices ? (
                  <div key={f.key} className="grid gap-1.5">
                    <Label htmlFor={`conn-${f.key}`}>{f.label}</Label>
                    <Select
                      value={values[f.key] ?? f.default ?? ""}
                      onValueChange={(v) =>
                        setValues((prev) => ({ ...prev, [f.key]: String(v) }))
                      }
                    >
                      <SelectTrigger id={`conn-${f.key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {f.choices.map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {choice}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                ) : (
                  <div key={f.key} className="grid gap-1.5">
                    <Label htmlFor={`conn-${f.key}`}>
                      {f.label}
                      {f.optional && <span className="text-t3"> (optional)</span>}
                    </Label>
                    <Input
                      id={`conn-${f.key}`}
                      type={f.secret ? "password" : "text"}
                      value={values[f.key] ?? f.default ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      placeholder={f.placeholder}
                      autoComplete="off"
                    />
                  </div>
                ),
              )}
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-body font-semibold text-ac"
              >
                How to get these
              </a>
            </>
          )}

          {error && <p className="text-caption text-ac">{error}</p>}
        </DialogPanel>
        <DialogFooter>
          <Button
            onClick={() => void save()}
            loading={saving}
            disabled={!provider}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** Settings "Social accounts" section: stored connections, channel list, errors. */
export function SocialConnections() {
  const [connections, setConnections] = useState<MaskedConnection[] | null>(null);
  const [accounts, setAccounts] = useState<AccountsData | null>(null);
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      fetch("/api/social/connections").then((r) =>
        r.ok ? (r.json() as Promise<{ connections: MaskedConnection[] }>) : null,
      ),
      fetch("/api/social/accounts").then((r) =>
        r.ok ? (r.json() as Promise<AccountsData>) : null,
      ),
    ]);
    return { connections: c?.connections ?? null, accounts: a };
  }, []);

  const refresh = useCallback(async () => {
    const d = await load();
    setConnections(d.connections);
    setAccounts(d.accounts);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void load().then((d) => {
      if (cancelled) return;
      setConnections(d.connections);
      setAccounts(d.accounts);
    });
    fetch("/api/social/providers")
      .then((r) => (r.ok ? (r.json() as Promise<{ providers: ProviderMeta[] }>) : null))
      .then((d) => {
        if (d && !cancelled) setProviders(d.providers);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm("Remove this connection?")) return;
    setRemoving(id);
    try {
      await fetch(`/api/social/connections/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setRemoving(null);
    }
  }

  const errorFor = (id: string) =>
    accounts?.errors.find((e) => e.connectionId === id);

  return (
    <div id="social" className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Social accounts</h2>
        <AddConnectionDialog providers={providers} onSaved={() => void refresh()} />
      </div>

      <div className="grid gap-2 rounded-[14px] border border-line bg-s2 p-3.5">
        {connections === null && (
          <p className="text-caption text-t3">Loading connections…</p>
        )}
        {connections?.length === 0 && (
          <p className="text-caption text-t3">
            No connections yet. Add one to share generated shots.
          </p>
        )}
        {connections?.map((conn) => {
          const channels =
            accounts?.accounts.filter((a) => a.connectionId === conn.id) ?? [];
          const error = errorFor(conn.id);
          return (
            <div
              key={conn.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-line bg-s1 px-3 py-2.5"
            >
              <div className="grid min-w-0 gap-1">
                <span className="flex items-center gap-2 font-semibold">
                  {conn.label}
                  <span className="font-normal text-caption text-t3">
                    {conn.providerLabel}
                  </span>
                </span>
                {(channels.length > 0 || error) && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {channels.map((a) => (
                      <Badge key={a.id} variant="secondary" size="sm">
                        {a.platform}
                      </Badge>
                    ))}
                    {error && (
                      <Badge variant="destructive" size="sm">
                        {error.message}
                      </Badge>
                    )}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="xs"
                loading={removing === conn.id}
                onClick={() => void remove(conn.id)}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
