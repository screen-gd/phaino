/** Keep the illustrative comparison separate from the hero's real workflow markup. */
export function initBringToLight(section: HTMLElement) {
  const modes = section.querySelectorAll<HTMLInputElement>('input[name="light-studio"]');
  const graph = section.querySelector<HTMLElement>('[data-light-graph]');
  const closed = section.querySelector<HTMLElement>('[data-light-closed]');
  const caption = section.querySelector<HTMLElement>('[data-light-caption]');
  const readout = section.querySelector<HTMLElement>('[data-light-readout]');
  const note = section.querySelector<HTMLElement>('[data-light-note]');
  const actions = section.querySelector<HTMLElement>('[data-light-actions]');
  const angle = section.querySelector<HTMLInputElement>('[data-light-angle]');
  const angleValue = section.querySelector<HTMLOutputElement>('[data-light-angle-value]');
  const status = section.querySelector<HTMLElement>('[data-light-status]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let hasDrawn = false;
  let animations: Animation[] = [];

  const motionAllowed = () => !reduced.matches && !document.documentElement.hasAttribute('data-motion-paused');
  const finishDraw = () => {
    animations.forEach((animation) => animation.finish());
    animations = [];
  };

  function setMode(mode: 'closed' | 'phaino') {
    finishDraw();
    const open = mode === 'phaino';
    section.dataset.state = mode;
    section.classList.remove('is-generated');
    modes.forEach((radio) => { radio.checked = radio.value === mode; });
    if (graph) graph.hidden = !open;
    if (closed) closed.hidden = open;
    if (caption) caption.hidden = open;
    if (readout) readout.hidden = !open;
    if (note) note.hidden = !open;
    if (actions) actions.hidden = !open;
    if (status) status.textContent = open ? 'Phaino: the workflow is open. Adjust the orbit angle to preview the shot.' : 'Closed studio: the workflow is hidden.';
    if (!open || hasDrawn) return;
    hasDrawn = true;
    if (!motionAllowed()) return;

    // Five nodes and their four edges resolve in 900ms, once per page visit.
    section.querySelectorAll<HTMLElement>('[data-light-node]').forEach((node, index) => {
      animations.push(node.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 150, delay: 150 + index * 150, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
      ));
    });
    section.querySelectorAll<SVGPathElement>('[data-light-edge]').forEach((edge, index) => {
      animations.push(edge.animate(
        [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
        { duration: 140, delay: 250 + index * 150, easing: 'ease-out', fill: 'backwards' },
      ));
    });
  }

  modes.forEach((radio) => radio.addEventListener('change', () => {
    if (radio.checked && (radio.value === 'closed' || radio.value === 'phaino')) setMode(radio.value);
  }));

  angle?.addEventListener('input', () => {
    const value = angle.valueAsNumber;
    if (!Number.isFinite(value)) return;
    if (angleValue) angleValue.value = `${value}°`;
    if (readout) readout.textContent = `orbit · ${value}° · 5s · LTX 2.5`;
    section.style.setProperty('--orbit-rotation', `${(value - 90) / 45}deg`);
    section.style.setProperty('--orbit-pan', `${(value - 90) / 30}%`);
  });

  section.querySelector<HTMLButtonElement>('[data-light-generate]')?.addEventListener('click', () => {
    section.classList.add('is-generated');
    if (status) status.textContent = 'Example Orbit result. Switch to Phaino to see the recipe. No render was run or credits charged.';
  });
  reduced.addEventListener('change', () => { if (!motionAllowed()) finishDraw(); });
  new MutationObserver(() => { if (!motionAllowed()) finishDraw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion-paused'] });
}
