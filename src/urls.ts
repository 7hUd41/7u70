/* ──────────────────────────────────────────────────────────────
   URLs
   Languages live at the article level: a page is written in one or
   several languages, so its language is the last segment.
     /en, /fr                          catalogue, in that language
     /en/glossary                      site pages, likewise
     /netbox                           a series: lands on its first page
     /netbox/install-from-scratch      an article: lands on the reader's language
     /netbox/install-from-scratch/fr   the article, in French
     /netbox/install-from-scratch/fr/validations
   ────────────────────────────────────────────────────────────── */

import { LOCALES, type Locale } from "@/engine";

export const homeUrl = (locale: Locale) => `/${locale}`;
export const glossaryUrl = (locale: Locale) => `/${locale}/glossary`;
export const searchIndexUrl = (locale: Locale) => `/${locale}/search-index.json`;
export const seriesUrl = (series: string) => `/${series}`;
/** The series' section on the catalogue, in the reader's language. */
export const seriesInCatalogueUrl = (locale: Locale, series: string) => `/${locale}#${series}`;
export const pageUrl = (series: string, page: string, locale: Locale) => `/${series}/${page}/${locale}`;
export const validationsUrl = (series: string, page: string, locale: Locale) => `/${series}/${page}/${locale}/validations`;

/** Where the reader last read; the bare article URL lands there. */
export const LANG_KEY = "at:lang";

export type LocaleLink = { locale: Locale; href: string };
/** The same page in each language it exists in: plain data, safe to hand to a client component. */
export function localeLinks(hrefFor: (l: Locale) => string, locales: readonly Locale[] = LOCALES): LocaleLink[] {
  return locales.map((locale) => ({ locale, href: hrefFor(locale) }));
}
