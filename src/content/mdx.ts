/* ──────────────────────────────────────────────────────────────
   MDX compilation
   Prose is compiled on the server at request time (dev) or build
   time (static export). Components are injected by the renderer.
   ────────────────────────────────────────────────────────────── */

import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";
import { rehypeHeadingIds } from "./rehype-heading-ids";
import { rehypeCodeMeta } from "./rehype-code-meta";

export type MdxContent = ComponentType<{ components?: MDXComponents }>;

export async function compileMdx(source: string): Promise<MdxContent> {
  const mod = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHeadingIds, rehypeCodeMeta],
    development: false,
  });
  return mod.default as MdxContent;
}
