"use client";

import { useState, type ReactNode, isValidElement } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { fill, scanDangers } from "@/engine";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";

const SHELL = new Set(["", "bash", "sh", "shell", "zsh", "console"]);

/* Fenced code becomes <pre><code class="language-x">…</code></pre> in MDX.
   We map <pre> here and read the language + text from the inner <code>. */
export function Pre({ children }: { children?: ReactNode }) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children) && children.type === "code") {
    const lang = (children.props.className ?? "").replace("language-", "");
    const code = String(children.props.children ?? "");
    return <CodeBlock code={code} lang={lang} />;
  }
  return <pre>{children}</pre>;
}

export function CodeBlock({ code, lang = "", title }: { code: string; lang?: string; title?: string }) {
  const { vars, t } = useReader();
  const [copied, setCopied] = useState(false);
  const clean = code.replace(/\n$/, "");
  const shell = SHELL.has(lang.toLowerCase());
  const dangers = shell ? scanDangers(clean) : [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fill(clean, vars));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <figure
      data-code={clean}
      data-shell={shell ? "true" : undefined}
      data-lang={lang || undefined}
      className="group relative my-4 overflow-hidden rounded-md border border-code-line bg-code-bg text-code-ink"
    >
      {(title || (lang && !shell)) && (
        <figcaption className="label flex items-center justify-between border-b border-code-line px-3.5 py-1.5">
          <span className="font-mono normal-case tracking-normal">{title ?? lang}</span>
        </figcaption>
      )}
      {dangers.length > 0 && (
        <div className="ui flex items-start gap-2 border-b border-code-line bg-warn-soft px-3.5 py-2 text-[13px] text-ink">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          <span>
            <strong>{t.code.sensitive}</strong> — {dangers.map((d) => t.danger[d]).join(" · ")}. {t.code.review}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={t.code.copy}
        className="ui absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-line bg-paper px-2 py-1 text-[12px] text-ink-2 opacity-0 transition hover:text-ink focus:opacity-100 group-hover:opacity-100"
        style={{ top: dangers.length > 0 || title || (lang && !shell) ? undefined : "0.5rem" }}
      >
        {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
        {copied ? t.code.copied : t.code.copy}
      </button>
      <pre className="overflow-x-auto px-3.5 py-3 text-[13.5px] leading-[1.65]">
        <code>
          {clean.split("\n").map((line, i) => (
            <div key={i}>
              {shell && <span className="mr-2 select-none text-code-muted">$</span>}
              <Tokenized template={line} />
            </div>
          ))}
        </code>
      </pre>
    </figure>
  );
}
