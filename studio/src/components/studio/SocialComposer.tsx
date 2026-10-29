"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSocialAccounts } from "./useSocialAccounts";

type Result = {
  accountId: string;
  platform: string;
  state: string;
  url?: string;
  message?: string;
};

const STATE_LABEL: Record<string, string> = {
  published: "Posted",
  scheduled: "Scheduled",
  accepted: "Accepted",
  processing: "Processing",
  failed: "Failed",
  cancelled: "Cancelled",
  "not-submitted": "Not sent",
  unknown: "Unconfirmed",
};

/** Caption, account chips and post button for one output; shared by the popover and /social. */
export function SocialComposer({
  path,
  accounts,
  notConfigured,
}: {
  path: string | null;
  accounts: ReturnType<typeof useSocialAccounts>;
  /** Rendered when no Zernio key is saved; defaults to a Settings link. */
  notConfigured?: ReactNode;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const post = async () => {
    if (!path) return;
    setPosting(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, text, accountIds: [...picked] }),
      });
      const data = (await res.json().catch(() => null)) as
        | { results?: Result[]; error?: string }
        | null;
      if (!res.ok || !data?.results) {
        setError(data?.error ?? "Posting failed");
        return;
      }
      setResults(data.results);
    } catch {
      setError("Posting failed");
    } finally {
      setPosting(false);
    }
  };

  const name = (id: string) => {
    const a = accounts.items.find((x) => x.id === id);
    return a ? `${a.platform} · ${a.handle ?? a.name}` : id;
  };

  if (accounts.configured === false) {
    return (
      notConfigured ?? (
        <p className="text-body text-t2">
          Add a Zernio API key in{" "}
          <Link href="/settings" className="text-ac underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          to post to your connected accounts.
        </p>
      )
    );
  }
  if (accounts.error) {
    return <p role="alert" className="text-caption text-destructive">{accounts.error}</p>;
  }
  if (accounts.loading && accounts.items.length === 0) {
    return <p className="text-caption text-t3">Loading accounts...</p>;
  }
  if (accounts.items.length === 0) {
    return (
      <p className="text-caption text-t3">
        No connected accounts.{" "}
        <a href="https://zernio.com" target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-t1 hover:underline">
          Connect platforms in Zernio.
        </a>
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Caption"
        aria-label="Caption"
        className="w-full resize-none rounded-lg border border-line bg-s1 p-2 text-body text-t1 outline-none placeholder:text-t3 focus-visible:border-ac/70"
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Accounts">
        {accounts.items.map((a) => {
          const on = picked.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              disabled={a.status !== "connected"}
              onClick={() => toggle(a.id)}
              className={`rounded-md border px-2 py-1 text-caption disabled:opacity-40 ${
                on ? "border-ac bg-acs text-t1" : "border-line text-t2 hover:text-t1"
              }`}
            >
              <span className="capitalize">{a.platform}</span>
              <span className="text-t3"> · {a.handle ?? a.name}</span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-caption text-destructive">{error}</p>}
      {results && (
        <ul className="grid gap-1 text-caption" aria-live="polite">
          {results.map((r) => (
            <li key={`${r.platform}:${r.accountId}`} className="grid gap-0.5">
              <span className="flex justify-between gap-2">
                <span className="truncate capitalize text-t2">{name(r.accountId)}</span>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex-none text-ac hover:underline">
                    {STATE_LABEL[r.state] ?? r.state} ↗
                  </a>
                ) : (
                  <span
                    className={`flex-none ${r.state === "failed" || r.state === "not-submitted" ? "text-destructive" : "text-t1"}`}
                  >
                    {STATE_LABEL[r.state] ?? r.state}
                  </span>
                )}
              </span>
              {r.message && <span className="text-t3">{r.message}</span>}
            </li>
          ))}
        </ul>
      )}
      <Button
        onClick={() => void post()}
        loading={posting}
        disabled={picked.size === 0 || !path}
      >
        Post to {picked.size || ""} {picked.size === 1 ? "account" : "accounts"}
      </Button>
    </div>
  );
}
