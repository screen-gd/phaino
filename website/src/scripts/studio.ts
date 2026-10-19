import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const motionButton = document.querySelector<HTMLButtonElement>('.motion-toggle');
const header = document.querySelector<HTMLElement>('.site-header');
const headerHeight = () => header?.offsetHeight ?? 52;
let userPaused = false;
let motionContext: gsap.Context | undefined;
let lenis: Lenis | undefined;
let ticker: ((time: number) => void) | undefined;
let marquee: gsap.core.Tween | undefined;
let typeTimers: ReturnType<typeof setInterval>[] = [];
const animatedVideos = new Set<HTMLVideoElement>();
const motionAllowed = () => !reducedMotion.matches && !userPaused;

function announce(message: string) {
  const status = document.getElementById('announcement');
  if (status) status.textContent = message;
}

/** Use a single GSAP ticker for Lenis and all scroll-linked choreography. */
function initMotion() {
  motionContext?.revert();
  if (ticker) gsap.ticker.remove(ticker);
  lenis?.destroy();
  lenis = undefined;
  typeTimers.forEach(clearInterval);
  typeTimers = [];
  document.querySelectorAll<HTMLElement>('[data-typed]').forEach((el) => { el.textContent = el.dataset.typed ?? ''; });
  document.querySelectorAll('[data-marquee-clone]').forEach((el) => el.remove());
  marquee = undefined;
  document.documentElement.toggleAttribute('data-motion-paused', !motionAllowed());
  if (motionButton) {
    motionButton.setAttribute('aria-pressed', String(!motionAllowed()));
    motionButton.setAttribute('aria-label', motionAllowed() ? 'Motion on. Pause animated motion' : 'Motion off. Resume animated motion');
    const label = motionButton.querySelector('[data-motion-label]');
    if (label) label.textContent = motionAllowed() ? 'Motion on' : 'Motion off';
  }
  animatedVideos.forEach((video) => { if (motionAllowed()) void video.play().catch(() => {}); else video.pause(); });
  if (!motionAllowed()) { traceMove(document.querySelector<HTMLButtonElement>('[data-trace][aria-checked="true"]')); ScrollTrigger.refresh(); return; }

  lenis = new Lenis({ duration: .6, easing: (progress) => 1 - (1 - progress) ** 3, smoothWheel: true, anchors: { offset: -headerHeight() - 24 }, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  ticker = (time) => { lenis?.raf(time * 1000); };
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);

  motionContext = gsap.context(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 801px)', () => {
      const frame = document.querySelector<HTMLElement>('.hero-frame');
      if (frame) {
        const underlay = document.querySelector<HTMLElement>('.hero-underlay');
        // One smoothing layer: Lenis drives the timeline directly. Equal initial
        // gutters expand from the center to all four edges beneath the header.
        const sequence = gsap.timeline({ scrollTrigger: { trigger: '.hero-sequence', start: () => `top top+=${headerHeight()}`, end: '+=130%', scrub: true, pin: '.hero-pin', anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (self) => { if (underlay) underlay.inert = self.progress < .72; } } });
        sequence.to(frame, { scaleX: () => (frame.parentElement?.clientWidth ?? frame.offsetWidth) / Number.parseFloat(getComputedStyle(frame).width), scaleY: () => (frame.parentElement?.clientHeight ?? frame.offsetHeight) / Number.parseFloat(getComputedStyle(frame).height), duration: .5, ease: 'none' }, 0)
          .to('.hero-corner', { scale: 0, duration: .45, ease: 'power2.inOut' }, 0)
          .to('.hero-copy', { scale: .92, opacity: 0, duration: .35, ease: 'power2.inOut' }, .15)
          .to('.hero-footage .media', { scale: 1.07, yPercent: 2, duration: .5, ease: 'power1.inOut' }, 0)
          .to('.hero-meta, .hero-bottom', { opacity: 0, duration: .2 }, .4)
          .to(frame, { xPercent: -30, duration: .3, ease: 'power2.inOut' }, .5)
          .to(frame, { xPercent: -110, duration: .35, ease: 'power2.inOut' }, .8)
          .from('.underlay-copy', { y: 35, opacity: 0, duration: .3 }, .8)
          .from('.hero-underlay .workflow-node', { scale: .96, opacity: .1, stagger: .055, duration: .18 }, .9)
          // Hold the exposed graph so the signature reveal has a readable resolution.
          .to({}, { duration: .65 }, 1.2);
      }
      setupHorizontalGallery();
    });
    mm.add('(max-width: 800px)', () => {
      gsap.to('.hero-footage .media', { scale: 1.05, ease: 'none', scrollTrigger: { trigger: '.hero-sequence', start: () => `top top+=${headerHeight()}`, end: 'bottom top', scrub: true } });
      const swipeLabel = document.querySelector('.swipe-note')?.firstChild;
      if (swipeLabel) swipeLabel.textContent = 'Swipe to explore ';
      return () => { if (swipeLabel) swipeLabel.textContent = 'Scroll to explore '; };
    });

    // Heading groups enter heading first, then their supporting copy; other blocks enter whole.
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
      const group = element.querySelector(':scope > h2') !== null;
      gsap.from(group ? element.children : element, { y: group ? 28 : 22, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
    });
    document.querySelectorAll('[data-media]').forEach((media) => {
      const corners = media.querySelectorAll('.media-corner');
      if (!corners.length) return;
      gsap.from(corners, { scale: 1.7, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: media, start: 'top 90%', once: true } });
    });
    document.querySelectorAll('.live-board').forEach((board) => {
      gsap.from(board.querySelectorAll('.workflow-node'), { y: 14, opacity: 0, stagger: .07, duration: .5, ease: 'power3.out', scrollTrigger: { trigger: board, start: 'top 75%', once: true } });
    });
    ScrollTrigger.create({ trigger: '.live-board', start: 'top 60%', once: true, onEnter: () => traceMove(document.querySelector<HTMLButtonElement>('[data-trace][aria-checked="true"]')) });
    // The fork branch draws itself as the steps scroll through the viewport.
    gsap.fromTo('.fork-branch', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.fork-steps', start: 'top 85%', end: 'top 40%', scrub: true } });
    gsap.to('.timeline-playhead', { x: () => (document.querySelector('.timeline-ruler')?.clientWidth ?? 800) * .62, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 85%', end: 'bottom 30%', scrub: true } });
    // The generated clip is dragged in from above and lands on V2 as the playhead reaches it.
    gsap.fromTo('.generated-clip', { y: -70, x: 48, opacity: .35 }, { y: 0, x: 0, opacity: 1, ease: 'power3.out', scrollTrigger: { trigger: '.timeline', start: 'top 85%', end: 'top 40%', scrub: true } });
    gsap.from('.footer-word, .footer-arrow', { yPercent: 70, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.footer-wordmark', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    document.querySelectorAll<HTMLElement>('[data-typed]').forEach((element) => {
      const title = element.dataset.typed ?? '';
      ScrollTrigger.create({ trigger: element, start: 'top 96%', once: true, onEnter: () => {
        let index = 0;
        const timer = setInterval(() => {
          index++;
          element.textContent = title.slice(0, index) + (index < title.length ? '▏' : '');
          if (index >= title.length) clearInterval(timer);
        }, 45);
        typeTimers.push(timer);
      } });
    });
    setupMarquee();
  });
  ScrollTrigger.refresh();
}

function setupHorizontalGallery() {
  const track = document.querySelector<HTMLElement>('.moves-track');
  const viewport = document.querySelector<HTMLElement>('.moves-viewport');
  if (!track || !viewport) return;
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth + parseFloat(getComputedStyle(viewport).paddingLeft));
  if (distance() < 50) return;
  gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: { id: 'moves-horizontal', trigger: '.moves-pin', pin: '.moves-pin', start: () => `top top+=${headerHeight()}`, end: () => `+=${distance()}`, scrub: .8, invalidateOnRefresh: true, onUpdate: (self) => {
    gsap.set('.gallery-progress span', { scaleX: .05 + self.progress * .95 });
  } } });
}

function setupMarquee() {
  const track = document.querySelector<HTMLElement>('.community-track');
  if (!track) return;
  const originals = Array.from(track.children);
  originals.forEach((original) => {
    const clone = original.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return;
    clone.dataset.marqueeClone = '';
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll<HTMLElement>('button, a').forEach((control) => { control.tabIndex = -1; });
    track.append(clone);
  });
  const distance = (track.scrollWidth - parseFloat(getComputedStyle(track).paddingLeft)) / 2;
  marquee = gsap.to(track, { x: -distance, duration: distance / 22, ease: 'none', repeat: -1, paused: true });
  ScrollTrigger.create({ trigger: '.community-gallery', start: 'top bottom', end: 'bottom top', onToggle: (self) => { if (self.isActive) marquee?.play(); else marquee?.pause(); } });
}

motionButton?.addEventListener('click', () => {
  userPaused = !userPaused;
  initMotion();
  announce(motionAllowed() ? 'Motion resumed.' : 'Motion paused.');
});
reducedMotion.addEventListener('change', initMotion);

// Poster-only slots do not issue video requests; supplied clips load near the viewport.
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!(target instanceof HTMLVideoElement)) return;
    if (isIntersecting) {
      if (!target.src && target.dataset.src) { target.src = target.dataset.src; target.load(); }
      animatedVideos.add(target);
      if (motionAllowed()) void target.play().catch(() => {});
    } else { target.pause(); animatedVideos.delete(target); }
  });
}, { rootMargin: '100px' });
document.querySelectorAll<HTMLVideoElement>('[data-live-video]').forEach((video) => videoObserver.observe(video));
document.querySelectorAll<HTMLVideoElement>('video[data-src]').forEach((video) => {
  videoObserver.observe(video);
  video.playbackRate = .6;
  video.closest('.move-preview')?.addEventListener('pointerenter', () => { video.playbackRate = 1; });
  video.closest('.move-preview')?.addEventListener('pointerleave', () => { video.playbackRate = .6; });
});

document.querySelectorAll<HTMLElement>('.magnetic').forEach((button) => {
  button.addEventListener('pointermove', (event) => {
    if (!motionAllowed() || !finePointer.matches) return;
    const box = button.getBoundingClientRect();
    gsap.to(button, { x: (event.clientX - box.left - box.width / 2) * .12, y: (event.clientY - box.top - box.height / 2) * .15, duration: .4, ease: 'power3.out', overwrite: true });
  });
  button.addEventListener('pointerleave', () => { gsap.to(button, { x: 0, y: 0, duration: motionAllowed() ? .4 : 0, ease: 'power3.out', overwrite: true }); });
});
/** One follower for every [data-cursor] target. Hit-testing on pointer move and on scroll
    means cards that slide under a still pointer (pinned gallery, marquee) update it too,
    so a label can never be left behind on a card the pointer has already left. */
const cursorChip = document.querySelector<HTMLElement>('.cursor-chip');
const cursorLabel = cursorChip?.querySelector('[data-cursor-label]');
const cursorX = cursorChip ? gsap.quickTo(cursorChip, 'x', { duration: .35, ease: 'power3.out' }) : undefined;
const cursorY = cursorChip ? gsap.quickTo(cursorChip, 'y', { duration: .35, ease: 'power3.out' }) : undefined;
const pointer = { x: 0, y: 0, inside: false };
let cursorTarget: HTMLElement | null = null;
function syncCursor() {
  if (!cursorChip) return;
  const enabled = pointer.inside && finePointer.matches && motionAllowed() && !document.querySelector('dialog[open]');
  const hit = enabled ? document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>('[data-cursor]') ?? null : null;
  if (hit === cursorTarget) return;
  cursorTarget = hit;
  if (hit && cursorLabel) cursorLabel.textContent = hit.dataset.cursor ?? '';
  gsap.to(cursorChip, { opacity: hit ? 1 : 0, scale: hit ? 1 : .6, duration: hit ? .25 : .15, ease: 'power3.out', overwrite: 'auto' });
}
window.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;
  Object.assign(pointer, { x: event.clientX, y: event.clientY, inside: true });
  cursorX?.(event.clientX + 16);
  cursorY?.(event.clientY + 16);
  syncCursor();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; syncCursor(); });
window.addEventListener('scroll', syncCursor, { passive: true });
document.querySelectorAll<HTMLElement>('.live-board').forEach((board) => {
  const wires = board.querySelector('.workflow-wires');
  board.addEventListener('pointermove', (event) => {
    if (!motionAllowed() || !finePointer.matches || !wires) return;
    const box = board.getBoundingClientRect();
    gsap.to(wires, { x: (event.clientX - box.left - box.width / 2) * .008, y: (event.clientY - box.top - box.height / 2) * .008, duration: .5, ease: 'power3.out', overwrite: true });
  });
  board.addEventListener('pointerleave', () => { if (wires) gsap.to(wires, { x: 0, y: 0, duration: .4 }); });
});

document.querySelectorAll<HTMLInputElement>('.comparison input').forEach((input) => {
  input.addEventListener('input', () => { input.closest<HTMLElement>('.comparison')?.style.setProperty('--split', `${input.value}%`); });
});

document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((tool) => {
      tool.classList.toggle('active', tool === button);
      tool.setAttribute('aria-pressed', String(tool === button));
    });
    const view = document.querySelector<HTMLElement>('.comparison');
    if (view && button.dataset.tool) view.dataset.toolView = button.dataset.tool;
    const before = document.querySelector('[data-before-label]');
    const after = document.querySelector('[data-after-label]');
    if (before) before.textContent = (button.dataset.before ?? '').toUpperCase();
    if (after) after.textContent = (button.dataset.after ?? '').toUpperCase();
    announce(`${button.textContent?.trim()} selected.`);
  });
});

/** Picks a preset on the live board and runs the signal through its graph. */
let traceTimeline: gsap.core.Timeline | undefined;
function traceMove(button: HTMLButtonElement | null) {
  const board = document.querySelector<HTMLElement>('.workflow-live');
  if (!button || !board) return;
  const { trace = 'Orbit', traceFile = 'orbit', tracePrompt = '', traceMotion = '', traceSpec = '', traceClip, traceWorkflow } = button.dataset;
  document.querySelectorAll<HTMLButtonElement>('[data-trace]').forEach((option) => {
    const selected = option === button;
    option.setAttribute('aria-checked', String(selected));
    option.tabIndex = selected ? 0 : -1;
  });
  const setText = (selector: string, text: string) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  setText('[data-live="prompt"]', tracePrompt);
  setText('[data-live="motion"]', traceMotion);
  setText('[data-live="output"]', `${traceFile.replace(/-/g, '_')}_001.mp4`);
  setText('[data-live-file]', traceFile);
  setText('[data-live-name]', trace);
  setText('[data-live-spec]', traceSpec);
  const open = document.querySelector<HTMLElement>('[data-live-open]');
  if (open) open.dataset.openWorkflow = trace;
  const light = (...keys: string[]) => keys.forEach((key) => board.querySelector(`[data-node="${key}"]`)?.classList.add('is-lit'));
  const wires = Array.from(board.querySelectorAll<SVGPathElement>('.signal-wires path'));
  const poster = document.querySelector<HTMLImageElement>('[data-live-poster]');
  const clip = document.querySelector<HTMLVideoElement>('[data-live-video]');
  const download = document.querySelector<HTMLAnchorElement>('[data-live-download]');
  if (download) {
    download.hidden = !traceWorkflow;
    download.href = `/workflows/${traceFile}.json`;
    const name = download.querySelector('[data-live-download-name]');
    if (name) name.textContent = traceFile;
  }
  // The pane plays the move's real render when one exists, otherwise shows its poster.
  const swapPoster = () => {
    if (poster) poster.src = `/media/moves/${traceFile}.webp`;
    if (!clip) return;
    clip.hidden = !traceClip;
    if (!traceClip) { clip.pause(); return; }
    clip.poster = `/media/moves/${traceFile}.webp`;
    clip.src = `/media/moves/${traceFile}.mp4`;
    if (motionAllowed()) void clip.play().catch(() => {});
  };
  traceTimeline?.kill();
  board.querySelectorAll('.workflow-node').forEach((node) => node.classList.remove('is-lit'));
  if (!motionAllowed()) {
    gsap.set(wires, { strokeDashoffset: 0 });
    gsap.set([poster, clip].filter(Boolean), { opacity: 1 });
    light('input', 'prompt', 'motion', 'generate', 'output');
    swapPoster();
    return;
  }
  // The clicked preset swaps first; then the signal runs through the graph in order:
  // inputs, camera control, LTX, output.
  gsap.set(wires, { strokeDashoffset: 1 });
  traceTimeline = gsap.timeline()
    .to([poster, clip].filter(Boolean), { opacity: 0, duration: .15 }, 0)
    .call(swapPoster, [], .15)
    .to([poster, clip].filter(Boolean), { opacity: 1, duration: .4, ease: 'power2.out' }, .2)
    .call(() => light('input', 'prompt'), [], .3)
    .to(wires[1] ?? {}, { strokeDashoffset: 0, duration: .45, ease: 'power1.inOut' }, .4)
    .to(wires[0] ?? {}, { strokeDashoffset: 0, duration: .85, ease: 'power1.inOut' }, .4)
    .call(() => light('motion'), [], .85)
    .to(wires[2] ?? {}, { strokeDashoffset: 0, duration: .3, ease: 'power1.inOut' }, .9)
    .call(() => light('generate'), [], 1.25)
    .to(wires[3] ?? {}, { strokeDashoffset: 0, duration: .35, ease: 'power1.inOut' }, 1.3)
    .call(() => light('output'), [], 1.65);
}
const traceOptions = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-trace]'));
traceOptions.forEach((button, index) => {
  button.addEventListener('click', () => { traceMove(button); announce(`${button.dataset.trace} traced through its workflow.`); });
  button.addEventListener('keydown', (event) => {
    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = traceOptions[(index + step + traceOptions.length) % traceOptions.length];
    if (next) { next.focus(); traceMove(next); }
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle('active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    const horizontal = ScrollTrigger.getById('moves-horizontal');
    const animation = horizontal?.animation;
    horizontal?.kill(true);
    animation?.kill();
    gsap.set('.moves-track', { x: 0 });
    document.querySelectorAll<HTMLElement>('[data-move]').forEach((card) => { card.hidden = button.dataset.filter !== 'all' && card.dataset.move !== button.dataset.filter; });
    const count = document.querySelector('[data-move-count]');
    const visible = document.querySelectorAll('[data-move]:not([hidden])').length;
    if (count) count.textContent = `${visible} ${visible === 1 ? 'MOVE' : 'MOVES'}`;
    if (motionAllowed() && window.innerWidth > 800) motionContext?.add(setupHorizontalGallery);
    ScrollTrigger.refresh();
    announce(`${button.textContent?.trim()} selected.`);
  });
});

const gallery = document.querySelector<HTMLElement>('.community-gallery');
gallery?.addEventListener('pointerenter', () => marquee?.pause());
gallery?.addEventListener('pointerleave', () => { if (motionAllowed() && !document.hidden) marquee?.play(); });
gallery?.addEventListener('focusin', () => marquee?.pause());
gallery?.addEventListener('focusout', () => { if (motionAllowed()) marquee?.play(); });
let fewestFirst = false;
document.querySelector<HTMLButtonElement>('[data-community-sort]')?.addEventListener('click', (event) => {
  const track = document.querySelector('.community-track');
  if (!track || !(event.currentTarget instanceof HTMLButtonElement)) return;
  fewestFirst = !fewestFirst;
  const columns = Array.from(track.querySelectorAll<HTMLElement>('.community-column:not([data-marquee-clone])'));
  const cards = columns.flatMap((column) => Array.from(column.querySelectorAll<HTMLElement>('.community-card')));
  cards.sort((a, b) => fewestFirst ? Number(a.dataset.forks) - Number(b.dataset.forks) : Number(b.dataset.forks) - Number(a.dataset.forks));
  cards.forEach((card, index) => columns[Math.floor(index / 2)]?.append(card));
  event.currentTarget.firstChild?.replaceWith(document.createTextNode(fewestFirst ? 'Most forks first ' : 'Fewest forks first '));
  initMotion();
});

document.querySelectorAll<HTMLAnchorElement>('.mobile-menu a').forEach((link) => link.addEventListener('click', () => { document.querySelector('.mobile-menu')?.removeAttribute('open'); }));
// The Local / Cloud switch rewrites the env line in the terminal and in the copied commands.
const setups = {
  local: { comment: '# Local ComfyUI with LTX 2.5 installed', env: 'COMFY_API_URL=http://127.0.0.1:8188' },
  cloud: { comment: '# Comfy Developer Platform', env: 'COMFY_API_KEY=your-key' },
} as const;
let runTarget: keyof typeof setups = 'local';
const setupCommands = () => ['git clone https://github.com/screen-gd/cutaway.git', 'cd cutaway', 'cp .env.example .env.local', `echo "${setups[runTarget].env}" >> .env.local`, 'npm install && npm run dev'].join('\n');
const runTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-run]'));
function setRunTarget(tab: HTMLButtonElement) {
  const target = tab.dataset.run;
  if (target !== 'local' && target !== 'cloud') return;
  runTarget = target;
  runTabs.forEach((option) => {
    const selected = option === tab;
    option.setAttribute('aria-selected', String(selected));
    option.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#setup-terminal')?.setAttribute('aria-labelledby', tab.id);
  const comment = document.querySelector('[data-setup-comment]');
  const env = document.querySelector('[data-setup-env]');
  if (comment) comment.textContent = setups[target].comment;
  if (env) env.textContent = setups[target].env;
  if (motionAllowed()) gsap.fromTo('.terminal pre', { opacity: .3, y: 6 }, { opacity: 1, y: 0, duration: .35, ease: 'power3.out' });
}
runTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setRunTarget(tab));
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = runTabs[(index + 1) % runTabs.length];
    if (next) { next.focus(); setRunTarget(next); }
  });
});
document.querySelector<HTMLButtonElement>('[data-copy-setup]')?.addEventListener('click', async (event) => {
  if (!(event.currentTarget instanceof HTMLButtonElement)) return;
  const button = event.currentTarget;
  const label = button.querySelector('span');
  try {
    await navigator.clipboard.writeText(setupCommands());
    if (label) label.textContent = 'Copied';
    announce('Setup commands copied.');
    setTimeout(() => { if (label) label.textContent = 'Copy'; }, 2200);
  } catch { announce('Clipboard unavailable. Select and copy the commands in the terminal.'); if (label) label.textContent = 'Select to copy'; }
});

// Load the graph renderer only after a visitor opens the workflow tab.
const dialog = document.querySelector<HTMLDialogElement>('#studio-dialog');
const promptInput = document.querySelector<HTMLInputElement>('#workflow-prompt');
const durationInput = document.querySelector<HTMLInputElement>('#workflow-duration');
let currentPreset = 'Orbit';
let graphEditor: ReturnType<typeof import('./graph').createWorkflowEditor> | undefined;
let graphPromise: Promise<void> | undefined;
let focusOrigin: HTMLElement | null = null;

function exampleData() {
  return { format: 'cutaway-workflow-anatomy', executable: false, preset: currentPreset, direction: promptInput?.value ?? '', duration: Number(durationInput?.value ?? 5), graph: graphEditor?.serialize() ?? null };
}
function updateGraph() {
  graphEditor?.update({ name: currentPreset, direction: promptInput?.value ?? '', duration: Number(durationInput?.value ?? 5) });
  const output = document.querySelector('#duration-output');
  if (output) output.textContent = `${durationInput?.value ?? 5} seconds`;
  const json = document.querySelector('#workflow-json');
  if (json) json.textContent = JSON.stringify(exampleData(), null, 2);
}
async function loadGraph() {
  const loading = document.querySelector<HTMLElement>('.graph-loading');
  if (!graphPromise) graphPromise = import('./graph').then(({ createWorkflowEditor }) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#workflow-canvas');
    if (canvas) graphEditor = createWorkflowEditor(canvas);
    if (loading) loading.hidden = true;
  }).catch(() => {
    graphPromise = undefined;
    if (loading) { loading.hidden = false; loading.textContent = 'The graph could not load. Your remix controls and JSON still work.'; }
  });
  await graphPromise;
  if (dialog?.open && !document.querySelector('#workflow-panel')?.hasAttribute('hidden')) graphEditor?.show();
  updateGraph();
}
function setTab(view: string) {
  dialog?.classList.toggle('is-showcase', view === 'preview');
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => {
    const active = tab.dataset.tab === view;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  const preview = document.querySelector<HTMLElement>('#preview-panel');
  const workflow = document.querySelector<HTMLElement>('#workflow-panel');
  const video = document.querySelector<HTMLVideoElement>('#dialog-video');
  if (preview) preview.hidden = view !== 'preview';
  if (workflow) workflow.hidden = view !== 'workflow';
  if (view === 'workflow') { video?.pause(); void loadGraph(); }
  else { graphEditor?.hide(); if (video && !video.hidden && motionAllowed()) void video.play().catch(() => {}); }
}
function openPreset({ name, poster, description, view, origin }: { name: string; poster: string; description: string; view: 'preview' | 'workflow'; origin: HTMLElement }) {
  if (!dialog) return;
  focusOrigin = origin;
  currentPreset = name;
  const heading = document.querySelector('#dialog-title');
  const image = document.querySelector<HTMLImageElement>('#dialog-poster');
  const copy = document.querySelector('#dialog-description');
  if (heading) heading.textContent = name;
  if (image) { image.src = `/media/${poster}.webp`; image.alt = `${name} illustrative poster`; }
  if (copy) copy.textContent = description;
  if (promptInput) promptInput.value = `${name}. Hold the subject. Keep the light.`;
  if (durationInput) durationInput.value = '5';
  const video = document.querySelector<HTMLVideoElement>('#dialog-video');
  const sourceVideo = origin.closest('article')?.querySelector<HTMLVideoElement>('video[data-src]');
  const notice = document.querySelector<HTMLElement>('.poster-notice');
  if (video) {
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    if (sourceVideo?.dataset.src) { video.src = sourceVideo.dataset.src; video.hidden = false; }
    if (notice) notice.hidden = !video.hidden;
  }
  lenis?.stop();
  marquee?.pause();
  dialog.showModal();
  if (motionAllowed()) gsap.fromTo(dialog, { y: 18, scale: .985, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .4, ease: 'power3.out' });
  setTab(view);
  updateGraph();
}
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const workflow = event.target.closest<HTMLButtonElement>('[data-open-workflow]');
  const preview = event.target.closest<HTMLButtonElement>('[data-showcase]');
  if (workflow) openPreset({ name: workflow.dataset.openWorkflow ?? 'Orbit', poster: 'hero', description: 'An open workflow is just the beginning.', view: 'workflow', origin: workflow });
  if (preview) openPreset({ name: preview.dataset.showcase ?? 'Orbit', poster: preview.dataset.poster ?? 'hero', description: preview.dataset.description ?? '', view: 'preview', origin: preview });
});
function resumeStudio() {
  graphEditor?.hide();
  document.querySelector<HTMLVideoElement>('#dialog-video')?.pause();
  if (motionAllowed()) { lenis?.start(); marquee?.play(); }
  focusOrigin?.focus({ preventScroll: true });
}
function closeDialog() {
  dialog?.close();
  resumeStudio();
}
document.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
dialog?.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
dialog?.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
dialog?.addEventListener('close', () => {
  if (!dialog.open) resumeStudio();
});
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab ?? 'preview'));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'preview' : event.key === 'End' ? 'workflow' : tab.dataset.tab === 'preview' ? 'workflow' : 'preview';
    setTab(next);
    document.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
  });
});
promptInput?.addEventListener('input', updateGraph);
durationInput?.addEventListener('input', updateGraph);
document.querySelector('[data-download-workflow]')?.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(exampleData(), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentPreset.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-anatomy.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Your example workflow remix has been downloaded.');
});

// Preset catalogue filter.
const presetFilters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-preset-filter]'));
presetFilters.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.presetFilter;
    presetFilters.forEach((filter) => {
      filter.classList.toggle('active', filter === button);
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    document.querySelectorAll<HTMLElement>('.preset-list li').forEach((item) => { item.hidden = tool !== 'all' && item.dataset.tool !== tool; });
    announce(`${button.textContent?.trim()} presets shown.`);
  });
});

/** Cost calculator: electricity for a month of renders, against the visitor's own plan. */
const costInputs = new Map(Array.from(document.querySelectorAll<HTMLInputElement>('[data-cost]'), (input) => [input.dataset.cost ?? '', input]));
const money = (value: number) => value >= 1 ? `$${value.toFixed(2)}` : value >= .01 ? `$${value.toFixed(2)}` : `$${value.toPrecision(2)}`;
function updateCost() {
  const read = (key: string) => Math.max(0, Number(costInputs.get(key)?.value) || 0);
  const clips = read('clips');
  const kwhPerClip = (read('seconds') / 3600) * (read('watts') / 1000);
  const perClip = kwhPerClip * read('rate');
  const month = perClip * clips;
  const plan = read('plan');
  const set = (selector: string, text: string) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  set('[data-cost-out="clips"]', String(clips));
  set('[data-cost-month]', month < .01 ? 'Under 1¢' : money(month));
  set('[data-cost-clip]', `about ${money(perClip)} per clip, ${clips} clips a month`);
  const compare = document.querySelector<HTMLElement>('[data-cost-compare]');
  if (compare) {
    compare.hidden = plan <= 0;
    if (plan > 0) compare.textContent = month > 0 ? `Your current plan costs ${Math.round(plan / month).toLocaleString()}× more.` : 'Your current plan costs more.';
  }
}
costInputs.forEach((input) => input.addEventListener('input', updateCost));
updateCost();

// Live GitHub stars, shown only once there are enough to count as proof.
(async () => {
  const badge = document.querySelector<HTMLElement>('[data-stars]');
  if (!badge) return;
  try {
    const cached = sessionStorage.getItem('cutaway-stars');
    const stars = cached ? Number(cached) : (await (await fetch('https://api.github.com/repos/screen-gd/cutaway')).json() as { stargazers_count?: number }).stargazers_count ?? 0;
    sessionStorage.setItem('cutaway-stars', String(stars));
    if (stars >= 25) { badge.textContent = stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars); badge.hidden = false; }
  } catch { /* Offline or rate-limited: the plain GitHub link still works. */ }
})();

let timeFrames = 0;
const timecode = document.querySelector('.timecode');
const timecodeObserver = new IntersectionObserver(([entry]) => { heroVisible = entry?.isIntersecting ?? false; });
let heroVisible = true;
if (timecode) timecodeObserver.observe(timecode);
setInterval(() => {
  if (!motionAllowed() || document.hidden || !heroVisible || !timecode) return;
  timeFrames += 3;
  const seconds = Math.floor(timeFrames / 24);
  timecode.textContent = `00:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}:${String(timeFrames % 24).padStart(2, '0')}`;
}, 125);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { marquee?.pause(); animatedVideos.forEach((video) => video.pause()); graphEditor?.hide(); }
  else if (motionAllowed()) { if (!dialog?.open) marquee?.play(); animatedVideos.forEach((video) => { void video.play().catch(() => {}); }); if (dialog?.open && !document.querySelector('#workflow-panel')?.hasAttribute('hidden')) graphEditor?.show(); }
});
initMotion();
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
