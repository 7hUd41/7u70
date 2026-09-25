"use client";

/* Printing: the page as the reader sees it, with a self-describing head
   (stack and values, secrets masked). Folded boxes open for the print
   and close again afterwards. */

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { useReader } from "./store";

export function PrintButton() {
  const { t } = useReader();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ui inline-flex items-center gap-1.5 rounded border border-line bg-paper px-2.5 py-1 text-[12.5px] text-ink-2 transition hover:text-ink print:hidden"
      title={t.print.button}
    >
      <Printer className="h-3.5 w-3.5" /> {t.print.button}
    </button>
  );
}

/* Rendered only on paper: which path and which values this printout is for. */
export function PrintSummary() {
  const { contract, choices, vars, locale, level, t } = useReader();
  const visibleChoices = contract.choices.filter((c) => choices[c.key] !== undefined);
  const visibleVars = contract.vars.filter((v) => (vars[v.key] ?? "") !== "");
  return (
    <section className="hidden print:block" aria-hidden>
      <div className="mb-6 border-b border-line pb-4 text-[11pt]">
        <p className="ui text-[9pt] text-ink-3">
          {t.print.printedFrom} {typeof window !== "undefined" ? window.location.href.split("#")[0] : ""} · {t.levels[level].label}
        </p>
        {visibleChoices.length > 0 && (
          <p className="ui mt-2">
            <span className="label">{t.context.choices}</span>{" "}
            {visibleChoices
              .map((c) => {
                const v = choices[c.key];
                if (c.type === "boolean") return `${c.label[locale]}: ${v ? "✓" : "✗"}`;
                return `${c.label[locale]}: ${c.options.find((o) => o.value === v)?.label[locale] ?? String(v)}`;
              })
              .join(" · ")}
          </p>
        )}
        {visibleVars.length > 0 && (
          <p className="ui mt-1">
            <span className="label">{t.context.title}</span>{" "}
            {visibleVars.map((v) => `${v.label[locale]} = ${v.kind === "secret" ? "••••••" : vars[v.key]}`).join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}

/* Opens every <details> before printing, restores them after. */
export function PrintSupport() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>(".doc-body details:not([open])"));
      opened.forEach((d) => (d.open = true));
    };
    const after = () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return null;
}
