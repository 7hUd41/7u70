"use client";

import { createContext, useContext, useId, useState, type ReactNode, isValidElement } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { atLeast, fill, scanDangers } from "@/engine";
import { parseMeta } from "@/content/rehype-code-meta";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";

const SHELL = new Set(["", "bash", "sh", "shell", "zsh", "console"]);

/* ── Annotations ───────────────────────────────────────────────
   A line ending with a marker such as `# (1)` or `// (2)` refers to the
   n-th item of the list that follows the block inside <Annotated>:

     <Annotated>
     ```python
     SECRET_KEY = '…'  # (1)
     ```
     1. Signs sessions. Never share it.
     </Annotated>

   Quick: markers are stripped. Guided: numbered badges, text on hover.
   Deep: text shown under the line. Copies never contain the markers. */
const MARKER = /[ \t]*(?:#|\/\/|--|;|<!--)\s*\((\d+)\)\s*(?:-->)?[ \t]*$/;

const AnnotationsCtx = createContext<ReactNode[] | null>(null);

export function Annotated({ children }: { children: ReactNode }) {
  const nodes = Array.isArray(children) ? children : [children];
  const list = nodes.find((n) => isValidElement<{ children?: ReactNode }>(n) && n.type === "ol") as
    | React.ReactElement<{ children?: ReactNode }>
    | undefined;
  const items: ReactNode[] = [];
  if (list) {
    const lis = Array.isArray(list.props.children) ? list.props.children : [list.props.children];
    for (const li of lis) if (isValidElement<{ children?: ReactNode }>(li)) items.push(li.props.children);
  }
  const rest = nodes.filter((n) => n !== list);
  return <AnnotationsCtx.Provider value={items}>{rest}</AnnotationsCtx.Provider>;
}

export function stripMarkers(code: string): string {
  return code
    .split("\n")
    .map((l) => l.replace(MARKER, ""))
    .join("\n");
}

/* A `$` prompt marks a line the reader would type. Scripts (shebang), comments,
   blank lines and continuations of a previous `\` line are not typed. */
function promptLines(lines: string[], isScript: boolean): boolean[] {
  let continued = false;
  return lines.map((line) => {
    const show = !isScript && !continued && line.trim() !== "" && !line.trim().startsWith("#");
    continued = line.trimEnd().endsWith("\\");
    return show;
  });
}

/* Fenced code becomes <pre><code class="language-x" data-meta="…">…</code></pre>.
   We map <pre> here and read language, meta and text from the inner <code>. */
export function Pre({ children }: { children?: ReactNode }) {
  if (isValidElement<{ className?: string; children?: ReactNode; "data-meta"?: string }>(children) && children.type === "code") {
    const lang = (children.props.className ?? "").replace("language-", "");
    const code = String(children.props.children ?? "");
    return <CodeBlock code={code} lang={lang} meta={children.props["data-meta"]} />;
  }
  return <pre>{children}</pre>;
}

function Badge({ n, text }: { n: number; text: ReactNode }) {
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const id = useId();
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 328));
    setPos(window.innerHeight - r.bottom > 220 ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 });
  };
  return (
    <span className="relative ml-2 inline-flex align-middle" onMouseLeave={() => setPos(null)}>
      <button
        type="button"
        aria-describedby={pos ? id : undefined}
        onMouseEnter={(e) => show(e.currentTarget)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setPos(null)}
        className="ui inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-accent/60 bg-accent-soft px-1 font-sans text-[11px] leading-none text-accent-ink hover:bg-accent hover:text-paper"
      >
        {n}
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: 320 }}
          className="fixed z-50 whitespace-normal rounded-md border border-line bg-paper p-3 text-left font-serif text-[14px] leading-snug text-ink shadow-soft"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function CodeBlock({ code, lang = "", meta, title }: { code: string; lang?: string; meta?: string; title?: string }) {
  const { vars, level, t } = useReader();
  const annotations = useContext(AnnotationsCtx);
  const [copied, setCopied] = useState(false);

  const parsed = parseMeta(meta);
  const raw = code.replace(/\n$/, "");
  const clean = stripMarkers(raw);
  const shell = SHELL.has(lang.toLowerCase());
  const isScript = clean.startsWith("#!");
  const lines = raw.split("\n");
  const prompts = promptLines(clean.split("\n"), isScript);
  const dangers = shell ? scanDangers(clean) : [];
  const caption = title ?? parsed.title ?? (shell && isScript ? "script" : !shell && lang ? lang : undefined);
  const showAnnotations = annotations !== null && atLeast(level, "guided");
  const inlineAnnotations = annotations !== null && atLeast(level, "deep");

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
      {caption && (
        <figcaption className="label flex items-center justify-between border-b border-code-line px-3.5 py-1.5">
          <span className="font-mono normal-case tracking-normal">{caption}</span>
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
        style={{ top: dangers.length > 0 || caption ? undefined : "0.5rem" }}
      >
        {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
        {copied ? t.code.copied : t.code.copy}
      </button>
      <pre className="overflow-x-auto py-3 text-[13.5px] leading-[1.65]">
        <code>
          {lines.map((line, i) => {
            const m = line.match(MARKER);
            const text = m ? line.replace(MARKER, "") : line;
            const n = m ? Number(m[1]) : null;
            const note = n !== null && annotations ? annotations[n - 1] : undefined;
            const lit = parsed.highlight.has(i + 1);
            return (
              <div key={i} className={"px-3.5 " + (lit ? "border-l-2 border-accent bg-accent-soft/50 pl-3" : "border-l-2 border-transparent pl-3")}>
                {shell && !isScript && (
                  <span className={"mr-2 inline-block w-3 select-none text-code-muted " + (prompts[i] ? "" : "opacity-0")}>$</span>
                )}
                <Tokenized template={text} />
                {showAnnotations && note !== undefined && !inlineAnnotations && <Badge n={n!} text={note} />}
                {inlineAnnotations && note !== undefined && (
                  <span className="mt-0.5 block whitespace-normal border-l border-accent/50 pl-3 font-serif text-[13.5px] leading-snug text-ink-2">
                    <span className="mr-1.5 font-sans text-[11px] text-accent-ink">{n}</span>
                    {note}
                  </span>
                )}
              </div>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
