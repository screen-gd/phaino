import Link from "next/link";
import type { Metadata } from "next";
import { loadTracker, type TaskStatus } from "@/server/tracker";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracker - Phaino",
};

const FILTERS: { label: string; value?: TaskStatus }[] = [
  { label: "All" },
  { label: "Doing", value: "doing" },
  { label: "To do", value: "todo" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const STATUS_BADGE: Record<
  TaskStatus,
  { variant: "success" | "default" | "destructive" | "outline"; label: string }
> = {
  done: { variant: "success", label: "Done" },
  doing: { variant: "default", label: "Doing" },
  blocked: { variant: "destructive", label: "Blocked" },
  todo: { variant: "outline", label: "To do" },
};

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-s3"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-ac" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tracker = loadTracker();
  const filter = FILTERS.some((f) => f.value === status)
    ? (status as TaskStatus)
    : undefined;

  const all = tracker.milestones.flatMap((m) => m.tasks);
  const done = all.filter((t) => t.status === "done").length;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display font-extrabold uppercase text-h2 leading-none tracking-tight font-stretch-[112.5%]">
          Tracker
        </h1>
        <span className="text-caption text-t3">Updated {tracker.updated}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-body font-semibold text-t1">
          {done} of {all.length} done
        </span>
        <div className="flex-1">
          <Bar done={done} total={all.length} />
        </div>
      </div>

      <nav aria-label="Filter tasks" className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = f.value === filter || (!f.value && !filter);
          return (
            <Link
              key={f.label}
              href={f.value ? `/tracker?status=${f.value}` : "/tracker"}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-caption ${
                active
                  ? "border-ac text-ac"
                  : "border-line text-t3 hover:text-t1"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-6">
        {tracker.milestones.map((m) => {
          const tasks = filter
            ? m.tasks.filter((t) => t.status === filter)
            : m.tasks;
          if (filter && tasks.length === 0) return null;
          const mDone = m.tasks.filter((t) => t.status === "done").length;
          return (
            <section key={m.id}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display font-bold uppercase text-body text-t1">
                  {m.title}
                </h2>
                <span className="shrink-0 text-caption text-t3">
                  {mDone}/{m.tasks.length}
                </span>
              </div>
              {m.summary && (
                <p className="mt-1 text-caption text-t3">{m.summary}</p>
              )}
              <div className="mt-2">
                <Bar done={mDone} total={m.tasks.length} />
              </div>
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-s1">
                {tasks.map((t) => {
                  const s = STATUS_BADGE[t.status];
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                      <Badge variant={s.variant} size="sm">
                        {s.label}
                      </Badge>
                      <span className="min-w-0">
                        <span className="block truncate text-body text-t1">
                          {t.title}
                        </span>
                        {t.notes && (
                          <span className="block truncate text-caption text-t3">
                            {t.notes}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
