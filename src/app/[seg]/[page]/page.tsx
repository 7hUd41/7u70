import { notFound } from "next/navigation";
import { getPage, listSeries } from "@/content/loader";
import { LangLanding } from "@/reader/LangLanding";

/* /netbox/install-from-scratch, no language: land on the one the reader
   last read, else the browser's, else the first the page is written in.
   Decided in the browser, so the page works as a static file. */

export async function generateStaticParams() {
  const all = await listSeries();
  return all.flatMap((s) => s.pages.map((p) => ({ seg: s.slug, page: p.slug })));
}

export default async function ArticleLanding({ params }: { params: Promise<{ seg: string; page: string }> }) {
  const { seg, page: slug } = await params;
  const page = await getPage(seg, slug);
  if (!page) notFound();
  return <LangLanding series={seg} page={slug} locales={page.locales} titles={page.contract.title} />;
}
