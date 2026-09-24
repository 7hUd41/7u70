/* Depth-first walk over every HTML element of a hast tree, including those
   nested inside MDX JSX containers (<When>, <Annotated>…), whose nodes are
   not `element`s themselves but do have children. */

import type { Element, Root } from "hast";

type Parent = { type: string; children?: unknown[] };

export function walk(tree: Root, visit: (el: Element) => void) {
  const rec = (node: Parent) => {
    for (const child of node.children ?? []) {
      const c = child as Parent & { tagName?: string };
      if (c.type === "element") visit(c as unknown as Element);
      if (Array.isArray(c.children)) rec(c);
    }
  };
  rec(tree);
}
