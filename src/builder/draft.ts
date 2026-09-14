/**
 * The builder holds a draft as a plain object and changes it by JSON Pointer.
 * JSON Pointers are the keys of field states, issues and provenance in @fpds-football/fpds, so one kind of key is used everywhere.
 */

export type Draft = Record<string, unknown>;

export function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
}

export function escapeToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function getAt(draft: unknown, pointer: string): unknown {
  let current = draft;
  for (const token of parsePointer(pointer)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

/** Returns a new draft with the value at the pointer changed. `undefined` removes the value. */
export function setAt(draft: Draft, pointer: string, value: unknown): Draft {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) return (value ?? {}) as Draft;

  const update = (node: unknown, index: number): unknown => {
    const token = tokens[index] as string;
    const isIndex = /^[0-9]+$/.test(token);
    const container: Record<string, unknown> | unknown[] = Array.isArray(node)
      ? [...node]
      : node !== null && typeof node === "object"
        ? { ...(node as Record<string, unknown>) }
        : isIndex
          ? []
          : {};

    const next = index === tokens.length - 1 ? value : update((container as Record<string, unknown>)[token], index + 1);
    if (next === undefined) {
      if (Array.isArray(container)) container.splice(Number(token), 1);
      else delete container[token];
    } else {
      (container as Record<string, unknown>)[token] = next;
    }
    return container;
  };

  return update(draft, 0) as Draft;
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "") ||
  (typeof value === "number" && Number.isNaN(value)) ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);

/** Removes empty strings, empty arrays, empty objects and NaN. A form keeps these, but FPDS treats them as "not stated". */
export function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((item) => !isEmpty(item));
    return items.length > 0 ? items : undefined;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, inner]) => [key, typeof inner === "string" ? inner.trim() : clean(inner)] as const)
      .filter(([, inner]) => !isEmpty(inner));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return isEmpty(value) ? undefined : value;
}
