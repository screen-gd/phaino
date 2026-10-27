export function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-line bg-black p-4 font-mono text-xs leading-relaxed text-t2 sm:text-sm"><code>{children}</code></pre>;
}
