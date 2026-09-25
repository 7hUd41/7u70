"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Palette, Sun } from "lucide-react";
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
            "rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1 text-[12.5px] transition " +
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

/* ── Skin: a whole look, independent of light/dark ─────────── */
export const SKINS = ["editorial", "parchment", "transit", "transit2", "slate", "night", "headline", "atom"] as const;
export type Skin = (typeof SKINS)[number];

/* Swatches shown in the menu: paper, ink, accent (light variant). */
const SWATCH: Record<Skin, [string, string, string]> = {
  editorial: ["#faf8f3", "#1c1a16", "#9a4a1c"],
  parchment: ["#f1e8d3", "#2c2118", "#9a4a1c"],
  transit: ["#fff3f8", "#1f1b3d", "#e0378f"],
  transit2: ["#ffffff", "#33333f", "#43a35d"],
  slate: ["#ffffff", "#2b2f3a", "#1f6f8b"],
  night: ["#0f1420", "#d6dae3", "#e6a84c"],
  headline: ["#ffffff", "#0a0a0a", "#c8102e"],
  atom: ["#282c34", "#d7dae0", "#61afef"],
};

function applySkin(s: Skin) {
  if (s === "editorial") delete document.documentElement.dataset.skin;
  else document.documentElement.dataset.skin = s;
  try {
    localStorage.setItem("skin", s);
  } catch {}
}

export function SkinMenu({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [skin, setSkin] = useState<Skin>("editorial");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Applied before paint by the inline script; sync the control.
    const current = document.documentElement.dataset.skin;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkin((SKINS as readonly string[]).includes(current ?? "") ? (current as Skin) : "editorial");
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={t.skin.title} aria-label={t.skin.title} className="rounded p-1.5 text-ink-3 hover:text-ink">
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40 cursor-pointer" onClick={() => setOpen(false)} />
          <ul role="menu" className="ui absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-line bg-paper p-1 shadow-soft">
            {SKINS.map((s) => (
              <li key={s} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={s === skin}
                  onClick={() => {
                    applySkin(s);
                    setSkin(s);
                    setOpen(false);
                  }}
                  className={"flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] " + (s === skin ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-full border border-line">
                    {SWATCH[s].map((c) => (
                      <span key={c} className="h-3.5 w-2.5" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex-1">{t.skin.names[s]}</span>
                  {s === skin && <span className="text-accent">●</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </span>
  );
}
