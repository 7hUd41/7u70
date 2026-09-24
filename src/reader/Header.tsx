"use client";

import Link from "next/link";
import type { Level, Locale } from "@/engine";
import { dict } from "@/i18n";
import { LevelSwitch, LocaleSwitch, ThemeToggle } from "./controls";

export function Header({
  locale,
  path,
  crumbs = [],
  level,
  setLevel,
}: {
  locale: Locale;
  /** Path without the locale prefix, for the language switch. */
  path: string;
  crumbs?: { href: string; label: string }[];
  level?: Level;
  setLevel?: (l: Level) => void;
}) {
  const t = dict(locale);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
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
        <div className="ml-auto flex items-center gap-3">
          {level && setLevel && <LevelSwitch level={level} setLevel={setLevel} locale={locale} />}
          <LocaleSwitch locale={locale} path={path} />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
