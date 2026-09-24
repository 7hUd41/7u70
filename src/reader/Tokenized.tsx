"use client";

import { Fragment } from "react";
import { segments } from "@/engine";
import { useReader } from "./store";

/* Renders a template with each declared `${VAR}` as an inline token:
   shows the current value, highlights with its field on hover, opens
   the inline editor on click. Undeclared placeholders stay literal. */
export function Tokenized({ template }: { template: string }) {
  const { vars, highlight, flash, setHighlight, requestEdit, t } = useReader();
  return (
    <>
      {segments(template).map((s, i) => {
        if (s.kind === "text") return <Fragment key={i}>{s.text}</Fragment>;
        if (!(s.key in vars)) return <Fragment key={i}>{s.raw}</Fragment>;
        const value = vars[s.key];
        return (
          <button
            key={i}
            type="button"
            className="token"
            data-lit={highlight === s.key ? "true" : undefined}
            data-flash={flash === s.key ? "true" : undefined}
            title={`${t.context.edit} ${s.key}`}
            style={{ font: "inherit", lineHeight: "inherit" }}
            onMouseEnter={() => setHighlight(s.key)}
            onMouseLeave={() => setHighlight(null)}
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              requestEdit(s.key, { top: r.top, bottom: r.bottom, left: r.left });
            }}
          >
            {value === "" ? s.raw : value}
          </button>
        );
      })}
    </>
  );
}
