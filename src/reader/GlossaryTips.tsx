"use client";

/* Hover (or focus) a marked term in the prose to read its definition.
   One delegated listener on the body; the definitions come with the page. */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GlossaryEntry } from "@/engine";
import { useReader } from "./store";

type Tip = { key: string; left: number; top?: number; bottom?: number };

export function GlossaryTips({ entries }: { entries: GlossaryEntry[] }) {
  const { locale, t } = useReader();
  const [tip, setTip] = useState<Tip | null>(null);
  const byTerm = new Map(entries.map((e) => [e.term, e]));

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".doc-body");
    if (!root) return;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const show = (el: HTMLElement) => {
      if (hideTimer) clearTimeout(hideTimer);
      const r = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 340));
      const below = window.innerHeight - r.bottom > 200;
      setTip({ key: el.dataset.term ?? "", left, top: below ? r.bottom + 6 : undefined, bottom: below ? undefined : window.innerHeight - r.top + 6 });
    };
    const hide = () => {
      hideTimer = setTimeout(() => setTip(null), 120);
    };
    const over = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("abbr[data-term]");
      if (el) show(el);
    };
    const out = (e: Event) => {
      if ((e.target as HTMLElement).closest("abbr[data-term]")) hide();
    };
    root.addEventListener("mouseover", over);
    root.addEventListener("mouseout", out);
    root.addEventListener("focusin", over);
    root.addEventListener("focusout", out);
    return () => {
      root.removeEventListener("mouseover", over);
      root.removeEventListener("mouseout", out);
      root.removeEventListener("focusin", over);
      root.removeEventListener("focusout", out);
    };
  }, []);

  const entry = tip ? byTerm.get(tip.key) : undefined;
  if (!tip || !entry) return null;
  return (
    <div
      role="tooltip"
      className="ui fixed z-50 w-[330px] rounded-md border border-line bg-paper p-3 text-[13px] leading-snug text-ink shadow-soft"
      style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}
      onMouseEnter={() => setTip(tip)}
      onMouseLeave={() => setTip(null)}
    >
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-bold">{entry.term}</span>
        {entry.expansion && <span className="text-ink-3">{entry.expansion[locale]}</span>}
      </div>
      <p className="font-serif text-[14px] text-ink-2">{entry.def[locale]}</p>
      <Link href={`/${locale}/glossary#${encodeURIComponent(entry.term)}`} className="mt-2 inline-block text-[12px] text-accent-ink hover:underline">
        {t.glossary.link} →
      </Link>
    </div>
  );
}
