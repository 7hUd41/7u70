/* Exposes a fence to the renderer as plain attributes on its <pre>:
   data-code (the text), data-lang, and data-meta (what follows the language
   on the opening ``` line, e.g. `title="configuration.py" {3-5,8}`, which
   MDX drops otherwise). The <pre> component then never has to look into
   its children, which may still be lazy references while the server
   streams the page. */

import type { Root, Element, ElementContent } from "hast";
import { walk } from "./hast-walk";

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

export function rehypeCodeMeta() {
  return (tree: Root) => {
    walk(tree, (el: Element) => {
      if (el.tagName !== "pre") return;
      const code = el.children.find((c: ElementContent): c is Element => c.type === "element" && c.tagName === "code");
      if (!code) return;
      const meta = (code.data as { meta?: string } | undefined)?.meta;
      const classes = code.properties?.className;
      const lang = (Array.isArray(classes) ? classes : [classes]).map(String).find((c) => c.startsWith("language-"))?.slice("language-".length) ?? "";
      if (meta) code.properties = { ...code.properties, dataMeta: meta };
      el.properties = { ...el.properties, dataCode: textOf(code), dataLang: lang, ...(meta ? { dataMeta: meta } : {}) };
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
