/**
 * Single-slot hand-off for a still dropped in the home page composer: the
 * studio page takes it on mount and runs the normal upload path.
 */

let pending: File | null = null;

export function setPendingStill(file: File) {
  pending = file;
}

export function takePendingStill(): File | null {
  const file = pending;
  pending = null;
  return file;
}
