/* Wraps glossary terms found in prose text in <abbr data-term="…">.
   Abbreviations: every occurrence. Terms: first occurrence per step (h2).
   Never inside code, links, headings or an existing abbr. Walks into MDX
   JSX containers (<When>, <Guided>…) like the other plugins. */

import type { Root } from "hast";
import { buildMatcher, type GlossaryEntry } from "@/engine";

type Node = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };

const SKIP = new Set(["code", "pre", "a", "abbr", "h1", "h2", "h3", "h4", "kbd", "script", "style"]);

export function rehypeGlossary(entries: GlossaryEntry[]) {
  const matcher = buildMatcher(entries);
  return (tree: Root) => {
    if (!matcher) return;
    let seen = new Set<string>();
    const rec = (node: Node, skipping: boolean) => {
      if (!node.children) return;
      const out: Node[] = [];
      for (const child of node.children) {
        if (child.type === "element" && child.tagName === "h2") seen = new Set();
        const skip = skipping || (child.type === "element" && SKIP.has(child.tagName ?? ""));
        if (child.type === "text" && !skip && child.value) {
          out.push(...splitText(child.value));
        } else {
          rec(child, skip);
          out.push(child);
        }
      }
      node.children = out;
    };
    const splitText = (value: string): Node[] => {
      const parts: Node[] = [];
      let last = 0;
      matcher.re.lastIndex = 0;
      for (const m of value.matchAll(matcher.re)) {
        const key = matcher.keyOf(m[0]);
        const abbr = matcher.isAbbr(key);
        // A case-insensitive hit on an abbreviation is not a hit: "sot" is not "SoT".
        if (abbr && m[0] !== key && !entries.some((e) => e.term === key && e.aliases.includes(m[0]))) continue;
        if (!abbr && seen.has(key)) continue;
        seen.add(key);
        const start = m.index ?? 0;
        if (start > last) parts.push({ type: "text", value: value.slice(last, start) });
        parts.push({ type: "element", tagName: "abbr", properties: { dataTerm: key, className: ["term"] }, children: [{ type: "text", value: m[0] }] });
        last = start + m[0].length;
      }
      if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
      return parts;
    };
    rec(tree as unknown as Node, false);
  };
}
