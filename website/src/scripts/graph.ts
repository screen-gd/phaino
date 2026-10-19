import { LGraph, LGraphCanvas, LGraphNode } from '@comfyorg/litegraph';
import '@comfyorg/litegraph/style.css';

/** An editable anatomy example, deliberately separate from executable ComfyUI API JSON. */
export function createWorkflowEditor(canvas: HTMLCanvasElement) {
  const graph = new LGraph();
  const editor = new LGraphCanvas(canvas, graph);
  editor.background_image = '';
  editor.clear_background_color = '#070707';
  editor.render_shadows = false;
  editor.allow_searchbox = false;
  editor.allow_reconnect_links = false;
  editor.default_connection_color = { input_off: '#ff5b22', input_on: '#ff5b22', output_off: '#ff5b22', output_on: '#ff5b22' };

  function node(title: string, x: number, y: number) {
    const result = new LGraphNode(title);
    result.pos = [x, y];
    result.color = '#2a2a2a';
    result.bgcolor = '#151515';
    result.boxcolor = '#ff5b22';
    graph.add(result);
    return result;
  }

  const image = node('Load image', 35, 65);
  image.addOutput('IMAGE', 'IMAGE');
  image.addWidget('text', 'file', 'first_frame.png', null);
  image.setSize([190, 95]);

  const prompt = node('Your direction', 35, 235);
  prompt.addOutput('DIRECTION', 'STRING');
  const promptWidget = prompt.addWidget('text', 'prompt', 'Slow orbit. Hold the subject.', null);
  prompt.setSize([260, 95]);

  const motion = node('Camera motion', 365, 145);
  motion.addInput('direction', 'STRING');
  motion.addOutput('MOTION', 'MOTION');
  const durationWidget = motion.addWidget('number', 'seconds', 5, null, { min: 2, max: 10, step: 10 });
  const moveWidget = motion.addWidget('text', 'move', 'Orbit', null);
  motion.setSize([195, 135]);

  const generate = node('LTX 2.5 · example', 640, 75);
  generate.addInput('image', 'IMAGE');
  generate.addInput('motion', 'MOTION');
  generate.addOutput('FRAMES', 'VIDEO');
  generate.addWidget('text', 'resolution', '1280 × 720', null);
  generate.setSize([200, 135]);

  const output = node('Your next shot', 920, 210);
  output.addInput('video', 'VIDEO');
  output.addWidget('text', 'file', 'shot_001.mp4', null);
  output.setSize([190, 85]);

  image.connect(0, generate, 0);
  prompt.connect(0, motion, 0);
  motion.connect(0, generate, 1);
  generate.connect(0, output, 0);

  // Rendering only while the dialog is visible prevents a hidden canvas RAF loop.
  editor.stopRendering();
  function resize() {
    const box = canvas.parentElement?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    editor.resize(box.width, box.height);
    editor.ds.fitToBounds([0, 0, 1160, 390], { zoom: .92 });
    editor.setDirty(true, true);
  }
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  return {
    show() { resize(); editor.startRendering(); },
    hide() { editor.stopRendering(); },
    update({ name, direction, duration }: { name: string; direction: string; duration: number }) {
      promptWidget.value = direction;
      durationWidget.value = duration;
      moveWidget.value = name;
      editor.setDirty(true, true);
    },
    serialize() { return graph.asSerialisable(); },
  };
}
