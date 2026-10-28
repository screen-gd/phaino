import Link from "next/link";
import { CodeBlock } from "@/app/developers/CodeBlock";

const tools = [
  ["list_presets", "List presets, model labels, input keys and parameter keys."],
  ["get_preset", "Read a preset's inputs, parameters and defaults."],
  ["get_workflow", "Read the ComfyUI or API workflow JSON."],
  ["run_preset", "Start a job and return its id and status."],
  ["get_job", "Read job status, progress and output download URLs."],
];

export default function McpPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-10 px-4 py-8 text-t1 sm:px-8">
      <header className="space-y-3">
        <h1 className="font-display text-h3 font-extrabold">MCP</h1>
        <p className="text-body text-t2">Drive Phaino from an MCP client: list presets, read workflows and run jobs.</p>
        <p className="font-mono text-sm break-all text-ac">http://127.0.0.1:3000/api/mcp</p>
        <p className="text-sm text-t3">Start your local Phaino install first. Runs use your configured Comfy account and credits. The hosted demo cannot run jobs or accept MCP POST requests.</p>
      </header>
      <section className="space-y-3" aria-labelledby="claude-code">
        <h2 id="claude-code" className="text-lead font-semibold">Claude Code</h2>
        <CodeBlock>{"claude mcp add --transport http phaino http://127.0.0.1:3000/api/mcp"}</CodeBlock>
      </section>
      <section className="space-y-3" aria-labelledby="client-config">
        <h2 id="client-config" className="text-lead font-semibold">Client configuration</h2>
        <p className="text-sm text-t2">Cursor and clients that use <code className="font-mono">mcpServers</code>:</p>
        <CodeBlock>{JSON.stringify({ mcpServers: { phaino: { url: "http://127.0.0.1:3000/api/mcp" } } }, null, 2)}</CodeBlock>
        <p className="text-sm text-t2">VS Code <code className="font-mono">.vscode/mcp.json</code>:</p>
        <CodeBlock>{JSON.stringify({ servers: { phaino: { type: "http", url: "http://127.0.0.1:3000/api/mcp" } } }, null, 2)}</CodeBlock>
      </section>
      <section className="space-y-3" aria-labelledby="tools">
        <h2 id="tools" className="text-lead font-semibold">Tools</h2>
        <dl className="divide-y divide-line border-y border-line">
          {tools.map(([name, description]) => <div key={name} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]"><dt className="font-mono text-sm text-ac">{name}</dt><dd className="text-sm text-t2">{description}</dd></div>)}
        </dl>
        <p className="text-sm text-t2">For image or video inputs, upload through the <Link href="/developers" className="text-ac hover:underline">HTTP API</Link>, then pass upload ids to <code className="font-mono">run_preset.inputs</code>.</p>
        <p className="text-sm text-t3">This endpoint has no authentication. Keep it local. Requests require a loopback host or your configured site origin.</p>
      </section>
    </article>
  );
}
