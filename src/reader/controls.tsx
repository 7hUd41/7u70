"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { LEVELS, LOCALES, type Level, type Locale } from "@/engine";
import { dict } from "@/i18n";

/* ── Reading depth ─────────────────────────────────────────── */
export function LevelSwitch({ level, setLevel, locale }: { level: Level; setLevel: (l: Level) => void; locale: Locale }) {
  const t = dict(locale);
  return (
    <div role="radiogroup" aria-label="Reading depth" data-tour="levels" className="ui inline-flex rounded-md border border-line bg-paper-2 p-0.5">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={level === l}
          title={t.levels[l].hint}
          onClick={() => setLevel(l)}
          className={
            "rounded px-2.5 py-1 text-[12.5px] transition " +
            (level === l ? "bg-paper text-ink shadow-soft" : "text-ink-3 hover:text-ink")
          }
        >
          {t.levels[l].label}
        </button>
      ))}
    </div>
  );
}

/* ── Light / dark ──────────────────────────────────────────── */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // The theme was applied before paint by the inline script; sync the icon.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button type="button" onClick={toggle} title={theme === "dark" ? t.theme.light : t.theme.dark} className="rounded p-1.5 text-ink-3 hover:text-ink">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* ── EN / FR, same page ────────────────────────────────────── */
export function LocaleSwitch({ locale, path }: { locale: Locale; path: string }) {
  return (
    <nav aria-label="Language" data-tour="locale" className="ui inline-flex items-center gap-1 text-[12.5px]">
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-line-2">/</span>}
          <Link
            href={`/${l}${path}`}
            hrefLang={l}
            aria-current={l === locale ? "page" : undefined}
            className={l === locale ? "text-ink" : "text-ink-3 hover:text-ink"}
          >
            {l.toUpperCase()}
          </Link>
        </span>
      ))}
    </nav>
  );
}
