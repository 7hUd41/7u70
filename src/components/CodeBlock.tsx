"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useDoc, fill } from "./doc-context";
import { Tokenized } from "./Tokenized";
import { scanDangers } from "@/lib/danger";

const SHELL_LANGS = ["", "bash", "sh", "shell", "console", "zsh", "sh-session"];

export function CodeBlock({ code, lang = "", sourceLine }: { code: string; lang?: string; sourceLine?: string | number }) {
  const { vars } = useDoc();
  const [copied, setCopied] = useState(false);
  const clean = code.replace(/\n$/, "");
  const lower = lang.toLowerCase();
  const showPrompt = SHELL_LANGS.includes(lower);
  const kind = showPrompt ? "shell" : lower || "file";
  const dangers = showPrompt ? scanDangers(clean) : [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fill(clean, vars));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div
      data-cmd={clean}
      data-kind={kind}
      data-source-line={sourceLine}
      className="group relative my-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm"
    >
      {lang && !showPrompt && (
        <div className="border-b border-slate-700/70 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          {lang}
        </div>
      )}
      <button
        onClick={copy}
        aria-label="Copier"
        className="absolute right-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 opacity-0 transition hover:bg-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 group-hover:opacity-100"
        style={{ top: dangers.length > 0 || (lang && !showPrompt) ? "2.75rem" : "0.625rem" }}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Copié
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copier
          </>
        )}
      </button>
      {dangers.length > 0 && (
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] leading-snug text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">Commande sensible</span> — {dangers.join(" · ")}. Vérifie avant d&apos;exécuter.
          </span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-slate-100">
        {clean.split("\n").map((line, i) => (
          <div key={i}>
            {showPrompt && <span className="mr-2 select-none text-slate-600">$</span>}
            <Tokenized template={line} dark />
          </div>
        ))}
      </pre>
    </div>
  );
}
