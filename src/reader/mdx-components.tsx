import type { MDXComponents } from "mdx/types";
import { Annotated, Pre } from "./CodeBlock";
import { Check, Deep, Details, Guided, Note, Run, Tab, Tabs, V, Warn, When } from "./blocks";

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
  Details,
  Annotated,
  Tabs,
  Tab,
};
