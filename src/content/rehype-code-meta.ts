/* Exposes the fence "meta" string (what follows the language on the opening
   ``` line) to the renderer as data-meta, e.g.
     ```python title="configuration.py" {3-5,8}
   MDX drops it otherwise. */

import type { Root, Element } from "hast";
import { walk } from "./hast-walk";

export function rehypeCodeMeta() {
  return (tree: Root) => {
    walk(tree, (el: Element) => {
      if (el.tagName !== "code") return;
      const meta = (el.data as { meta?: string } | undefined)?.meta;
      if (meta) el.properties = { ...el.properties, dataMeta: meta };
    });
  };
}

export type FenceMeta = { title?: string; highlight: Set<number> };

/** Parse `title="x" {1,3-5}` into a title and a set of 1-based line numbers. */
export function parseMeta(meta: string | undefined): FenceMeta {
  const out: FenceMeta = { highlight: new Set() };
  if (!meta) return out;
  const title = meta.match(/title="([^"]*)"/) ?? meta.match(/title='([^']*)'/);
  if (title) out.title = title[1];
  const ranges = meta.match(/\{([\d,\s-]+)\}/);
  if (ranges) {
    for (const part of ranges[1].split(",")) {
      const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) continue;
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : a;
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.highlight.add(i);
    }
  }
  return out;
}
