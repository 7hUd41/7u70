import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Tokenized } from "@/components/Tokenized";
import { Detailed, Full, Note, Warn, V, When, Automatic, Check, Checklist, Task } from "@/components/Reading";
import { Diagram } from "@/components/diagrams";

/* Récupère le texte brut d'un noeud (le contenu d'un <code>). */
function rawText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(rawText).join("");
  if (isValidElement(node)) return rawText(node.props.children);
  return "";
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,

    // Composants de lecture utilisables directement dans le MDX
    Detailed,
    Full,
    Note,
    Warn,
    V,
    When,
    Automatic,
    Check,
    Checklist,
    Task,
    Diagram,

    // Bloc de code (```...```) -> commande copiable avec injection de variables
    pre: ({ children }: { children?: ReactNode }) => {
      const child = children;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = child as any;
      let code = "";
      let lang = "";
      let sourceLine: string | number | undefined;
      if (isValidElement(child)) {
        code = rawText(c.props?.children);
        lang = String(c.props?.className || "").replace("language-", "");
        sourceLine = c.props?.["data-source-line"];
      } else {
        code = rawText(child);
      }
      return <CodeBlock code={code} lang={lang} sourceLine={sourceLine} />;
    },

    // Code en ligne (`...`) -> texte avec injection de variables
    code: ({ children }: { children?: ReactNode }) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
        <Tokenized template={rawText(children)} />
      </code>
    ),

    h1: (p) => <h1 className="mb-2 mt-2 text-3xl font-bold tracking-tight text-slate-900" {...p} />,
    h2: (p) => (
      <h2
        className="mb-3 mt-10 border-t border-slate-200 pt-8 text-xl font-semibold tracking-tight text-slate-900 first:mt-0 first:border-0 first:pt-0"
        {...p}
      />
    ),
    h3: (p) => <h3 className="mb-2 mt-6 text-base font-semibold text-slate-900" {...p} />,
    p: (p) => <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-slate-700" {...p} />,
    ul: (p) => <ul className="mb-4 ml-5 list-disc space-y-1 text-[15px] text-slate-700" {...p} />,
    ol: (p) => <ol className="mb-4 ml-5 list-decimal space-y-1 text-[15px] text-slate-700" {...p} />,
    a: (p) => <a className="text-cyan-700 underline underline-offset-2 hover:text-cyan-900" {...p} />,
    strong: (p) => <strong className="font-semibold text-slate-900" {...p} />,
  };
}
