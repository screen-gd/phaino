import Link from "next/link";

export type ForkRow = {
  href: string;
  from: string;
  to: string;
  changed: number;
  author?: string;
  example?: boolean;
};

/** Section 4: forked presets as mono rows separated by 1px rules. */
export function ForkList({ rows }: { rows: ForkRow[] }) {
  return (
    <ul>
      {rows.map((r) => (
        <li key={`${r.href}:${r.to}`}>
          <Link
            href={r.href}
            className="flex items-baseline gap-3 border-t border-line py-3 font-mono text-body hover:text-t1"
          >
            <span className="min-w-0 truncate text-t2">
              {r.from} → {r.to}
              <span className="text-t3">
                {" "}
                · {r.changed} param{r.changed === 1 ? "" : "s"} changed
              </span>
              {r.author && <span className="text-t3"> · by @{r.author}</span>}
            </span>
            {r.example && (
              <span className="flex-none rounded border border-line px-1.5 py-px text-caption font-medium uppercase text-t3">
                Example
              </span>
            )}
          </Link>
        </li>
      ))}
      <li aria-hidden="true" className="border-t border-line" />
    </ul>
  );
}
