export type ModelRow = {
  label: string;
  task: string;
  license: "open" | "partner";
  template: string;
};

const TEMPLATE_URL = (t: string) =>
  `https://github.com/Comfy-Org/workflow_templates/blob/main/templates/${t}.json`;

/** Section 6: the open models, as a compact table rather than cards. */
export function ModelSheet({ rows }: { rows: ModelRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-line font-mono text-caption text-t3">
            <th className="py-2 pr-6 font-medium">Model</th>
            <th className="py-2 pr-6 font-medium">Task</th>
            <th className="py-2 pr-6 font-medium">Open weights</th>
            <th className="py-2 font-medium">Comfy template</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line">
              <td className="py-3 pr-6 text-body font-medium text-t1">
                {r.label}
              </td>
              <td className="py-3 pr-6 text-body text-t2">{r.task}</td>
              <td className="py-3 pr-6 font-mono text-body text-t2">
                {r.license === "open" ? "✓" : "Partner"}
              </td>
              <td className="py-3 font-mono text-caption">
                <a
                  href={TEMPLATE_URL(r.template)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-t2 underline underline-offset-2 hover:text-t1"
                >
                  {r.template}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
