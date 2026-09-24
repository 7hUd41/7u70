"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PanelLeft } from "lucide-react";
import type { Level, Locale } from "@/engine";
import { dict } from "@/i18n";
import { LevelSwitch, LocaleSwitch, ThemeToggle } from "./controls";

export function Header({
  locale,
  path,
  crumbs = [],
  level,
  setLevel,
  outline,
}: {
  locale: Locale;
  /** Path without the locale prefix, for the language switch. */
  path: string;
  crumbs?: { href: string; label: string }[];
  level?: Level;
  setLevel?: (l: Level) => void;
  /** Outline toggle (wide screens only) and what replaces the outline when folded. */
  outline?: { open: boolean; toggle: () => void; folded?: ReactNode };
}) {
  const t = dict(locale);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5 lg:px-10">
        {outline && (
          <button
            type="button"
            onClick={outline.toggle}
            aria-pressed={outline.open}
            title={outline.open ? t.outline.hide : t.outline.show}
            aria-label={outline.open ? t.outline.hide : t.outline.show}
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
          {level && setLevel && <LevelSwitch level={level} setLevel={setLevel} locale={locale} />}
          <LocaleSwitch locale={locale} path={path} />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
