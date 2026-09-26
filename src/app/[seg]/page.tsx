import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { isLocale, LOCALES } from "@/engine";
import { countChecks, listSeries, loadSeries } from "@/content/loader";
import { dict } from "@/i18n";
import { Header } from "@/reader/Header";
import { LocaleSwitch } from "@/reader/controls";
import { PageProgress, SeriesProgress } from "@/reader/CatalogueProgress";
import { homeUrl, localeLinks, pageUrl } from "@/urls";

/* The first URL segment is either a language (/fr: the catalogue in French)
   or a series (/netbox: lands on its first article). */

export async function generateStaticParams() {
  const all = await listSeries();
  return [...LOCALES.map((seg) => ({ seg })), ...all.map((s) => ({ seg: s.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ seg: string }> }): Promise<Metadata> {
  const { seg } = await params;
  if (!isLocale(seg)) return {};
  const t = dict(seg);
  return { title: t.brand, description: t.tagline };
}

export default async function FirstSegment({ params }: { params: Promise<{ seg: string }> }) {
  const { seg } = await params;
  if (!isLocale(seg)) {
    let s;
    try {
      s = await loadSeries(seg);
    } catch {
      notFound();
    }
    if (!s || s.pages.length === 0) notFound();
    redirect(`/${seg}/${s.pages[0].slug}`);
  }
  const locale = seg;
  const t = dict(locale);
  const series = await listSeries();
  // Checks per page, in the language the card will open.
  const checks = new Map<string, number>();
  for (const s of series) for (const p of s.pages) checks.set(`${s.slug}/${p.slug}`, await countChecks(p, p.locales.includes(locale) ? locale : p.locales[0]));

  return (
    <>
      <Header locale={locale} />
      <main className="mx-auto w-full max-w-[100rem] px-6 py-14 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[2.8rem] leading-[1.05] tracking-tight text-ink">{t.brand}</h1>
            <p className="mt-3 max-w-[60ch] text-[1.15rem] leading-relaxed text-ink-2">{t.tagline}</p>
          </div>
          <LocaleSwitch locale={locale} links={localeLinks(homeUrl)} />
        </div>

        {series.map((s) => (
          <section key={s.slug} id={s.slug} className="mt-14 scroll-mt-20">
            <div className="mb-4 flex items-baseline gap-3">
              <span className="label">{t.series}</span>
              <h2 className="font-serif text-[1.5rem] font-semibold text-ink">{s.contract.title[locale]}</h2>
            </div>
            <p className="mb-4 max-w-[60ch] text-ink-2">{s.contract.summary[locale]}</p>
            <SeriesProgress
              series={s.slug}
              locale={locale}
              pages={s.pages.map((p) => {
                const l = p.locales.includes(locale) ? locale : p.locales[0];
                return { slug: p.slug, title: p.contract.title[locale], checks: checks.get(`${s.slug}/${p.slug}`) ?? 0, locale: l };
              })}
            />
            <ol className="grid gap-3 sm:grid-cols-2">
              {s.pages.map((p, i) => {
                // A page not written in this language links to the language it has, and says so.
                const inLocale = p.locales.includes(locale);
                const l = inLocale ? locale : p.locales[0];
                return (
                  <li key={p.slug}>
                    <Link
                      href={pageUrl(s.slug, p.slug, l)}
                      hrefLang={l}
                      className="group flex h-full flex-col rounded-md border border-line bg-paper-2/60 p-5 transition hover:border-line-2 hover:bg-paper-2"
                    >
                      <span className="label mb-2 flex items-center gap-2 font-mono normal-case tracking-normal">
                        {String(i + 1).padStart(2, "0")}
                        {!inLocale && <span className="rounded border border-line px-1 text-[10.5px] uppercase text-ink-3">{l}</span>}
                        {p.contract.status === "draft" && <span className="rounded border border-warn/50 px-1 text-[10.5px] normal-case text-warn">{t.draft.badge}</span>}
                      </span>
                      <span className="font-serif text-[1.2rem] font-semibold leading-snug text-ink">{p.contract.title[locale]}</span>
                      <span className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{p.contract.summary[locale]}</span>
                      <span className="ui mt-4 flex items-center gap-2 text-[12.5px] text-ink-3">
                        {t.meta.difficulty[p.contract.difficulty]}
                        {p.contract.minutes && <span>· {t.meta.minutes(p.contract.minutes)}</span>}
                        <PageProgress series={s.slug} slug={p.slug} checks={checks.get(`${s.slug}/${p.slug}`) ?? 0} locale={locale} />
                        <ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </main>
    </>
  );
}
