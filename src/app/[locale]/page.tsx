import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { isLocale } from "@/engine";
import { listSeries } from "@/content/loader";
import { dict } from "@/i18n";
import { Header } from "@/reader/Header";

export default async function Catalogue({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);
  const series = await listSeries();

  return (
    <>
      <Header locale={locale} path="" />
      <main className="mx-auto w-full max-w-6xl px-5 py-14">
        <h1 className="font-display text-[2.8rem] leading-[1.05] tracking-tight text-ink">{t.brand}</h1>
        <p className="mt-3 max-w-[60ch] text-[1.15rem] leading-relaxed text-ink-2">{t.tagline}</p>

        {series.map((s) => (
          <section key={s.slug} className="mt-14">
            <div className="mb-4 flex items-baseline gap-3">
              <span className="label">{t.series}</span>
              <h2 className="font-serif text-[1.5rem] font-semibold text-ink">
                <Link href={`/${locale}/${s.slug}`} className="hover:text-accent-ink">
                  {s.contract.title[locale]}
                </Link>
              </h2>
            </div>
            <p className="mb-6 max-w-[60ch] text-ink-2">{s.contract.summary[locale]}</p>
            <ol className="grid gap-3 sm:grid-cols-2">
              {s.pages.map((p, i) => (
                <li key={p.slug}>
                  <Link
                    href={`/${locale}/${s.slug}/${p.slug}`}
                    className="group flex h-full flex-col rounded-md border border-line bg-paper-2/60 p-5 transition hover:border-line-2 hover:bg-paper-2"
                  >
                    <span className="label mb-2 font-mono normal-case tracking-normal">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-serif text-[1.2rem] font-semibold leading-snug text-ink">{p.contract.title[locale]}</span>
                    <span className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{p.contract.summary[locale]}</span>
                    <span className="ui mt-4 flex items-center gap-2 text-[12.5px] text-ink-3">
                      {t.meta.difficulty[p.contract.difficulty]}
                      {p.contract.minutes && <span>· {t.meta.minutes(p.contract.minutes)}</span>}
                      <ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </>
  );
}
