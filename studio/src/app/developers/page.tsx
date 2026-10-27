import Link from "next/link";
import { CodeBlock } from "./CodeBlock";
import { reference } from "./reference";

export default function DevelopersPage() {
  return (
    <article className="mx-auto max-w-6xl space-y-10 px-4 py-8 text-t1 sm:px-8">
      <header className="space-y-3">
        <h1 className="font-display text-h3 font-extrabold">API</h1>
        <p className="max-w-3xl text-body text-t2">A local, single-user HTTP API served by your Phaino install. No authentication. Do not expose it publicly.</p>
        <p className="font-mono text-sm text-ac">http://127.0.0.1:3000</p>
        <p className="text-sm text-t3">The hosted demo is read-only. Use your local install to upload, run jobs or edit data. Comfy credentials stay on the server.</p>
        <Link href="/mcp" className="inline-block text-sm text-ac hover:underline">Connect an MCP client</Link>
      </header>
      <section className="space-y-5" aria-labelledby="quickstart">
        <h2 id="quickstart" className="text-lead font-semibold">Quickstart</h2>
        <p className="text-sm text-t2">Connect your Comfy account in Settings first. Replace the placeholders with values from each response.</p>
        <div className="space-y-2">
          <h3 className="text-body font-medium">1. Upload a still</h3>
          <CodeBlock>{'curl -sS -F "file=@still.png" http://127.0.0.1:3000/api/uploads'}</CodeBlock>
          <p className="text-sm text-t3">Copy <code className="font-mono">uploadId</code>, including its file extension.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-body font-medium">2. Run Orbit</h3>
          <CodeBlock>{`curl -sS -X POST http://127.0.0.1:3000/api/jobs -H 'Content-Type: application/json' -d '{"presetId":"orbit","params":{"prompt":"A stone sculpture in soft daylight"},"inputs":{"image":"<uploadId>"}}'`}</CodeBlock>
          <p className="text-sm text-t3">Copy <code className="font-mono">job.id</code>. Input keys and parameter options come from the preset.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-body font-medium">3. Poll or stream the job</h3>
          <CodeBlock>{`curl -sS "http://127.0.0.1:3000/api/jobs/<jobId>"
curl -N -H 'Accept: text/event-stream' "http://127.0.0.1:3000/api/jobs/<jobId>/events"`}</CodeBlock>
          <p className="text-sm text-t3">Poll until a terminal status. SSE sends the current job then updates. Stop the stream when you see a terminal status.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-body font-medium">4. Download an output</h3>
          <CodeBlock>{'curl -fL "http://127.0.0.1:3000/api/outputs/<path-from-job.outputs>" -o shot.mp4'}</CodeBlock>
        </div>
      </section>
      <section className="space-y-4" aria-labelledby="job-record">
        <h2 id="job-record" className="text-lead font-semibold">Job record</h2>
        <p className="text-sm text-t2">Statuses: <code className="font-mono">queued | running | succeeded | failed | cancelled</code>. The last three are terminal. Progress ranges from 0 to 1. Outputs are relative paths.</p>
        <CodeBlock>{`Job = {
  id, presetId, category, status, params, inputs,
  comfyJobId: string | null, progress: number,
  message: string | null, error: string | null, outputs: string[],
  createdAt, updatedAt, startedAt: string | null,
  finishedAt: string | null, creditsUsed: string | null
}`}</CodeBlock>
      </section>
      <section className="space-y-6" aria-labelledby="reference">
        <h2 id="reference" className="text-lead font-semibold">Endpoint reference</h2>
        <p className="text-sm text-t2">Bodies are JSON unless marked multipart. Errors generally include an <code className="font-mono">error</code> field. Read a preset for input requirements, parameter types, defaults and options.</p>
        {reference.map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-body font-semibold">{group.title}</h3>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-160 text-left text-sm">
                <caption className="sr-only">{group.title} endpoints</caption>
                <thead className="border-b border-line text-t3"><tr>
                  <th scope="col" className="p-3 font-medium">Endpoint</th>
                  <th scope="col" className="p-3 font-medium">Request</th>
                  <th scope="col" className="p-3 font-medium">Response</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {group.endpoints.map(([method, path, request, response]) => (
                    <tr key={`${method} ${path}`} className="align-top">
                      <th scope="row" className="p-3 font-mono font-normal"><span className="text-ac">{method}</span><br /><span className="break-all">{path}</span></th>
                      <td className="p-3 font-mono text-xs leading-relaxed break-words text-t2">{request}</td>
                      <td className="p-3 font-mono text-xs leading-relaxed break-words text-t2">{response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </section>
      <section className="space-y-3" aria-labelledby="sequence-shapes">
        <h2 id="sequence-shapes" className="text-lead font-semibold">Sequence shapes</h2>
        <p className="text-sm text-t2">Time values use project frames, except media duration in seconds. Read the current sequence before replacing a lane.</p>
        <CodeBlock>{`Sequence = {version: 2, fps, resolution, aspect, fit, handles,
  settingsTouched: boolean, media: Media[], clips: Clip[],
  audio: AudioClip[], titles: Title[]}
Media = {id, path, name, kind: "video"|"audio"|"image", srcFps,
  width, height, durationSec, hasAudio: boolean}
Clip = {id, mediaId, in, out, volume?: 0..2, muted?: boolean,
  fadeIn?: number, fadeOut?: number,
  transition?: {type: "cut"|"crossfade"|"dip", frames: number}}
AudioClip = {id, mediaId, start, in, out, volume?: 0..2,
  fadeIn?: number, fadeOut?: number}
Title = {id, text: string (1..200), start, duration,
  position: "top"|"center"|"lower", size: "s"|"m"|"l"}
layout = {clips: [{recordIn, recordOut, transition}], totalFrames}`}</CodeBlock>
        <p className="text-sm text-t3">Optional lane fields above describe write requests. Responses include their defaults. Health status is <code className="font-mono">ok | unauthorized | upstream_down | unreachable | not_configured | error</code>.</p>
      </section>
    </article>
  );
}
