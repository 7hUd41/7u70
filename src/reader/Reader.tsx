"use client";

/* Page shell for a tutorial. Content first: the prose column starts at
   the top; the reader's context and the outline live in the margin. */

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, FlaskConical } from "lucide-react";
import {
  LEVELS,
  type DiagramSpec,
  type GlossaryEntry,
  type Locale,
  type TutoContract,
  type Validation,
} from "@/engine";
import { GlossaryTips } from "./GlossaryTips";
import { PrintSummary, PrintSupport } from "./Print";
import { Gist } from "./Diagram";
import { useRouter } from "next/navigation";
import { ValidatePanel, ValidationLine, useValidations } from "./Validation";
import { StackPanel, ValuesPanel } from "./ContextPanel";
import { Header } from "./Header";
import { Outline, ProgressPill } from "./Outline";
import { ReaderProvider, useReader } from "./store";
import { LocaleSwitch } from "./controls";
import { localeLinks, pageUrl, validationsUrl } from "@/urls";
import { Toolbar } from "./Toolbar";
import { Tour, TOUR_DONE_KEY } from "./Tour";
import { VarEditor } from "./VarEditor";
import { ImportedNotice } from "./Carry";
import { StuckLinks } from "./Stuck";

export type PageLink = { href: string; title: string };

export type ReaderProps = {
  id: string;
  locale: Locale;
  contract: TutoContract;
  series: { slug: string; href: string; title: string };
  slug: string;
  prev?: PageLink;
  next?: PageLink;
  validations: Validation[];
  diagram: DiagramSpec | null;
  glossary: GlossaryEntry[];
  /** Languages this page is written in. */
  locales: Locale[];
  canValidate: boolean;
  /** Start the tour on the reader's first visit of this page. */
  tourOnFirstVisit?: boolean;
  children: ReactNode;
};

function ReadingLine() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="progress-line fixed inset-x-0 top-0 z-40 print:hidden"
      style={{ transform: `scaleX(${pct})` }}
    />
  );
}

/* Under the summary: what kind of page this is (difficulty, time, date),
   its tags, and the languages it is written in. */
const DIFFICULTY_DOT = {
  beginner: "bg-ok",
  intermediate: "bg-accent",
  advanced: "bg-warn",
} as const;

function Meta({ locales, series, slug }: { locales: Locale[]; series: string; slug: string }) {
  const { contract, locale, t } = useReader();
  return (
    <div className="ui mt-4 space-y-2 text-[12.5px] text-ink-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-2 px-2.5 py-0.5">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " + DIFFICULTY_DOT[contract.difficulty]
            }
            aria-hidden
          />
          {t.meta.difficulty[contract.difficulty]}
        </span>
        {contract.minutes && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            {t.meta.minutes(contract.minutes)}
          </span>
        )}
        {contract.created && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            <time dateTime={contract.created}>
              {new Date(contract.created).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </span>
        )}
        <span className="ml-auto">
          <LocaleSwitch locale={locale} links={localeLinks((l) => pageUrl(series, slug, l), locales)} />
        </span>
      </div>
      {contract.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-ink-3">
          {contract.tags.map((tag) => (
            <span key={tag} className="font-mono text-[11.5px]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* Pages written but not yet run end to end by their author say so, loudly. */
function DraftNotice() {
  const { t } = useReader();
  return (
    <div role="note" className="ui mt-4 flex gap-3 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-[13px] leading-snug text-ink">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
      <p>
        <strong className="font-bold">{t.draft.title}.</strong> {t.draft.body}
      </p>
    </div>
  );
}

const OUTLINE_KEY = "at:outline";

/* True while scrolling down past the top; false as soon as the reader scrolls up. */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last + 4 && y > 120) setHidden(true);
      else if (y < last - 4 || y <= 0) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

function Frame(props: ReaderProps) {
  const { level, setLevel, contract, locale, t } = useReader();
  const [outlineOpen, setOutlineOpen] = useState(true);
  const headerHidden = useHideOnScroll();
  const validations = useValidations(props.validations);
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (!props.tourOnFirstVisit) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- first-visit check from storage
      if (!localStorage.getItem(TOUR_DONE_KEY)) setTourOpen(true);
    } catch {}
  }, [props.tourOnFirstVisit]);
  const toggleOutline = () => {
    setOutlineOpen((o) => {
      try {
        localStorage.setItem(OUTLINE_KEY, o ? "closed" : "open");
      } catch {}
      return !o;
    });
  };

  /* Keyboard shortcuts (ignored while typing): 1–4 levels, [ ] previous/next
     page, t outline, ? tour. "/" is reserved for search. */
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (tourOpen) return;
      const n = Number(e.key);
      if (n >= 1 && n <= LEVELS.length) return setLevel(LEVELS[n - 1]);
      if (e.key === "[" && props.prev) return router.push(props.prev.href);
      if (e.key === "]" && props.next) return router.push(props.next.href);
      if (e.key === "t") return toggleOutline();
      if (e.key === "?") return setTourOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourOpen, props.prev?.href, props.next?.href]);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_DONE_KEY, "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from storage
      if (localStorage.getItem(OUTLINE_KEY) === "closed") setOutlineOpen(false);
    } catch {}
  }, []);
  return (
    <>
      <ReadingLine />
      <Header
        locale={locale}
        crumbs={[{ href: props.series.href, label: props.series.title }]}
        level={level}
        setLevel={setLevel}
        outline={{
          open: outlineOpen,
          toggle: toggleOutline,
          folded: <ProgressPill />,
        }}
        hidden={headerHidden}
        onTour={() => setTourOpen(true)}
      />
      {/* Wide screens: outline left (where am I), content, context right (what is mine).
          Narrower: context column only, outline on top. */}
      <div
        className={
          "mx-auto grid w-full max-w-[100rem] gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 " +
          (outlineOpen ? "xl:grid-cols-[220px_minmax(0,1fr)_320px]" : "")
        }
      >
        {outlineOpen && (
          <aside className="hidden xl:block print:hidden">
            <div className="sidebar-scroll sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-4">
              <Outline />
            </div>
          </aside>
        )}
        <main className="min-w-0">
          <PrintSummary />
          <h1 className="font-display text-[2.4rem] leading-[1.1] tracking-tight text-ink">
            {contract.title[locale]}
          </h1>
          <p className="mt-3 text-[1.1rem] leading-relaxed text-ink-2">
            {contract.summary[locale]}
          </p>
          <Meta locales={props.locales} series={props.series.slug} slug={props.slug} />
          <ValidationLine
            list={validations.list}
            href={validationsUrl(props.series.slug, props.slug, locale)}
          />
          <ImportedNotice />
          {contract.status === "draft" && <DraftNotice />}
          {props.diagram && <Gist spec={props.diagram} />}
          <div className="mt-6 border-b border-line pb-5 print:hidden">
            <Toolbar title={contract.title[locale]} slug={props.slug} />
          </div>
          <article className="prose doc-body" data-level={level}>
            {props.children}
          </article>
          <StuckLinks title={contract.title[locale]} />
          <ValidatePanel
            series={props.id.split("/")[0]}
            slug={props.slug}
            onAdded={validations.add}
            canValidate={props.canValidate}
          />
          {(props.prev || props.next) && (
            <nav className="ui mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2 print:hidden">
              {props.prev ? (
                <Link
                  href={props.prev.href}
                  className="group rounded-md border border-line p-4 transition hover:border-line-2"
                >
                  <span className="mb-1 flex items-center gap-1 text-[12px] text-ink-3">
                    <ArrowLeft className="h-3.5 w-3.5" /> {t.nav.prev}
                  </span>
                  <span className="font-serif text-[15px] text-ink">
                    {props.prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {props.next && (
                <Link
                  href={props.next.href}
                  className="group rounded-md border border-line p-4 text-right transition hover:border-accent"
                >
                  <span className="mb-1 flex items-center justify-end gap-1 text-[12px] text-ink-3">
                    {t.nav.next} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-serif text-[15px] text-ink">
                    {props.next.title}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </main>
        <aside className="print:hidden">
          <div className="sidebar-scroll space-y-8 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-5">
            <div className="xl:hidden">
              <Outline />
            </div>
            <StackPanel />
            <ValuesPanel />
          </div>
        </aside>
      </div>
      <VarEditor />
      <GlossaryTips entries={props.glossary} />
      <PrintSupport />
      <Tour open={tourOpen} onClose={closeTour} />
    </>
  );
}

export function Reader(props: ReaderProps) {
  return (
    <ReaderProvider
      id={props.id}
      locale={props.locale}
      contract={props.contract}
    >
      <Frame {...props} />
    </ReaderProvider>
  );
}
