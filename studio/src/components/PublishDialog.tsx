"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
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
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Account = {
  id: string;
  connectionId: string;
  provider: string;
  providerLabel: string;
  platform: string;
  name: string;
};

type AccountsResponse = {
  configured: boolean;
  accounts: Account[];
  errors: { connectionId: string; label: string; message: string }[];
};

type TargetRow = {
  accountId: string;
  platform: string;
  name: string;
  state: string;
  url?: string;
  code?: string;
  message?: string;
  retryDisposition?: string;
};

type PublishSummary = { status: string; targets: TargetRow[] };

type Issue = { code?: string; message?: string; path?: string };

const PENDING = new Set(["scheduled", "accepted", "processing"]);
const VISIBILITIES = [
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
  { value: "public", label: "Public" },
] as const;

function stateVariant(state: string): "success" | "secondary" | "outline" | "destructive" {
  if (state === "published") return "success";
  if (PENDING.has(state)) return "secondary";
  if (state === "unknown") return "outline";
  return "destructive";
}

/**
 * Share one generated output to connected social channels: account picker,
 * caption and YouTube fields, then per-target outcomes with pending polling.
 */
export function PublishDialog({
  output,
  trigger,
}: {
  output: { path: string; kind: "image" | "video"; previewUrl: string };
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [text, setText] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytVisibility, setYtVisibility] = useState<"public" | "unlisted" | "private">(
    "unlisted",
  );
  const [publishing, setPublishing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [result, setResult] = useState<PublishSummary | null>(null);
  const polls = useRef(0);

  const youtubeSelected =
    data?.accounts.some((a) => selected.includes(a.id) && a.platform === "youtube") ??
    false;
  const hasPending = result?.targets.some((t) => PENDING.has(t.state)) ?? false;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setDraftId(crypto.randomUUID());
    setData(null);
    setLoadError(null);
    setSelected([]);
    setText("");
    setYtTitle("");
    setYtVisibility("unlisted");
    setIssues([]);
    setResult(null);
    polls.current = 0;
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/social/accounts")
      .then((r) => r.json() as Promise<AccountsResponse>)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load accounts");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !hasPending || !draftId) return;
    const timer = setInterval(() => {
      if (polls.current >= 30) {
        clearInterval(timer);
        return;
      }
      polls.current += 1;
      void fetch(`/api/social/posts/${draftId}`)
        .then((r) => (r.ok ? (r.json() as Promise<PublishSummary>) : null))
        .then((summary) => {
          if (summary) setResult(summary);
        })
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, [open, hasPending, draftId]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function publish() {
    setPublishing(true);
    setIssues([]);
    try {
      const r = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          output: output.path,
          text,
          accountIds: selected,
          youtube: youtubeSelected
            ? { title: ytTitle, visibility: ytVisibility }
            : undefined,
        }),
      });
      const body = (await r.json()) as PublishSummary & {
        error?: string;
        issues?: Issue[];
      };
      if (!r.ok) {
        setIssues(
          body.issues && body.issues.length > 0
            ? body.issues
            : [{ message: body.error ?? "Publish failed" }],
        );
        return;
      }
      setResult(body);
    } catch {
      setIssues([{ message: "Publish request failed" }]);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger ?? <Button size="xs">Share</Button>} />
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Share to social</DialogTitle>
          <DialogDescription>
            {output.kind === "video"
              ? "Post this video to your connected channels."
              : "Post this image to your connected channels."}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-4">
          {output.kind === "video" ? (
            <video
              src={output.previewUrl}
              muted
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-line object-cover"
            />
          ) : (
            <img
              src={output.previewUrl}
              alt=""
              className="aspect-video w-full rounded-lg border border-line object-cover"
            />
          )}

          {loadError && <p className="text-caption text-t3">{loadError}</p>}

          {data && !data.configured && (
            <div className="grid gap-2">
              <p className="text-body text-t3">
                No social connections yet.
              </p>
              <Link href="/settings#social" className="text-body font-semibold text-ac">
                Add a social connection
              </Link>
            </div>
          )}

          {data?.configured && !result && (
            <>
              {data.errors.length > 0 && (
                <p className="text-caption text-t3">
                  {data.errors.map((e) => `${e.label}: ${e.message}`).join(" · ")}
                </p>
              )}
              {data.accounts.length === 0 ? (
                <p className="text-body text-t3">
                  No channels available.
                </p>
              ) : (
                <div className="grid gap-0.5">
                  {data.accounts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-s2"
                    >
                      <Checkbox
                        checked={selected.includes(a.id)}
                        onCheckedChange={() => toggle(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${a.platform} ${a.name}`}
                      />
                      <span className="text-body capitalize">{a.platform}</span>
                      <span className="truncate text-caption text-t3">
                        {a.name} · {a.providerLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="publish-caption">Caption</Label>
                <Textarea
                  id="publish-caption"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a caption"
                  rows={3}
                  maxLength={5000}
                />
              </div>

              {youtubeSelected && (
                <div className="grid gap-3 rounded-xl border border-line bg-s1 p-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="publish-yt-title">YouTube title</Label>
                    <Input
                      id="publish-yt-title"
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      placeholder="Video title"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="publish-yt-visibility">Visibility</Label>
                    <Select
                      value={ytVisibility}
                      onValueChange={(v) =>
                        setYtVisibility(v as "public" | "unlisted" | "private")
                      }
                    >
                      <SelectTrigger id="publish-yt-visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {VISIBILITIES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}

          {issues.length > 0 && (
            <ul className="grid gap-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-caption text-ac">
                  {issue.message ?? issue.code ?? "Invalid request"}
                </li>
              ))}
            </ul>
          )}

          {result && (
            <ul className="grid gap-1.5">
              {result.targets.map((t) => (
                <li
                  key={t.accountId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-s2 px-2.5 py-2"
                >
                  <span className="min-w-0">
                    <b className="block truncate text-body font-semibold capitalize">
                      {t.platform} — {t.name}
                    </b>
                    {t.url ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-caption text-ac"
                      >
                        Open post
                      </a>
                    ) : (
                      (t.message || t.code) && (
                        <span className="block truncate text-caption text-t3">
                          {t.message ?? t.code}
                          {t.code && t.message ? ` (${t.code})` : ""}
                        </span>
                      )
                    )}
                  </span>
                  <Badge variant={stateVariant(t.state)}>{t.state}</Badge>
                </li>
              ))}
            </ul>
          )}
        </DialogPanel>
        {data?.configured && !result && (
          <DialogFooter>
            <Button
              onClick={() => void publish()}
              loading={publishing}
              disabled={
                selected.length === 0 ||
                (youtubeSelected && ytTitle.trim().length === 0)
              }
            >
              Publish
            </Button>
          </DialogFooter>
        )}
        {result && (
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}
