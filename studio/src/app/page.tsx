import { ControlsToGraph, type ControlSpec } from "@/components/home/ControlsToGraph";
import { ForkList, type ForkRow } from "@/components/home/ForkList";
import { HeroReveal } from "@/components/home/HeroReveal";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ModelSheet, type ModelRow } from "@/components/home/ModelSheet";
import { MoveFilmstrip } from "@/components/home/MoveFilmstrip";
import { Pipeline } from "@/components/home/Pipeline";
import { normalizeGraph } from "@/components/workflow/graphModel";
import { forkChanges } from "@/lib/forkChanges";
import { getEnv } from "@/server/env";
import { getPreset, listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function Home() {
  const catalog = listPresets();
  const builtins = catalog.filter((p) => p.origin === "builtin");
  const moves = builtins
    .filter((p) => p.category === "camera")
    .map((p) => ({ id: p.id, name: p.name, chip: p.chip }));

  const orbit = getPreset("orbit");
  const orbitTop = orbit ? normalizeGraph(orbit.workflowUi) : null;
  const orbitSubgraph = orbitTop?.nodes.find((n) => n.subgraph)?.subgraph;
  const orbitInner =
    orbit && orbitSubgraph
      ? normalizeGraph(orbit.workflowUi, orbitSubgraph)
      : null;

  // Mock composer rows: preset labels and defaults, each bound to a node.
  const controls: ControlSpec[] = (() => {
    if (!orbit || !orbitTop || !orbitInner) return [];
    const { preset } = orbit;
    const paramByKey = new Map(preset.params.map((p) => [p.key, p]));
    const topById = new Map(orbitTop.nodes.map((n) => [n.id, n]));
    const innerById = new Map(orbitInner.nodes.map((n) => [n.id, n]));
    const node = (path: number[]) => {
      const top = topById.get(path[0]);
      if (!top) return { innerId: null, classText: "node" };
      if (path.length < 2 || path[1] === undefined || !top.subgraph) {
        return {
          innerId: null,
          classText: `${top.type} → subgraph input`,
        };
      }
      return {
        innerId: path[1],
        classText: innerById.get(path[1])?.type ?? "node",
      };
    };
    const choiceLabel = (key: string) => {
      const param = paramByKey.get(key);
      if (!param || param.type !== "choice") return "";
      return (
        param.options.find((o) => o.value === param.default)?.label ??
        String(param.default)
      );
    };
    const label = (key: string) => paramByKey.get(key)?.label ?? key;
    const promptParam = paramByKey.get("prompt");
    return [
      {
        key: "image",
        label: preset.inputs[0]?.label ?? "First frame",
        value: "",
        tile: true,
        ...node([395]),
      },
      {
        key: "prompt",
        label: label("prompt"),
        value:
          promptParam?.type === "text" ? (promptParam.placeholder ?? "") : "",
        dimValue: true,
        ...node([398, 376]),
      },
      {
        key: "seed",
        label: label("seed"),
        value: "random",
        ...node([398, 339]),
      },
      {
        key: "duration",
        label: label("duration"),
        value: choiceLabel("duration"),
        ...node([398, 362]),
      },
      {
        key: "fps",
        label: label("fps"),
        value: choiceLabel("fps"),
        ...node([398, 361]),
      },
      {
        key: "aspect",
        label: label("aspect"),
        value: choiceLabel("aspect"),
        ...node([403]),
      },
    ];
  })();

  const forkRows: ForkRow[] = (() => {
    const forks = catalog.filter((p) => p.origin === "fork");
    if (forks.length === 0) {
      return [
        {
          href: "/workflows/orbit",
          from: "Orbit",
          to: "Orbit (slow, 120°)",
          changed: 2,
          example: true,
        },
        {
          href: "/workflows/dolly-in",
          from: "Dolly in",
          to: "Dolly in (long, 8s)",
          changed: 1,
          example: true,
        },
        {
          href: "/workflows/whip-pan",
          from: "Whip pan",
          to: "Whip pan (portrait)",
          changed: 1,
          example: true,
        },
      ];
    }
    const user = getEnv().user;
    return forks.map((fork) => {
      let sourceName = fork.forkOf ?? "Preset";
      let changed = 0;
      try {
        const source = fork.forkOf ? getPreset(fork.forkOf) : null;
        if (source) {
          sourceName = source.preset.name;
          changed = forkChanges(fork, source.preset).length;
        }
      } catch {
        /* Source preset gone; the row still links to the fork. */
      }
      return {
        href: `/workflows/${fork.id}`,
        from: sourceName,
        to: fork.name,
        changed,
        author: user,
      };
    });
  })();

  const modelRows: ModelRow[] = (() => {
    const byModel = new Map<string, typeof builtins>();
    for (const p of builtins) {
      const list = byModel.get(p.model.id) ?? [];
      list.push(p);
      byModel.set(p.model.id, list);
    }
    return [...byModel.values()].map((ps) => {
      const model = ps[0].model;
      const tasks = new Set<string>();
      const cam = ps.filter((p) => p.category === "camera");
      if (cam.length) tasks.add(`Camera moves (${cam.length})`);
      for (const p of ps.filter((p) => p.category === "video")) {
        tasks.add(
          p.inputs.some((i) => i.required)
            ? "Image to video"
            : "Text to video",
        );
      }
      for (const p of ps.filter((p) => p.category === "image")) {
        tasks.add(p.inputs.length === 0 ? "Text to image" : "Image edit");
      }
      if (ps.some((p) => p.category === "edit")) tasks.add("Edit");
      // Camera presets share the i2v template; surface the canonical preset.
      const templatePreset =
        (model.id === "ltx-2.5"
          ? ps.find((p) => p.id === "ltx25-i2v")
          : undefined) ??
        ps.find((p) => p.category !== "camera") ??
        ps[0];
      return {
        label: model.label,
        task: [...tasks].join(", "),
        license: model.license,
        template: templatePreset.source.template,
      };
    });
  })();

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      {orbitTop && (
        <HeroReveal
          topGraph={orbitTop}
          moves={moves}
          defaultMoveId="orbit"
        />
      )}

      <section className="border-t border-line py-20">
        <h2 className="mb-8 text-h2 font-semibold tracking-tight text-t1">
          Pick a move
        </h2>
        <MoveFilmstrip moves={moves} />
      </section>

      {orbitInner && controls.length > 0 && (
        <section className="border-t border-line py-20">
          <h2 className="mb-8 text-h2 font-semibold tracking-tight text-t1">
            Every control is a node
          </h2>
          <ControlsToGraph controls={controls} graph={orbitInner} />
        </section>
      )}

      <section className="border-t border-line py-20">
        <h2 className="mb-8 text-h2 font-semibold tracking-tight text-t1">
          Fork it
        </h2>
        <ForkList rows={forkRows} />
      </section>

      <section className="border-t border-line py-20">
        <h2 className="mb-8 text-h2 font-semibold tracking-tight text-t1">
          The pipeline
        </h2>
        <Pipeline />
      </section>

      <section className="border-t border-line py-20">
        <h2 className="mb-8 text-h2 font-semibold tracking-tight text-t1">
          Models
        </h2>
        <ModelSheet rows={modelRows} />
      </section>

      <HomeFooter />
    </div>
  );
}
