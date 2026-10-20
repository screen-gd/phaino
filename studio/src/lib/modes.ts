/**
 * Which mode a model runs in, from what the user supplied. Shared by the
 * Video/Image studios and tests.
 */

export type ModeKey = "t2i" | "edit" | "t2v" | "i2v" | "flf2v";

export type ModeResolution = {
  mode: ModeKey | null;
  error: string | null;
};

/** Video: nothing -> t2v, first frame -> i2v, first+last -> flf2v. */
export function resolveVideoMode(
  modes: ReadonlySet<ModeKey> | readonly ModeKey[],
  hasFirst: boolean,
  hasLast: boolean,
): ModeResolution {
  const set: ReadonlySet<ModeKey> =
    modes instanceof Set ? modes : new Set(modes);
  const has = (m: ModeKey) => set.has(m);
  if (hasLast && !hasFirst) {
    return { mode: null, error: "Add a first frame to use a last frame." };
  }
  if (hasFirst && hasLast) {
    if (has("flf2v")) return { mode: "flf2v", error: null };
    return { mode: "i2v", error: "This model has no first-and-last mode." };
  }
  if (hasFirst) {
    if (has("i2v")) return { mode: "i2v", error: null };
    if (has("flf2v")) return { mode: null, error: "This model needs a first and last frame." };
    return { mode: null, error: "This model doesn't take a first frame." };
  }
  if (has("t2v")) return { mode: "t2v", error: null };
  if (has("i2v")) return { mode: null, error: "This model needs a first frame." };
  return { mode: null, error: "No mode available." };
}

/** Image: reference filled -> edit, else t2i. */
export function resolveImageMode(
  modes: ReadonlySet<ModeKey> | readonly ModeKey[],
  hasReference: boolean,
): ModeResolution {
  const set: ReadonlySet<ModeKey> =
    modes instanceof Set ? modes : new Set(modes);
  const has = (m: ModeKey) => set.has(m);
  if (hasReference) {
    if (has("edit")) return { mode: "edit", error: null };
    return { mode: null, error: "This model doesn't take a reference." };
  }
  if (has("t2i")) return { mode: "t2i", error: null };
  if (has("edit")) return { mode: null, error: "This model needs a reference image." };
  return { mode: null, error: "No mode available." };
}

export const MODE_LABELS: Record<ModeKey, string> = {
  t2i: "Text to image",
  edit: "Edit",
  t2v: "Text to video",
  i2v: "Image to video",
  flf2v: "First and last frame",
};
