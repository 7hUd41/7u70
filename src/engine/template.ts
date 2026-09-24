/* ──────────────────────────────────────────────────────────────
   Variable injection
   Templates use `${KEY}` placeholders (upper snake case). Unknown
   keys are left untouched so a `${HOME}` inside a shell snippet
   survives as-is.
   ────────────────────────────────────────────────────────────── */

export type Vars = Readonly<Record<string, string>>;

const TOKEN = /\$\{([A-Z][A-Z0-9_]*)\}/g;

/** Replace every known `${KEY}` with its value. */
export function fill(template: string, vars: Vars): string {
  return template.replace(TOKEN, (whole, key: string) => (key in vars ? vars[key] : whole));
}

/** Distinct keys referenced by a template, in order of first appearance. */
export function keysOf(template: string): string[] {
  const seen = new Set<string>();
  for (const m of template.matchAll(TOKEN)) seen.add(m[1]);
  return [...seen];
}

export type Segment = { kind: "text"; text: string } | { kind: "var"; key: string; raw: string };

/** Split a template into literal text and variable segments, for rendering. */
export function segments(template: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: "text", text: template.slice(last, start) });
    out.push({ kind: "var", key: m[1], raw: m[0] });
    last = start + m[0].length;
  }
  if (last < template.length) out.push({ kind: "text", text: template.slice(last) });
  return out;
}
