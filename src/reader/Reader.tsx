"use client";

/* Page shell for a tutorial. Content first: the prose column starts at
   the top; the reader's context and the outline live in the margin. */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale, TutoContract } from "@/engine";
import { StackPanel, ValuesPanel } from "./ContextPanel";
import { Header } from "./Header";
import { Outline } from "./Outline";
import { ReaderProvider, useReader } from "./store";
import { Toolbar } from "./Toolbar";
import { VarEditor } from "./VarEditor";

export type PageLink = { href: string; title: string };

export type ReaderProps = {
  id: string;
  locale: Locale;
  contract: TutoContract;
  series: { href: string; title: string };
  path: string;
  slug: string;
  prev?: PageLink;
  next?: PageLink;
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
  return <div className="progress-line fixed inset-x-0 top-0 z-40" style={{ transform: `scaleX(${pct})` }} />;
}

function Meta() {
  const { contract, locale, t } = useReader();
  const parts: string[] = [t.meta.difficulty[contract.difficulty]];
  if (contract.minutes) parts.push(t.meta.minutes(contract.minutes));
  if (contract.validated) parts.push(t.meta.validated(contract.validated));
  if (contract.created) parts.push(new Date(contract.created).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }));
  return (
    <p className="ui mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          {p}
        </span>
      ))}
      {contract.tags.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {contract.tags.map((tag) => (
            <span key={tag} className="rounded border border-line px-1.5 py-px text-[11.5px]">
              {tag}
            </span>
          ))}
        </span>
      )}
    </p>
  );
}

function Frame(props: ReaderProps) {
  const { level, setLevel, contract, locale, t } = useReader();
  return (
    <>
      <ReadingLine />
      <Header
        locale={locale}
        path={props.path}
        crumbs={[{ href: props.series.href, label: props.series.title }]}
        level={level}
        setLevel={setLevel}
      />
      <div className="mx-auto grid w-full max-w-[100rem] gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
        <main className="min-w-0">
          <h1 className="font-display text-[2.4rem] leading-[1.1] tracking-tight text-ink">{contract.title[locale]}</h1>
          <p className="mt-3 max-w-[68ch] text-[1.1rem] leading-relaxed text-ink-2">{contract.summary[locale]}</p>
          <Meta />
          <div className="mt-6 border-b border-line pb-5">
            <Toolbar title={contract.title[locale]} slug={props.slug} />
          </div>
          <article className="prose doc-body" data-level={level}>
            {props.children}
          </article>
          {(props.prev || props.next) && (
            <nav className="ui mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
              {props.prev ? (
                <Link href={props.prev.href} className="group rounded-md border border-line p-4 transition hover:border-line-2">
                  <span className="mb-1 flex items-center gap-1 text-[12px] text-ink-3">
                    <ArrowLeft className="h-3.5 w-3.5" /> {t.nav.prev}
                  </span>
                  <span className="font-serif text-[15px] text-ink">{props.prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {props.next && (
                <Link href={props.next.href} className="group rounded-md border border-line p-4 text-right transition hover:border-accent">
                  <span className="mb-1 flex items-center justify-end gap-1 text-[12px] text-ink-3">
                    {t.nav.next} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-serif text-[15px] text-ink">{props.next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </main>
        <aside>
          {/* Reading order: what is the path → which path is mine → my values. */}
          <div className="space-y-8 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
            <Outline />
            <StackPanel />
            <ValuesPanel />
          </div>
        </aside>
      </div>
      <VarEditor />
    </>
  );
}

export function Reader(props: ReaderProps) {
  return (
    <ReaderProvider id={props.id} locale={props.locale} contract={props.contract}>
      <Frame {...props} />
    </ReaderProvider>
  );
}
