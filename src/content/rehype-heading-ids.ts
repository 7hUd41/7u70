/* Gives every h2/h3 a stable, URL-safe id derived from its text,
   so the table of contents and deep links work without client work. */

import type { Root, Element } from "hast";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "section"
  );
}

function textOf(node: Element): string {
  let out = "";
  for (const c of node.children) {
    if (c.type === "text") out += c.value;
    else if (c.type === "element") out += textOf(c);
  }
  return out;
}

export function rehypeHeadingIds() {
  return (tree: Root) => {
    const used = new Map<string, number>();
    const visit = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "h2" || child.tagName === "h3") {
          const base = slugify(textOf(child));
          const n = used.get(base) ?? 0;
          used.set(base, n + 1);
          child.properties = { ...child.properties, id: n === 0 ? base : `${base}-${n + 1}` };
        }
        visit(child);
      }
    };
    visit(tree);
  };
}
