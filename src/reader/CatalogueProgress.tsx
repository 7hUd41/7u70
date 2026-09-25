"use client";

/* Progress on the catalogue, read from this browser: checks done per page
   and the page read last in each series. No account: another device shows
   its own, unless a carry link brought the state over. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/engine";
import { dict } from "@/i18n";
import { pageUrl } from "@/urls";
import { lastReadKey, readSeriesProgress, type LastRead } from "./store";

type PageInfo = { slug: string; title: string; checks: number; locale: Locale };

export function SeriesProgress({ series, pages, locale }: { series: string; pages: PageInfo[]; locale: Locale }) {
  const t = dict(locale);
  const [state, setState] = useState<{ done: Record<string, string[]>; last: LastRead | null } | null>(null);
  useEffect(() => {
    let last: LastRead | null = null;
    try {
      const raw = localStorage.getItem(lastReadKey(series));
      last = raw ? (JSON.parse(raw) as LastRead) : null;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- from storage, after hydration
    setState({ done: readSeriesProgress(series), last });
  }, [series]);
  if (!state) return null;
  const lastPage = state.last && pages.find((p) => p.slug === state.last!.page);
  const total = pages.reduce((n, p) => n + p.checks, 0);
  const done = pages.reduce((n, p) => n + Math.min(p.checks, (state.done[p.slug] ?? []).length), 0);
  if (!lastPage && done === 0) return null;
  return (
    <div className="ui mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
      {total > 0 && (
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </span>
          {t.progress.steps(done, total)}
        </span>
      )}
      {lastPage && (
        <Link href={pageUrl(series, lastPage.slug, lastPage.locale)} className="inline-flex items-center gap-1 text-accent-ink hover:underline">
          {t.progress.resume}: {lastPage.title} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/* On a page card: its own checks. */
export function PageProgress({ series, slug, checks, locale }: { series: string; slug: string; checks: number; locale: Locale }) {
  const t = dict(locale);
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- from storage, after hydration
    setDone(Math.min(checks, (readSeriesProgress(series)[slug] ?? []).length));
  }, [series, slug, checks]);
  if (done === null || checks === 0 || done === 0) return null;
  return <span className={done === checks ? "text-ok" : "text-accent-ink"}>· {done === checks ? t.progress.complete : t.progress.steps(done, checks)}</span>;
}
