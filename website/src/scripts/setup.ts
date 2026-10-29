/** Copy the displayed command lines, excluding the comment and visual $ prompts. */
export function initSetup() {
  const status = document.querySelector<HTMLElement>('#announcement');
  document.querySelectorAll<HTMLButtonElement>('[data-copy-setup]').forEach((button) => {
    const terminal = button.closest<HTMLElement>('.terminal');
    const label = button.querySelector('span');
    if (!terminal) return;

    button.addEventListener('click', async () => {
      const commands = Array.from(terminal.querySelectorAll<HTMLElement>('[data-setup-command]'), (line) => line.textContent ?? '').join('\n');
      try {
        await navigator.clipboard.writeText(commands);
        if (label) label.textContent = 'Copied';
        if (status) status.textContent = 'Setup commands copied.';
        setTimeout(() => { if (label) label.textContent = 'Copy'; }, 2200);
      } catch {
        if (label) label.textContent = 'Select to copy';
        if (status) status.textContent = 'Clipboard unavailable. Select and copy the commands in the terminal.';
      }
    });
  });
}
