import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, LOCALES } from "@/engine";
import { getPage, listSeries, neighbors, readDiagram, readPageSource, readValidations } from "@/content/loader";
import { site } from "@/site.config";
import { compileMdx } from "@/content/mdx";
import { mdxComponents } from "@/reader/mdx-components";
import { Reader } from "@/reader/Reader";

type Params = { locale: string; series: string; page: string };

export async function generateStaticParams() {
  const all = await listSeries();
  return LOCALES.flatMap((locale) => all.flatMap((s) => s.pages.map((p) => ({ locale, series: s.slug, page: p.slug }))));
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
  if (!page) notFound();

  const [source, nav, validations, diagram] = await Promise.all([readPageSource(page, locale), neighbors(page), readValidations(page), readDiagram(page)]);
  const Content = await compileMdx(source);
  const href = (s: string) => `/${locale}/${series}/${s}`;

  return (
    <Reader
      id={`${series}/${slug}`}
      locale={locale}
      contract={page.contract}
      series={{ href: `/${locale}/${series}`, title: nav.series.contract.title[locale] }}
      path={`/${series}/${slug}`}
      slug={slug}
      prev={nav.prev && { href: href(nav.prev.slug), title: nav.prev.contract.title[locale] }}
      next={nav.next && { href: href(nav.next.slug), title: nav.next.contract.title[locale] }}
      validations={validations}
      diagram={diagram}
      canValidate={site.authorMode}
      tourOnFirstVisit={series === "example"}
    >
      <Content components={mdxComponents} />
    </Reader>
  );
}
