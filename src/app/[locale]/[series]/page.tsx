import { redirect, notFound } from "next/navigation";
import { isLocale } from "@/engine";
import { loadSeries } from "@/content/loader";

/* A series has no page of its own yet: land on its first tutorial. */
export default async function SeriesPage({ params }: { params: Promise<{ locale: string; series: string }> }) {
  const { locale, series } = await params;
  if (!isLocale(locale)) notFound();
  let s;
  try {
    s = await loadSeries(series);
  } catch {
    notFound();
  }
  if (!s || s.pages.length === 0) notFound();
  redirect(`/${locale}/${series}/${s.pages[0].slug}`);
}
