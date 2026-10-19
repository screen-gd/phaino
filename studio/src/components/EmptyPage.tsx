export function EmptyPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-panel border border-line bg-s1 p-8 text-center">
        <h1 className="mb-2 text-base font-semibold">{title}</h1>
        <p className="text-t3">{body}</p>
      </div>
    </div>
  );
}
