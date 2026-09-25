import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, LOCALES, type Locale } from "@/engine";
import { getPage, listSeries, neighbors, readDiagram, readGlossary, readPageSource, readValidations } from "@/content/loader";
import { site } from "@/site.config";
import { compileMdx } from "@/content/mdx";
import { mdxComponents } from "@/reader/mdx-components";
import { Reader } from "@/reader/Reader";

type Params = { locale: string; series: string; page: string };

export async function generateStaticParams() {
  const all = await listSeries();
  return LOCALES.flatMap((locale) => all.flatMap((s) => s.pages.filter((p) => p.locales.includes(locale)).map((p) => ({ locale, series: s.slug, page: p.slug }))));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, series, page } = await params;
  if (!isLocale(locale)) return {};
  const p = await getPage(series, page);
  return p ? { title: p.contract.title[locale], description: p.contract.summary[locale] } : {};
}

export default async function TutorialPage({ params }: { params: Promise<Params> }) {
  const { locale, series, page: slug } = await params;
  if (!isLocale(locale)) notFound();
  const page = await getPage(series, slug);
  if (!page || !page.locales.includes(locale)) notFound();

  const [source, nav, validations, diagram, glossary] = await Promise.all([
    readPageSource(page, locale),
    neighbors(page),
    readValidations(page),
    readDiagram(page),
    readGlossary(series),
  ]);
  const Content = await compileMdx(source, glossary);
  // A neighbour not written in this language links to the language it has.
  const href = (p: { slug: string; locales: Locale[] }) => `/${p.locales.includes(locale) ? locale : p.locales[0]}/${series}/${p.slug}`;

  return (
    <Reader
      id={`${series}/${slug}`}
      locale={locale}
      contract={page.contract}
      series={{ href: `/${locale}/${series}`, title: nav.series.contract.title[locale] }}
      path={`/${series}/${slug}`}
      slug={slug}
      locales={page.locales}
      prev={nav.prev && { href: href(nav.prev), title: nav.prev.contract.title[locale] }}
      next={nav.next && { href: href(nav.next), title: nav.next.contract.title[locale] }}
      validations={validations}
      diagram={diagram}
      glossary={glossary}
      canValidate={site.authorMode}
      tourOnFirstVisit={series === "example"}
    >
      <Content components={mdxComponents} />
    </Reader>
  );
}
