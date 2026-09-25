"use client";

/* The bare article URL: pick the language and go. The reader's last language
   wins, then the browser's, then the first one the page is written in. A
   list of links stays for the second it takes, and for anyone without JS. */

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLocale, type Locale, type Localized } from "@/engine";
import { dict } from "@/i18n";
import { LANG_KEY, pageUrl } from "@/urls";

export function LangLanding({ series, page, locales, titles }: { series: string; page: string; locales: Locale[]; titles: Localized }) {
  const router = useRouter();
  useEffect(() => {
    let wanted: string | null = null;
    try {
      wanted = localStorage.getItem(LANG_KEY);
    } catch {}
    const browser = (navigator.language || "").slice(0, 2);
    const pick = [wanted, browser].find((l): l is Locale => isLocale(l) && locales.includes(l)) ?? locales[0];
    router.replace(pageUrl(series, page, pick));
  }, [router, series, page, locales]);
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <ul className="space-y-2">
        {locales.map((l) => (
          <li key={l}>
            <Link href={pageUrl(series, page, l)} hrefLang={l} className="text-accent-ink underline">
              {dict(l).locale[l]} — {titles[l]}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
