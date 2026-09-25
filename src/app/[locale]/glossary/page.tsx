import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, LOCALES } from "@/engine";
import { readGlossary } from "@/content/loader";
import { dict } from "@/i18n";
import { Header } from "@/reader/Header";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: dict(locale).glossary.title } : {};
}

/* Every term and abbreviation the site marks in its prose, alphabetically. */
export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);
  const entries = (await readGlossary()).sort((a, b) => a.term.localeCompare(b.term, locale, { sensitivity: "base" }));

  return (
    <>
      <Header locale={locale} path="/glossary" />
      <main className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10">
        <h1 className="font-display text-[2.2rem] leading-[1.1] text-ink">{t.glossary.title}</h1>
        <p className="mt-2 text-ink-2">{t.glossary.intro}</p>
        <dl className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-[minmax(0,200px)_1fr]">
          {entries.map((e) => (
            <div key={e.term} id={e.term} className="contents">
              <dt className="scroll-mt-20">
                <span className="ui font-bold text-ink">{e.term}</span>
                {e.expansion && <span className="ui block text-[12.5px] text-ink-3">{e.expansion[locale]}</span>}
                {e.aliases.length > 0 && <span className="ui block text-[12px] text-ink-3">{e.aliases.join(" · ")}</span>}
              </dt>
              <dd className="text-ink-2">{e.def[locale]}</dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  );
}
