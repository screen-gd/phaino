import { Icon, SECTION_ICONS } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { FEATURES } from "@/lib/features";

export default function RoadmapPage() {
  const items = FEATURES.filter((feature) => feature.status === "soon");
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-h3 font-extrabold uppercase text-ac font-stretch-[112.5%]">
        Roadmap
      </h1>
      {items.length === 0 && <p className="mt-6 text-sm text-t3">Nothing planned yet.</p>}
      <ul className="mt-6 grid max-w-2xl gap-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-s1 p-3"
          >
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-s2 text-t2">
              <Icon d={SECTION_ICONS[f.icon]} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-body font-semibold text-t1">
                {f.label}
                <StatusBadge status={f.status} />
              </span>
              <span className="block truncate text-caption text-t3">
                {f.description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
