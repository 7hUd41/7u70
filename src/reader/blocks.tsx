"use client";

/* ──────────────────────────────────────────────────────────────
   Authoring components available in page-<locale>.mdx

   Reading depth:
     plain markdown         quick and above
     <Guided>…</Guided>     guided and above
     <Deep>…</Deep>         deep only
     <Note>…</Note>         guided and above, informational aside
     <Warn>…</Warn>         every level: safety matters
     <Run>…</Run>           run level only (one script / playbook)

   Conditions:  <When flag="LDAP">  <When notFlag="LDAP">  <When is="WEB" equals="nginx">

   Values:      <V name="NETBOX_HOST" />   inline token in prose
   Checks:      <Check cmd="systemctl is-active netbox" expect="active" />
   ────────────────────────────────────────────────────────────── */

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check as CheckIcon, Copy, Info, Play } from "lucide-react";
import { atLeast, evaluate, fill, type Condition } from "@/engine";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";

export function Guided({ children }: { children: ReactNode }) {
  const { level } = useReader();
  return atLeast(level, "guided") ? <>{children}</> : null;
}

export function Deep({ children }: { children: ReactNode }) {
  const { level } = useReader();
  return atLeast(level, "deep") ? <>{children}</> : null;
}

export function Note({ children }: { children: ReactNode }) {
  const { level } = useReader();
  if (!atLeast(level, "guided")) return null;
  return (
    <aside className="my-5 flex gap-3 border-l-2 border-line-2 pl-4 text-[0.95em] text-ink-2">
      <Info className="mt-1 h-4 w-4 shrink-0 text-ink-3" />
      <div className="space-y-2">{children}</div>
    </aside>
  );
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <aside className="my-5 flex gap-3 rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-[0.95em]">
      <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warn" />
      <div className="space-y-2">{children}</div>
    </aside>
  );
}

export function When(props: Condition & { children: ReactNode }) {
  const { choices } = useReader();
  const { children, ...cond } = props;
  return evaluate(cond, choices) ? <>{children}</> : null;
}

/* Everything outside <Run> is hidden at the run level (see Body). */
export function Run({ children }: { children: ReactNode }) {
  const { level, t } = useReader();
  if (level !== "run") return null;
  return (
    <section data-run className="my-6">
      <div className="ui mb-5 flex gap-3 rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-ink">
        <Play className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>{t.run.banner}</p>
      </div>
      {children}
    </section>
  );
}

export function V({ name }: { name: string }) {
  return (
    <code className="font-mono text-[0.9em]">
      <Tokenized template={"${" + name + "}"} />
    </code>
  );
}

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return "chk_" + (h >>> 0).toString(36);
}

export function Check({ cmd, expect, id }: { cmd: string; expect?: string; id?: string }) {
  const { level, vars, done, toggleDone, t } = useReader();
  const [copied, setCopied] = useState(false);
  if (level === "run") return null;

  const stepId = id ?? hashId(cmd);
  const isDone = Boolean(done[stepId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fill(cmd, vars));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      data-check={stepId}
      data-done={isDone ? "true" : "false"}
      className={"my-5 rounded-md border px-4 py-3 transition-colors " + (isDone ? "border-ok/40 bg-ok-soft" : "border-line bg-paper-2")}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          onClick={() => toggleDone(stepId)}
          title={isDone ? t.check.unmark : t.check.mark}
          className={
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition " +
            (isDone ? "border-ok bg-ok text-paper" : "border-line-2 bg-paper text-transparent hover:border-ok")
          }
        >
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className={"label " + (isDone ? "text-ok" : "")}>{isDone ? t.check.done : t.check.title}</span>
            <button type="button" onClick={copy} className="ui inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
              {copied ? <CheckIcon className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
              {copied ? t.code.copied : t.code.copy}
            </button>
          </div>
          <pre className="overflow-x-auto rounded border border-code-line bg-code-bg px-3 py-2 text-[13px] leading-relaxed text-code-ink">
            <span className="mr-2 select-none text-code-muted">$</span>
            <Tokenized template={cmd} />
          </pre>
          {expect && (
            <div className="mt-2 flex items-start gap-3">
              <span className="label mt-1 shrink-0">{t.check.expect}</span>
              <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink-2">
                <Tokenized template={expect} />
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
