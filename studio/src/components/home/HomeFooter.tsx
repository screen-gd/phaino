/** Section 7: the minimal footer under a top rule. */
export function HomeFooter() {
  return (
    <footer className="flex flex-col gap-2 border-t border-line py-8 text-caption text-t3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <a
          href="https://github.com/screen-gd/phaino"
          target="_blank"
          rel="noreferrer"
          className="hover:text-t1"
        >
          GitHub
        </a>
        <a
          href="https://github.com/screen-gd/phaino/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
          className="hover:text-t1"
        >
          MIT license
        </a>
        <span>Built on ComfyUI</span>
      </div>
      <a
        href="https://x.com/Screeendev"
        target="_blank"
        rel="noreferrer"
        className="font-mono hover:text-t1"
      >
        @Screeendev
      </a>
    </footer>
  );
}
