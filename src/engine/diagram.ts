/* ──────────────────────────────────────────────────────────────
   Diagrams
   A page may ship a diagram.yaml: boxes, containers and arrows, no
   coordinates. Labels are localized, `sub` lines may carry ${VARS},
   any element may carry a `when` and disappear with the reader's
   choices. The layout is computed here, in pure TypeScript: layers
   from the arrows (left to right), rows inside a layer, containers
   drawn around their members.
   ────────────────────────────────────────────────────────────── */

import { z } from "zod";
import { ConditionSpec, Localized } from "./contract";
import { evaluate, type Choices } from "./conditions";

export const NODE_KINDS = ["user", "client", "server", "service", "store", "file", "net", "cloud"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

const Id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const Text = z.union([z.string(), Localized]);

export const DiagramNode = z.object({
  id: Id,
  label: Localized,
  /** Second line: a port, a URL, a path… may use ${VARS}. */
  sub: Text.optional(),
  kind: z.enum(NODE_KINDS).default("service"),
  /** Container id. */
  in: Id.optional(),
  /** Draws the node with the accent: the thing this page is about. */
  focus: z.boolean().default(false),
  when: ConditionSpec.optional(),
});

export const DiagramGroup = z.object({
  id: Id,
  label: Localized,
  when: ConditionSpec.optional(),
});

export const DiagramEdge = z.object({
  from: Id,
  to: Id,
  label: Text.optional(),
  dashed: z.boolean().default(false),
  when: ConditionSpec.optional(),
});

export const DiagramSpec = z
  .object({
    title: Localized.optional(),
    caption: Localized.optional(),
    groups: z.array(DiagramGroup).default([]),
    nodes: z.array(DiagramNode).min(1),
    edges: z.array(DiagramEdge).default([]),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.nodes.map((n) => n.id));
    const groups = new Set(d.groups.map((g) => g.id));
    for (const n of d.nodes) if (n.in && !groups.has(n.in)) ctx.addIssue({ code: "custom", message: `node ${n.id}: unknown group "${n.in}"` });
    for (const e of d.edges) {
      if (!ids.has(e.from)) ctx.addIssue({ code: "custom", message: `edge from unknown node "${e.from}"` });
      if (!ids.has(e.to)) ctx.addIssue({ code: "custom", message: `edge to unknown node "${e.to}"` });
    }
  });
export type DiagramSpec = z.infer<typeof DiagramSpec>;
export type DiagramNode = z.infer<typeof DiagramNode>;

/* ── Layout ─────────────────────────────────────────────────── */
export const NODE_W = 172;
export const NODE_H = 58;
const GAP_X = 84;
const GAP_Y = 18;
const GROUP_PAD = 14;
const GROUP_HEAD = 24;
const MARGIN = 12;

export type Box = { x: number; y: number; w: number; h: number };
export type LaidNode = DiagramNode & Box & { layer: number };
export type LaidGroup = { id: string; label: Localized } & Box;
export type LaidEdge = {
  from: string;
  to: string;
  label?: string | Localized;
  dashed: boolean;
  /** SVG path, already routed. */
  d: string;
  /** Label anchor. */
  mx: number;
  my: number;
};
export type Layout = { width: number; height: number; nodes: LaidNode[]; groups: LaidGroup[]; edges: LaidEdge[] };

function visible<T extends { when?: z.infer<typeof ConditionSpec> }>(items: T[], choices: Choices): T[] {
  return items.filter((i) => !i.when || evaluate(i.when, choices));
}

/** Longest-path layering: a node sits one layer right of its farthest predecessor. */
function layers(nodes: DiagramNode[], edges: { from: string; to: string }[]): Map<string, number> {
  const ids = nodes.map((n) => n.id);
  const preds = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of edges) preds.get(e.to)?.push(e.from);
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0; // cycle: break it
    visiting.add(id);
    const p = preds.get(id) ?? [];
    const d = p.length ? Math.max(...p.map((q) => depth(q) + 1)) : 0;
    visiting.delete(id);
    memo.set(id, d);
    return d;
  };
  for (const id of ids) depth(id);
  return memo;
}

export function layoutDiagram(spec: DiagramSpec, choices: Choices): Layout {
  const groupsVisible = visible(spec.groups, choices);
  const groupIds = new Set(groupsVisible.map((g) => g.id));
  const nodes = visible(spec.nodes, choices).map((n) => (n.in && !groupIds.has(n.in) ? { ...n, in: undefined } : n));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = visible(spec.edges, choices).filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

  // Solid arrows are structural (left to right); dashed ones are secondary and
  // only place a node that nothing solid reaches. Group members without any
  // arrow join their group's first column.
  const layerOf = layers(nodes, edges.filter((e) => !e.dashed));
  const hasSolidPred = new Set(edges.filter((e) => !e.dashed).map((e) => e.to));
  for (const n of nodes) {
    if (hasSolidPred.has(n.id)) continue;
    const dashedPreds = edges.filter((e) => e.dashed && e.to === n.id).map((e) => layerOf.get(e.from) ?? 0);
    if (dashedPreds.length) layerOf.set(n.id, Math.max(...dashedPreds) + 1);
  }
  for (const g of groupsVisible) {
    const members = nodes.filter((n) => n.in === g.id);
    const anchored = members.filter((m) => hasSolidPred.has(m.id) || edges.some((e) => e.dashed && e.to === m.id));
    if (anchored.length === 0) continue;
    const first = Math.min(...anchored.map((m) => layerOf.get(m.id) ?? 0));
    for (const m of members) if (!anchored.includes(m)) layerOf.set(m.id, first);
  }
  const layerCount = Math.max(0, ...[...layerOf.values()]) + 1;

  // Rows: nodes of a layer in declaration order, group members kept adjacent.
  const columns: DiagramNode[][] = Array.from({ length: layerCount }, () => []);
  for (const n of nodes) columns[layerOf.get(n.id) ?? 0].push(n);
  for (const col of columns) col.sort((a, b) => (a.in ?? "~").localeCompare(b.in ?? "~") || nodes.indexOf(a) - nodes.indexOf(b));

  // Extra vertical room above a layer's first group member, for the group header.
  const laid: LaidNode[] = [];
  let maxBottom = 0;
  columns.forEach((col, li) => {
    let y = MARGIN;
    let lastGroup: string | undefined;
    for (const n of col) {
      if (n.in && n.in !== lastGroup) y += GROUP_HEAD + GROUP_PAD;
      else if (!n.in && lastGroup) y += GROUP_PAD;
      const h = n.sub ? NODE_H + 14 : NODE_H;
      laid.push({ ...n, layer: li, x: MARGIN + li * (NODE_W + GAP_X), y, w: NODE_W, h });
      y += h + GAP_Y;
      if (n.in) y += 0;
      lastGroup = n.in;
      maxBottom = Math.max(maxBottom, y);
    }
  });

  // Align group members across layers: a group's box is the union of its members.
  const groups: LaidGroup[] = groupsVisible
    .map((g) => {
      const members = laid.filter((n) => n.in === g.id);
      if (members.length === 0) return null;
      const x0 = Math.min(...members.map((m) => m.x)) - GROUP_PAD;
      const y0 = Math.min(...members.map((m) => m.y)) - GROUP_PAD - GROUP_HEAD;
      const x1 = Math.max(...members.map((m) => m.x + m.w)) + GROUP_PAD;
      const y1 = Math.max(...members.map((m) => m.y + m.h)) + GROUP_PAD;
      return { id: g.id, label: g.label, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    })
    .filter((g): g is LaidGroup => g !== null);

  const byId = new Map(laid.map((n) => [n.id, n]));
  const routed: LaidEdge[] = edges.map((e) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    let d: string;
    let mx: number;
    let my: number;
    if (b.layer > a.layer) {
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const c = (x2 - x1) / 2;
      d = `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
      mx = (x1 + x2) / 2;
      my = (y1 + y2) / 2;
    } else if (b.layer < a.layer) {
      const x1 = a.x;
      const y1 = a.y + a.h / 2;
      const x2 = b.x + b.w;
      const y2 = b.y + b.h / 2;
      const c = (x1 - x2) / 2;
      d = `M ${x1} ${y1} C ${x1 - c} ${y1}, ${x2 + c} ${y2}, ${x2} ${y2}`;
      mx = (x1 + x2) / 2;
      my = (y1 + y2) / 2;
    } else {
      // Same layer: a short vertical hop between the two boxes.
      const down = b.y > a.y;
      const x = a.x + a.w / 2;
      const y1 = down ? a.y + a.h : a.y;
      const y2 = down ? b.y : b.y + b.h;
      d = `M ${x} ${y1} L ${x} ${y2}`;
      mx = x;
      my = (y1 + y2) / 2;
    }
    return { from: e.from, to: e.to, label: e.label, dashed: e.dashed, d, mx, my };
  });

  const width = MARGIN * 2 + layerCount * NODE_W + Math.max(0, layerCount - 1) * GAP_X;
  const height = Math.max(maxBottom - GAP_Y + MARGIN, ...groups.map((g) => g.y + g.h + MARGIN));
  return { width, height, nodes: laid, groups, edges: routed };
}
