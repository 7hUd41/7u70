import type { MDXComponents } from "mdx/types";
import { Pre } from "./CodeBlock";
import { Check, Deep, Guided, Note, Run, V, Warn, When } from "./blocks";

/* Markdown → reader components. Everything not listed renders as plain HTML. */
export const mdxComponents: MDXComponents = {
  pre: Pre,
  Guided,
  Deep,
  Note,
  Warn,
  When,
  Run,
  Check,
  V,
};
