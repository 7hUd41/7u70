"use client";

import { Fragment } from "react";
import { useDoc, type Vars } from "./doc-context";

const SPLIT_RE = /(\$\{[A-Z_]+\})/g;
const TOKEN_RE = /^\$\{([A-Z_]+)\}$/;

/* Découpe un texte et transforme ${VAR} en pastille cliquable.
   dark = true sur fond sombre (blocs de code), false en pleine prose.
   Survol d'un jeton -> met en évidence le champ correspondant (et inversement,
   piloté par highlightKey dans le contexte). */
export function Tokenized({ template, dark = false }: { template: string; dark?: boolean }) {
  const { vars, flashing, requestEdit, highlightKey, setHighlight } = useDoc();
  return (
    <>
      {template.split(SPLIT_RE).map((part, i) => {
        const m = part.match(TOKEN_RE);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const key = m[1];
        // Variable inconnue (ex. ${ENCRYPTION_KEY} d'un compose) -> texte brut.
        if (!(key in vars)) return <Fragment key={i}>{part}</Fragment>;
        const active = flashing === key;
        const lit = highlightKey === key;
        const value = key in vars ? vars[key as keyof Vars] : part;

        const palette = active
          ? dark
            ? "bg-amber-300 text-slate-900"
            : "bg-amber-400 text-amber-950"
          : lit
            ? dark
              ? "bg-amber-400/40 text-amber-100 ring-1 ring-amber-300"
              : "bg-amber-200 text-amber-900 ring-1 ring-amber-400"
            : dark
              ? "bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
              : "bg-amber-100 text-amber-800 hover:bg-amber-200";

        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              requestEdit(key, { top: r.top, bottom: r.bottom, left: r.left });
            }}
            onMouseEnter={() => setHighlight(key)}
            onMouseLeave={() => setHighlight(null)}
            title={`Modifier ${key} (s'applique partout)`}
            style={{ font: "inherit", lineHeight: "inherit", verticalAlign: "baseline" }}
            className={"cursor-pointer rounded border-0 px-1 font-mono transition-colors duration-200 " + palette}
          >
            {value}
          </button>
        );
      })}
    </>
  );
}
