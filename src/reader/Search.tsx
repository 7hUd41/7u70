"use client";

/* Search palette: "/" or ⌘K opens it, the index loads on first use, results
   are sections of pages ranked by where the terms appear (heading > title >
   text). Enter goes to the section. No dependency: a few dozen lines are
   enough for a few hundred pages. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
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
      {open && <SearchPalette locale={locale} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchPalette({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = dict(locale);
  const router = useRouter();
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
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

  const hits = useMemo(() => (index ? search(index, q) : []), [index, q]);
  const go = (h: Hit) => {
    onClose();
    router.push(`/${locale}/${h.entry.series}/${h.entry.page}${h.sectionId ? `#${h.sectionId}` : ""}`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/40 p-4 pt-[12vh]" onClick={onClose} role="dialog" aria-modal aria-label={t.search.open}>
      <div className="ui w-full max-w-xl overflow-hidden rounded-md border border-line bg-paper shadow-soft" onClick={(e) => e.stopPropagation()}>
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
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") setSel((s) => Math.min(hits.length - 1, s + 1));
              else if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
              else if (e.key === "Enter" && hits[sel]) go(hits[sel]);
            }}
            placeholder={t.search.placeholder}
            className="w-full bg-transparent py-3 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <kbd className="rounded border border-line px-1 font-mono text-[10.5px] text-ink-3">esc</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {index === null && <li className="px-4 py-3 text-[13px] text-ink-3">{t.search.loading}</li>}
          {index !== null && q.trim().length >= 2 && hits.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">{t.search.empty}</li>}
          {hits.map((h, i) => (
            <li key={`${h.entry.series}/${h.entry.page}#${h.sectionId}`}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(h)}
                className={"block w-full px-4 py-2.5 text-left transition " + (i === sel ? "bg-paper-2" : "hover:bg-paper-2/60")}
              >
                <span className="label block">
                  {h.entry.seriesTitle} / {h.entry.title}
                </span>
                {h.heading && <span className="block font-serif text-[15px] text-ink">{h.heading}</span>}
                <span className="block text-[12.5px] leading-snug text-ink-2">{h.snippet}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
