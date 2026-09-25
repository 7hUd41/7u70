/* ──────────────────────────────────────────────────────────────
   Diagrams
   A page may ship a diagram.yaml: boxes, containers and arrows, no
   coordinates. Labels are localized, `sub` lines may carry ${VARS},
   any element may carry a `when` and disappear with the reader's
   choices. The drawing also follows the reading level: an element
   may declare the level it appears from (`level`) or up to (`max`),
   and carry `guided:` / `deep:` overrides for its text, so Quick
   shows the picture and Deep shows every layer of it. The layout is
   computed here, in pure TypeScript: layers from the arrows (left to
   right), rows inside a layer, containers drawn around their members.
   ────────────────────────────────────────────────────────────── */

import { z } from "zod";
import { ConditionSpec, Localized } from "./contract";
import { evaluate, type Choices } from "./conditions";
import { atLeast, LEVEL_INDEX, type Level } from "./levels";

export const NODE_KINDS = ["user", "client", "server", "service", "store", "file", "net", "cloud"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

const Id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const Text = z.union([z.string(), Localized]);
/** Levels an element can be tied to (Run shows the Quick drawing). */
const DiagramLevel = z.enum(["quick", "guided", "deep"]);
/** Text overrides applied from a level up. */
const NodeDetail = z.object({ label: Localized.optional(), sub: Text.optional() });
const EdgeDetail = z.object({ label: Text.optional() });
const Leveled = {
  /** Appears from this level up (default: always). */
  level: DiagramLevel.optional(),
  /** Appears up to this level, inclusive: a simplification that richer levels replace. */
  max: DiagramLevel.optional(),
};

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
  ...Leveled,
  guided: NodeDetail.optional(),
  deep: NodeDetail.optional(),
});

export const DiagramGroup = z.object({
  id: Id,
  label: Localized,
  when: ConditionSpec.optional(),
  ...Leveled,
});

export const DiagramEdge = z.object({
  from: Id,
  to: Id,
  label: Text.optional(),
  dashed: z.boolean().default(false),
  when: ConditionSpec.optional(),
  ...Leveled,
  guided: EdgeDetail.optional(),
  deep: EdgeDetail.optional(),
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
export type DiagramEdge = z.infer<typeof DiagramEdge>;

/* ── Reading level ──────────────────────────────────────────── */
/** Run reads the Quick drawing: there is no simpler picture than the simple one. */
export function diagramLevel(level: Level): Level {
  return level === "run" ? "quick" : level;
}

function shownAt<T extends { level?: Level; max?: Level }>(item: T, level: Level): boolean {
  return (!item.level || atLeast(level, item.level)) && (!item.max || LEVEL_INDEX[level] <= LEVEL_INDEX[item.max]);
}

/** The spec as read at a level: elements filtered, `guided:`/`deep:` overrides applied (the richest one wins). */
export function atLevel(spec: DiagramSpec, level: Level): DiagramSpec {
  const l = diagramLevel(level);
  const detail = <D extends object>(item: { guided?: D; deep?: D }): D | undefined =>
    (atLeast(l, "deep") ? item.deep : undefined) ?? (atLeast(l, "guided") ? item.guided : undefined);
  const strip = <T extends { guided?: unknown; deep?: unknown }>(item: T) => {
    const { guided: _g, deep: _d, ...rest } = item;
    void _g;
    void _d;
    return rest;
  };
  return {
    ...spec,
    groups: spec.groups.filter((g) => shownAt(g, l)),
    nodes: spec.nodes.filter((n) => shownAt(n, l)).map((n) => ({ ...strip(n), ...(detail(n) ?? {}) })),
    edges: spec.edges.filter((e) => shownAt(e, l)).map((e) => ({ ...strip(e), ...(detail(e) ?? {}) })),
  };
}

/* ── Layout ─────────────────────────────────────────────────── */
export const NODE_W = 172;
export const NODE_H = 58;
const GAP_X = 84;
const GAP_Y = 18;
const GROUP_PAD = 14;
const GROUP_HEAD = 24;
const MARGIN = 12;
const ROW_GAP = 56;
/** Room kept on both sides of a wrapped drawing for arrows that swing round a column. */
const SWING = 64;
const SWING_STEP = 22;

export type Box = { x: number; y: number; w: number; h: number };
export type LaidNode = DiagramNode & Box & { layer: number; row: number };
export type LaidGroup = { id: string; label: Localized; /** Row segment of a group that wraps (0 = the first). */ part: number } & Box;
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
  /** Where the label sits relative to its anchor (default: centred on it). */
  align?: "start" | "end";
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

/** Rough width of a label in the diagram's small UI font, to keep arrows long enough for it. */
function textWidth(t: string | Localized | undefined): number {
  return t === undefined ? 0 : textLength(t) * 6.4 + 16;
}
function textLength(t: string | Localized): number {
  return typeof t === "string" ? t.length : Math.max(...Object.values(t).map((v) => v.length));
}

/** Sub lines wrap in the box (icon and padding take 50px, a mono glyph ~6.6px), up to three lines. */
export const SUB_MAX_LINES = 3;
const WIDE_NODE_W = 212;
function subChars(nodeW: number): number {
  return Math.floor((nodeW - 50) / 6.6);
}
function subLines(t: string | Localized | undefined, nodeW: number): number {
  return t === undefined ? 0 : Math.min(SUB_MAX_LINES, Math.ceil(textLength(t) / subChars(nodeW)));
}

export type LayoutOptions = {
  /** Layers per row; beyond it the chain wraps to the next row, snaking back. Default: no wrapping. */
  perRow?: number;
};

export function layoutDiagram(fullSpec: DiagramSpec, choices: Choices, level: Level = "deep", opts: LayoutOptions = {}): Layout {
  const spec = atLevel(fullSpec, level);
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
  // Arrows must be long enough for their labels; boxes widen when sub lines run long.
  const gapX = Math.max(GAP_X, ...edges.map((e) => textWidth(e.label)));
  const nodeW = nodes.some((n) => n.sub && textLength(n.sub) > 2 * subChars(NODE_W)) ? WIDE_NODE_W : NODE_W;

  // Columns. A single row by default (the page card scrolls sideways);
  // `perRow` wraps the layers into rows that snake back and forth, so a
  // long chain fills a screen instead of a strip.
  const perRow = Math.max(1, Math.min(layerCount, opts.perRow ?? layerCount));
  const rowOf = (layer: number) => Math.floor(layer / perRow);
  const colOf = (layer: number) => {
    const r = rowOf(layer);
    const i = layer - r * perRow;
    return r % 2 === 0 ? i : perRow - 1 - i;
  };
  const rowCount = rowOf(layerCount - 1) + 1;
  const sidePad = rowCount > 1 ? SWING + 3 * SWING_STEP : 0;
  const colX = (col: number) => MARGIN + sidePad + col * (nodeW + gapX);

  // Rows, one after the other. Inside a row, groups come first, as bands: a
  // group's members stack from the top of every column the group spans, and
  // the band's bottom is the tallest column. Nodes outside any group then
  // stack in the free space below, so a container never covers a box that
  // is not one of its members. A group spanning several rows gets one box
  // per row.
  // Inside a column, the box the solid flow reaches comes first (it gets the
  // straight arrow); the others follow in declaration order.
  const ordered = [...nodes].sort((a, b) => Number(hasSolidPred.has(b.id)) - Number(hasSolidPred.has(a.id)) || nodes.indexOf(a) - nodes.indexOf(b));
  const laid: LaidNode[] = [];
  const groups: LaidGroup[] = [];
  const place = (n: DiagramNode, layer: number, y: number): number => {
    const h = NODE_H + 14 * subLines(n.sub, nodeW);
    laid.push({ ...n, layer, row: rowOf(layer), x: colX(colOf(layer)), y, w: nodeW, h });
    return y + h;
  };
  let rowTop = MARGIN;
  for (let r = 0; r < rowCount; r++) {
    const inRow = (n: DiagramNode) => rowOf(layerOf.get(n.id) ?? 0) === r;
    const cursor: number[] = Array.from({ length: perRow }, () => rowTop);
    for (const g of groupsVisible) {
      const members = ordered.filter((n) => n.in === g.id && inRow(n));
      if (members.length === 0) continue;
      const cols = members.map((m) => colOf(layerOf.get(m.id) ?? 0));
      const lo = Math.min(...cols);
      const hi = Math.max(...cols);
      const top = Math.max(...cursor.slice(lo, hi + 1)) + GROUP_HEAD + GROUP_PAD;
      let bottom = top;
      for (let c = lo; c <= hi; c++) {
        let y = top;
        for (const m of members) if (colOf(layerOf.get(m.id) ?? 0) === c) y = place(m, layerOf.get(m.id) ?? 0, y) + GAP_Y;
        bottom = Math.max(bottom, y - GAP_Y);
      }
      const x0 = colX(lo) - GROUP_PAD;
      const y0 = top - GROUP_HEAD - GROUP_PAD;
      const part = groups.filter((x) => x.id === g.id).length;
      groups.push({ id: g.id, label: g.label, part, x: x0, y: y0, w: colX(hi) + nodeW + GROUP_PAD - x0, h: bottom + GROUP_PAD - y0 });
      for (let c = lo; c <= hi; c++) cursor[c] = bottom + GROUP_PAD + GAP_Y;
    }
    for (const n of ordered) {
      if (n.in || !inRow(n)) continue;
      const layer = layerOf.get(n.id) ?? 0;
      const c = colOf(layer);
      cursor[c] = place(n, layer, cursor[c]) + GAP_Y;
    }
    rowTop = Math.max(...cursor) - GAP_Y + ROW_GAP;
  }

  laid.sort((a, b) => nodes.findIndex((n) => n.id === a.id) - nodes.findIndex((n) => n.id === b.id));

  const byId = new Map(laid.map((n) => [n.id, n]));
  const routed: LaidEdge[] = edges.map((e) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    let d: string;
    let mx: number;
    let my: number;
    let align: LaidEdge["align"];
    if (a.row !== b.row) {
      // Another row: leave from the bottom (or top). Arrive from the top (or
      // bottom) when the target heads its column, else swing round and enter
      // by the side the row flows from, so stacked targets do not share a line.
      const down = b.row > a.row;
      const x1 = a.x + a.w / 2;
      const y1 = down ? a.y + a.h : a.y;
      const heads = !laid.some((n) => n.row === b.row && n.x === b.x && (down ? n.y < b.y : n.y > b.y));
      if (heads) {
        const x2 = b.x + b.w / 2;
        const y2 = down ? b.y : b.y + b.h;
        const c = (y2 - y1) / 2;
        d = `M ${x1} ${y1} C ${x1} ${y1 + c}, ${x2} ${y2 - c}, ${x2} ${y2}`;
        mx = (x1 + x2) / 2;
        my = (y1 + y2) / 2;
      } else {
        // Out of the source's side, round the column, into the target's side.
        // Targets further down the column swing wider, so the arrows nest.
        const fromRight = b.row % 2 === 1;
        const rank = laid.filter((n) => n.row === b.row && n.x === b.x && (down ? n.y < b.y : n.y > b.y)).length;
        const swing = (fromRight ? 1 : -1) * (SWING + SWING_STEP * (rank - 1));
        const sx = fromRight ? a.x + a.w : a.x;
        const sy = a.y + a.h / 2;
        const x2 = fromRight ? b.x + b.w : b.x;
        const y2 = b.y + b.h / 2;
        d = `M ${sx} ${sy} C ${sx + swing} ${sy}, ${x2 + swing} ${y2}, ${x2} ${y2}`;
        mx = x2 + swing * 0.8;
        my = (sy + y2) / 2;
        align = fromRight ? "start" : "end";
      }
    } else if (b.x > a.x) {
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const c = (x2 - x1) / 2;
      d = `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
      mx = (x1 + x2) / 2;
      my = (y1 + y2) / 2;
    } else if (b.x < a.x) {
      const x1 = a.x;
      const y1 = a.y + a.h / 2;
      const x2 = b.x + b.w;
      const y2 = b.y + b.h / 2;
      const c = (x1 - x2) / 2;
      d = `M ${x1} ${y1} C ${x1 - c} ${y1}, ${x2 + c} ${y2}, ${x2} ${y2}`;
      mx = (x1 + x2) / 2;
      my = (y1 + y2) / 2;
    } else {
      // Same column: a short vertical hop between the two boxes.
      const down = b.y > a.y;
      const x = a.x + a.w / 2;
      const y1 = down ? a.y + a.h : a.y;
      const y2 = down ? b.y : b.y + b.h;
      d = `M ${x} ${y1} L ${x} ${y2}`;
      mx = x;
      my = (y1 + y2) / 2;
    }
    return { from: e.from, to: e.to, label: e.label, dashed: e.dashed, d, mx, my, align };
  });

  const cols = Math.min(perRow, layerCount);
  const width = (MARGIN + sidePad) * 2 + cols * nodeW + Math.max(0, cols - 1) * gapX;
  const height = Math.max(...laid.map((n) => n.y + n.h + MARGIN), ...groups.map((g) => g.y + g.h + MARGIN));
  return { width, height, nodes: laid, groups, edges: routed };
}

/** The wrapping that fills a stage best: tries every row length and keeps the one with the largest fit scale. */
export function layoutForStage(spec: DiagramSpec, choices: Choices, level: Level, stageW: number, stageH: number): Layout {
  let best: Layout | null = null;
  let bestScale = 0;
  const single = layoutDiagram(spec, choices, level);
  const layerCount = Math.max(0, ...single.nodes.map((n) => n.layer)) + 1;
  for (let k = layerCount; k >= 1; k--) {
    const l = k === layerCount ? single : layoutDiagram(spec, choices, level, { perRow: k });
    const scale = Math.min(stageW / l.width, stageH / l.height);
    // Prefer fewer rows when the gain is small: a strip reads better than a stack.
    if (scale > bestScale * 1.15) {
      best = l;
      bestScale = scale;
    }
  }
  return best ?? single;
}
