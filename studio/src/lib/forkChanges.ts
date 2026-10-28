type ParamLike = {
  type: string;
  key: string;
  label: string;
  default?: string | number | boolean;
};

export type ForkChange = {
  key: string;
  label: string;
  from: string | number | boolean | undefined;
  to: string | number | boolean | undefined;
};

/**
 * Defaults that differ between a fork and its source preset. Seed params have
 * no stored default (they randomize at run time) and are ignored.
 */
export function forkChanges(
  fork: { params: readonly ParamLike[] },
  source: { params: readonly ParamLike[] },
): ForkChange[] {
  const src = new Map(
    source.params.filter((p) => p.type !== "seed").map((p) => [p.key, p]),
  );
  return fork.params
    .filter((p) => p.type !== "seed")
    .filter((p) => !src.has(p.key) || src.get(p.key)?.default !== p.default)
    .map((p) => ({
      key: p.key,
      label: p.label,
      from: src.get(p.key)?.default,
      to: p.default,
    }));
}
