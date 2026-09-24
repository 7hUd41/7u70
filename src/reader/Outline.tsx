"use client";

/* Right-hand outline: progress on checks + headings with scroll spy.
   Recomputed whenever the visible content changes (level, choices,
   checks), which is what `trigger` encodes. */

import { useEffect, useState } from "react";
import { useReader } from "./store";

type Item = { id: string; text: string; depth: 2 | 3 };

/* Reads the rendered body: headings for the outline, checks for progress. */
function useOutline() {
  const { level, choices, done } = useReader();
  const trigger = `${level}|${JSON.stringify(choices)}|${JSON.stringify(done)}`;
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");
  const [checks, setChecks] = useState({ total: 0, done: 0 });

  useEffect(() => {
    // The outline mirrors the rendered DOM (an external system from React's
    // point of view): headings and checks exist only after the body renders.
    /* eslint-disable react-hooks/set-state-in-effect -- reads the DOM after commit */
    const root = document.querySelector<HTMLElement>(".doc-body");
    if (!root) return;
    const hs = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent?.trim() ?? "", depth: h.tagName === "H2" ? 2 : 3 })));
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-check]"));
    setChecks({ total: nodes.length, done: nodes.filter((n) => n.dataset.done === "true").length });

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).id);
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );
    hs.forEach((h) => obs.observe(h));
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => obs.disconnect();
  }, [trigger]);

  return { items, active, checks };
}

function resume() {
  const next = Array.from(document.querySelectorAll<HTMLElement>('.doc-body [data-check][data-done="false"]'))[0];
  next?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* Folded outline: progress only, compact, lives in the header. */
export function ProgressPill() {
  const { t } = useReader();
  const { checks } = useOutline();
  if (checks.total === 0) return null;
  const pct = Math.round((checks.done / checks.total) * 100);
  const all = checks.done === checks.total;
  return (
    <button
      type="button"
      onClick={all ? undefined : resume}
      title={`${t.progress.title} · ${t.progress.steps(checks.done, checks.total)}${all ? "" : ` — ${t.progress.resume}`}`}
      className="ui inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink"
    >
      <span className="relative h-1 w-16 overflow-hidden rounded-full bg-paper-3">
        <span className={"absolute inset-y-0 left-0 transition-all duration-500 " + (all ? "bg-ok" : "bg-accent")} style={{ width: `${pct}%` }} />
      </span>
      <span className={"font-mono tabular-nums " + (all ? "text-ok" : "")}>
        {checks.done}/{checks.total}
      </span>
    </button>
  );
}

export function Outline() {
  const { t } = useReader();
  const { items, active, checks } = useOutline();

  if (items.length === 0 && checks.total === 0) return null;

  // Progressive disclosure: sub-steps (h3) only under the step being read.
  const parentOf = new Map<string, string>();
  let currentH2 = "";
  for (const it of items) {
    if (it.depth === 2) currentH2 = it.id;
    else parentOf.set(it.id, currentH2);
  }
  const activeH2 = items.find((i) => i.id === active)?.depth === 2 ? active : (parentOf.get(active) ?? "");
  const visible = items.filter((it) => it.depth === 2 || parentOf.get(it.id) === activeH2);

  const pct = checks.total ? Math.round((checks.done / checks.total) * 100) : 0;
  const all = checks.total > 0 && checks.done === checks.total;

  return (
    <div className="ui space-y-5">
      {checks.total > 0 && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="label">{t.progress.title}</span>
            <span className="text-[12px] text-ink-3">{t.progress.steps(checks.done, checks.total)}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-paper-3">
            <div className={"h-full transition-all duration-500 " + (all ? "bg-ok" : "bg-accent")} style={{ width: `${pct}%` }} />
          </div>
          {all ? (
            <p className="mt-1.5 text-[12px] text-ok">{t.progress.complete}</p>
          ) : (
            checks.done > 0 && (
              <button type="button" onClick={resume} className="mt-1.5 text-[12px] text-accent-ink hover:underline">
                {t.progress.resume} →
              </button>
            )
          )}
        </div>
      )}
      {items.length > 0 && (
        <nav aria-label={t.toc}>
          <span className="label mb-1.5 block">{t.toc}</span>
          <ul className="space-y-0.5 border-l border-line">
            {visible.map((it) => (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  className={
                    "-ml-px block truncate border-l py-0.5 text-[12.5px] transition " +
                    (it.depth === 3 ? "pl-5 " : "pl-3 ") +
                    (active === it.id ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink")
                  }
                >
                  {it.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
