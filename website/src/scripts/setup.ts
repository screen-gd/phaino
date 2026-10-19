/** Copy the displayed command lines, excluding the comment and visual $ prompts. */
export function initSetup() {
  const terminal = document.querySelector<HTMLElement>('#setup-terminal');
  const button = terminal?.querySelector<HTMLButtonElement>('[data-copy-setup]');
  if (!terminal || !button) return;
  const label = button.querySelector('span');
  const status = document.querySelector<HTMLElement>('#announcement');

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
}
