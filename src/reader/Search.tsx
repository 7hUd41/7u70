"use client";

/* Search palette: "/" or ⌘K opens it. With no query it browses every page
   by series; with one it ranks sections (heading > title > text). Filters
   by series and tag on the right, glossary link at the bottom. Rendered
   in a portal on <body>: the header's backdrop filter would otherwise trap
   a fixed element inside it. */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookA, Search as SearchIcon } from "lucide-react";
import type { Locale } from "@/engine";
import { dict } from "@/i18n";
import type { IndexEntry } from "@/content/search-index";

type Hit = { entry: IndexEntry; sectionId: string; heading: string; snippet: string; score: number };

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function snippetAround(text: string, term: string, width = 110): string {
  const i = norm(text).indexOf(term);
  if (i < 0) return text.slice(0, width) + (text.length > width ? "…" : "");
  const start = Math.max(0, i - width / 3);
  const end = Math.min(text.length, i + term.length + (width * 2) / 3);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export function search(index: IndexEntry[], query: string, limit = 12): Hit[] {
  const terms = norm(query).split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return [];
  const hits: Hit[] = [];
  for (const entry of index) {
    const title = norm(entry.title);
    for (const sec of entry.sections) {
      const heading = norm(sec.heading);
      const text = norm(sec.text);
      let score = 0;
      let first = "";
      for (const t of terms) {
        const inHeading = heading.includes(t);
        const inTitle = title.includes(t);
        const occurrences = text.split(t).length - 1;
        if (!inHeading && !inTitle && occurrences === 0) {
          score = 0;
          break;
        }
        score += (inHeading ? 6 : 0) + (inTitle ? 3 : 0) + Math.min(occurrences, 5);
        if (!first && occurrences > 0) first = t;
      }
      if (score > 0) hits.push({ entry, sectionId: sec.id, heading: sec.heading, snippet: snippetAround(sec.text, first || terms[0]), score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function SearchButton({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${t.search.open} (/)`}
        aria-label={t.search.open}
        className="ui inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[12.5px] text-ink-3 hover:text-ink"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t.search.open}</span>
        <kbd className="hidden rounded border border-line px-1 font-mono text-[10.5px] sm:inline">/</kbd>
      </button>
      {open && createPortal(<SearchPalette locale={locale} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function SearchPalette({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = dict(locale);
  const router = useRouter();
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [series, setSeries] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/${locale}/search-index.json`)
      .then((r) => r.json())
      .then((data: IndexEntry[]) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Escape closes from anywhere, not only from the input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => (index ?? []).filter((e) => (!series || e.series === series) && (!tag || e.tags.includes(tag))), [index, series, tag]);
  const hits = useMemo(() => search(filtered, q), [filtered, q]);
  const browsing = q.trim().length < 2;

  // Counts for the filter lists, from the whole index so a filter never hides its siblings.
  const seriesList = useMemo(() => {
    const m = new Map<string, { title: string; n: number }>();
    for (const e of index ?? []) m.set(e.series, { title: e.seriesTitle, n: (m.get(e.series)?.n ?? 0) + 1 });
    return [...m.entries()];
  }, [index]);
  const tagList = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of index ?? []) for (const x of e.tags) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [index]);

  const goPage = (e: IndexEntry, sectionId = "") => {
    onClose();
    router.push(`/${locale}/${e.series}/${e.page}${sectionId ? `#${sectionId}` : ""}`);
  };

  const rows = browsing ? filtered.map((e) => ({ key: `${e.series}/${e.page}`, entry: e, sectionId: "", heading: "", snippet: e.summary })) : hits.map((h) => ({ key: `${h.entry.series}/${h.entry.page}#${h.sectionId}`, ...h }));

  return (
    <div
      className="fixed inset-0 z-[70] flex cursor-pointer items-start justify-center bg-ink/40 p-4 pt-[10vh]"
      onClick={onClose}
      title={t.search.close}
      role="dialog"
      aria-modal
      aria-label={t.search.open}
    >
      <div className="ui grid w-full max-w-3xl cursor-default overflow-hidden rounded-md border border-line bg-paper shadow-soft sm:grid-cols-[minmax(0,1fr)_200px]" onClick={(e) => e.stopPropagation()} title="">
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <SearchIcon className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              ref={input}
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") setSel((s) => Math.min(rows.length - 1, s + 1));
                else if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
                else if (e.key === "Enter" && rows[sel]) goPage(rows[sel].entry, rows[sel].sectionId);
              }}
              placeholder={t.search.placeholder}
              className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
            />
            <kbd className="rounded border border-line px-1 font-mono text-[10.5px] text-ink-3">esc</kbd>
          </div>
          <ul className="max-h-[56vh] overflow-y-auto py-1">
            {index === null && <li className="px-4 py-3 text-[13px] text-ink-3">{t.search.loading}</li>}
            {index !== null && rows.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">{t.search.empty}</li>}
            {browsing && rows.length > 0 && <li className="label px-4 pb-1 pt-2">{t.search.browse}</li>}
            {rows.map((r, i) => (
              <li key={r.key}>
                <button
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => goPage(r.entry, r.sectionId)}
                  className={"block w-full px-4 py-2.5 text-left transition " + (i === sel ? "bg-paper-2" : "hover:bg-paper-2/60")}
                >
                  <span className="label block">
                    {r.entry.seriesTitle}
                    {!browsing && ` / ${r.entry.title}`}
                  </span>
                  <span className="block font-serif text-[15px] text-ink">{browsing ? r.entry.title : r.heading || r.entry.title}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-2">{r.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[12.5px]">
            <Link href={`/${locale}/glossary`} onClick={onClose} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <BookA className="h-3.5 w-3.5" /> {t.search.glossary}
            </Link>
            <span className="text-ink-3">↑↓ · ⏎ · esc</span>
          </div>
        </div>

        <aside className="hidden border-l border-line bg-paper-2/50 p-3 sm:block">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="label">{t.search.filters}</span>
            {(series || tag) && (
              <button
                type="button"
                onClick={() => {
                  setSeries(null);
                  setTag(null);
                }}
                className="text-[11.5px] text-accent-ink hover:underline"
              >
                {t.search.clear}
              </button>
            )}
          </div>
          <span className="label mb-1 block text-[10.5px]">{t.search.bySeries}</span>
          <ul className="mb-4 space-y-0.5">
            {seriesList.map(([slug, s]) => (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => setSeries(series === slug ? null : slug)}
                  className={"flex w-full items-center justify-between rounded px-1.5 py-1 text-[12.5px] " + (series === slug ? "bg-accent-soft text-ink" : "text-ink-2 hover:text-ink")}
                >
                  <span className="truncate">{s.title}</span>
                  <span className="text-ink-3">{s.n}</span>
                </button>
              </li>
            ))}
          </ul>
          <span className="label mb-1 block text-[10.5px]">{t.search.byTag}</span>
          <ul className="space-y-0.5">
            {tagList.map(([x, n]) => (
              <li key={x}>
                <button
                  type="button"
                  onClick={() => setTag(tag === x ? null : x)}
                  className={"flex w-full items-center justify-between rounded px-1.5 py-1 text-[12.5px] " + (tag === x ? "bg-accent-soft text-ink" : "text-ink-2 hover:text-ink")}
                >
                  <span className="truncate">{x}</span>
                  <span className="text-ink-3">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
