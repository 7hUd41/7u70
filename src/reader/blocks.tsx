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

import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Check as CheckIcon, ChevronRight, Copy, Info, Play } from "lucide-react";
import { atLeast, evaluate, fill, type Condition } from "@/engine";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";

/* Text written inline inside a tag (<Guided>text</Guided>) reaches us as bare
   nodes, not a paragraph. Wrap it so it gets paragraph spacing and measure;
   block content (a code fence, a list, another paragraph) passes through. */
const INLINE_TAGS = new Set(["code", "strong", "em", "a", "kbd", "span", "br"]);

function asBlock(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children);
  const inline = nodes.every((n) => {
    if (typeof n === "string" || typeof n === "number") return true;
    if (!isValidElement(n)) return false;
    return typeof n.type === "string" ? INLINE_TAGS.has(n.type) : n.type === V;
  });
  return inline ? <p>{children}</p> : children;
}

export function Guided({ children }: { children: ReactNode }) {
  const { level } = useReader();
  return atLeast(level, "guided") ? <>{asBlock(children)}</> : null;
}

export function Deep({ children }: { children: ReactNode }) {
  const { level } = useReader();
  return atLeast(level, "deep") ? <>{asBlock(children)}</> : null;
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

/* ── Collapsible block ────────────────────────────────────────
   <Details summary="If it fails">…</Details>
   Closed by default; the reader who is fine never sees the inside. */
export function Details({ summary, open, children }: { summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="details my-5 rounded-md border border-line bg-paper-2/60">
      <summary className="ui flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-[13.5px] text-ink">
        <ChevronRight className="chevron h-3.5 w-3.5 text-ink-3 transition-transform" />
        {summary}
      </summary>
      <div className="space-y-3 border-t border-line px-4 py-3 text-[0.95em]">{children}</div>
    </details>
  );
}

/* ── Content tabs ─────────────────────────────────────────────
   Several files of one feature, side by side instead of one after another:
     <Tabs>
       <Tab label="wg0.conf">…</Tab>
       <Tab label="peers.conf">…</Tab>
     </Tabs>
   Only the active tab is rendered, so exports match what is on screen.
   Tabs sharing a `group` stay in sync and remember the choice. */
export function Tab({ children }: { label: string; children: ReactNode }) {
  return <>{children}</>;
}

export function Tabs({ group, children }: { group?: string; children: ReactNode }) {
  // Tabs are the children carrying a `label`; comparing component identity is
  // unreliable across the server/client boundary.
  const tabs = Children.toArray(children).filter(
    (c): c is React.ReactElement<{ label: string; children: ReactNode }> =>
      isValidElement<{ label?: unknown }>(c) && typeof c.props.label === "string"
  );
  const [active, setActive] = useState(0);
  const key = group ? `at:tabs:${group}` : null;

  useEffect(() => {
    if (!key) return;
    /* eslint-disable react-hooks/set-state-in-effect -- hydration from storage */
    try {
      const i = tabs.findIndex((t) => t.props.label === localStorage.getItem(key));
      if (i >= 0) setActive(i);
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pick = (i: number) => {
    setActive(i);
    if (key) {
      try {
        localStorage.setItem(key, tabs[i].props.label);
      } catch {}
    }
  };

  if (tabs.length === 0) return null;
  return (
    <div className="my-5">
      <div role="tablist" className="ui flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.props.label}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => pick(i)}
            className={
              "-mb-px rounded-t border-b-2 px-3 py-1.5 font-mono text-[12.5px] transition " +
              (i === active ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink")
            }
          >
            {t.props.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="[&>*:first-child]:mt-2">
        {tabs[active]}
      </div>
    </div>
  );
}
