"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Compass, PanelLeft } from "lucide-react";
import type { Level, Locale } from "@/engine";
import { dict } from "@/i18n";
import { LevelSwitch, LocaleSwitch, SkinMenu, ThemeToggle } from "./controls";
import { SearchButton } from "./Search";

export function Header({
  locale,
  path,
  crumbs = [],
  level,
  setLevel,
  outline,
  hidden,
  onTour,
}: {
  locale: Locale;
  /** Path without the locale prefix, for the language switch. */
  path: string;
  crumbs?: { href: string; label: string }[];
  level?: Level;
  setLevel?: (l: Level) => void;
  /** Outline toggle (wide screens only) and what replaces the outline when folded. */
  outline?: { open: boolean; toggle: () => void; folded?: ReactNode };
  /** Slides out of view while the reader scrolls down. */
  hidden?: boolean;
  /** Starts the guided tour. */
  onTour?: () => void;
}) {
  const t = dict(locale);
  return (
    <header
      className={
        "sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur transition-transform duration-200 " +
        (hidden ? "-translate-y-full" : "")
      }
    >
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5 lg:px-10">
        {outline && (
          <button
            type="button"
            onClick={outline.toggle}
            aria-pressed={outline.open}
            title={outline.open ? t.outline.hide : t.outline.show}
            aria-label={outline.open ? t.outline.hide : t.outline.show}
            data-tour="outline-toggle"
            className={"hidden rounded p-1 xl:inline-flex " + (outline.open ? "text-ink" : "text-ink-3 hover:text-ink")}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        <nav className="ui flex min-w-0 items-center gap-2 text-[13px]">
          <Link href={`/${locale}`} className="font-bold text-ink">
            {t.brand}
          </Link>
          {crumbs.map((c) => (
            <span key={c.href} className="flex min-w-0 items-center gap-2">
              <span className="text-line-2">/</span>
              <Link href={c.href} className="truncate text-ink-2 hover:text-ink">
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
        {outline && !outline.open && <span className="hidden xl:inline-flex">{outline.folded}</span>}
        <div className="ml-auto flex items-center gap-3">
          <SearchButton locale={locale} />
          {level && setLevel && <LevelSwitch level={level} setLevel={setLevel} locale={locale} />}
          <LocaleSwitch locale={locale} path={path} />
          <ThemeToggle locale={locale} />
          <SkinMenu locale={locale} />
          {onTour && (
            <button type="button" onClick={onTour} title={t.tour.start} aria-label={t.tour.start} className="rounded p-1.5 text-ink-3 hover:text-ink">
              <Compass className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
