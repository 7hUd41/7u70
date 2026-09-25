/* ──────────────────────────────────────────────────────────────
   Search index
   One entry per page and locale: title, summary, and the page cut
   into sections (one per h2/h3) with their plain text. Built from the
   MDX source, so it needs no browser and no rendering. Served as JSON
   and searched in the browser by src/reader/Search.tsx.
   ────────────────────────────────────────────────────────────── */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { LOCALES, type Locale } from "@/engine";
import { listSeries, readPageSource } from "./loader";
import { slugify } from "./rehype-heading-ids";

export type IndexSection = { id: string; heading: string; text: string };
export type IndexEntry = {
  series: string;
  seriesTitle: string;
  page: string;
  title: string;
  summary: string;
  tags: string[];
  difficulty: string;
  sections: IndexSection[];
};

type Node = { type: string; value?: string; depth?: number; children?: Node[] };

function textOf(n: Node): string {
  if (n.type === "text" || n.type === "inlineCode") return n.value ?? "";
  if (n.type === "code") return n.value ?? "";
  // <V name="X" /> reads as the variable's placeholder.
  if (n.type === "mdxJsxTextElement" || n.type === "mdxJsxFlowElement") {
    const name = (n as { name?: string }).name;
    if (name === "V") {
      const attr = ((n as { attributes?: { name: string; value?: string }[] }).attributes ?? []).find((a) => a.name === "name");
      return attr?.value ? `\${${attr.value}}` : "";
    }
  }
  return (n.children ?? []).map(textOf).join(n.type === "paragraph" || n.type === "listItem" ? "" : " ");
}

/** Cut a page into sections following its h2/h3 headings, ids as the renderer makes them. */
export function sectionsOf(source: string): IndexSection[] {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(source) as Node;
  const out: IndexSection[] = [];
  const used = new Map<string, number>();
  let current: IndexSection = { id: "", heading: "", text: "" };
  const push = () => {
    current.text = current.text.replace(/\s+/g, " ").trim();
    if (current.heading || current.text) out.push(current);
  };
  const walk = (nodes: Node[]) => {
    for (const n of nodes) {
      if (n.type === "heading" && (n.depth === 2 || n.depth === 3)) {
        push();
        const heading = textOf(n).trim();
        const base = slugify(heading);
        const k = used.get(base) ?? 0;
        used.set(base, k + 1);
        current = { id: k === 0 ? base : `${base}-${k + 1}`, heading, text: "" };
      } else if (n.type === "mdxJsxFlowElement" && n.children) {
        // <Run> repeats the page as a script: indexing it would drown the real sections.
        if ((n as { name?: string }).name === "Run") continue;
        walk(n.children); // <When>, <Guided>, <Details>…: their content belongs to the section
      } else {
        current.text += " " + textOf(n);
      }
    }
  };
  walk(tree.children ?? []);
  push();
  return out;
}

export async function buildIndex(locale: Locale): Promise<IndexEntry[]> {
  const all = await listSeries();
  const entries: IndexEntry[] = [];
  for (const s of all) {
    for (const p of s.pages) {
      const src = await readPageSource(p, locale);
      entries.push({
        series: s.slug,
        seriesTitle: s.contract.title[locale],
        page: p.slug,
        title: p.contract.title[locale],
        summary: p.contract.summary[locale],
        tags: p.contract.tags,
        difficulty: p.contract.difficulty,
        sections: sectionsOf(src),
      });
    }
  }
  return entries;
}

export const INDEX_LOCALES = LOCALES;
