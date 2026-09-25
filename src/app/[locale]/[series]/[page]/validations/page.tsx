import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/engine";
import { getPage, readValidations } from "@/content/loader";
import { dict } from "@/i18n";
import { Header } from "@/reader/Header";

type Params = { locale: string; series: string; page: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, series, page } = await params;
  if (!isLocale(locale)) return {};
  const p = await getPage(series, page);
  return p ? { title: `${dict(locale).validated.pageTitle} · ${p.contract.title[locale]}` } : {};
}

/* Everyone who validated this page, with the path they took. Choices only:
   the file never holds a reader's values. */
export default async function ValidationsPage({ params }: { params: Promise<Params> }) {
  const { locale, series, page: slug } = await params;
  if (!isLocale(locale)) notFound();
  const page = await getPage(series, slug);
  if (!page) notFound();
  const t = dict(locale);
  const list = (await readValidations(page)).sort((a, b) => b.at.localeCompare(a.at));

  const labelOf = (key: string, value: string | boolean): string => {
    const c = page.contract.choices.find((x) => x.key === key);
    if (!c) return `${key}=${String(value)}`;
    if (c.type === "boolean") return value ? c.label[locale] : `${t.validated.columns.stack}: ¬${c.label[locale]}`;
    return c.options.find((o) => o.value === value)?.label[locale] ?? String(value);
  };

  return (
    <>
      <Header locale={locale} crumbs={[{ href: `/${locale}/${series}/${slug}`, label: page.contract.title[locale] }]} />
      <main className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10">
        <h1 className="font-display text-[2.2rem] leading-[1.1] text-ink">{t.validated.pageTitle}</h1>
        <p className="mt-2 text-ink-2">
          {t.validated.pageIntro}{" "}
          <Link href={`/${locale}/${series}/${slug}`} className="underline hover:text-ink">
            {page.contract.title[locale]}
          </Link>
        </p>

        {list.length === 0 ? (
          <p className="ui mt-10 text-ink-3">{t.validated.empty}</p>
        ) : (
          <table className="ui mt-8 w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="label text-left">
                <th className="border-b border-line py-2 pr-4 font-normal">{t.validated.columns.when}</th>
                <th className="border-b border-line py-2 pr-4 font-normal">{t.validated.columns.who}</th>
                <th className="border-b border-line py-2 pr-4 font-normal">{t.validated.columns.stack}</th>
                <th className="border-b border-line py-2 pr-4 font-normal">{t.validated.columns.checks}</th>
                <th className="border-b border-line py-2 font-normal">{t.validated.columns.version}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.at + (v.by ?? "")} className="align-top">
                  <td className="whitespace-nowrap border-b border-line py-2.5 pr-4 text-ink-2">
                    {new Date(v.at).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="border-b border-line py-2.5 pr-4 font-mono text-[12.5px] text-ink">{v.by ?? t.validated.anonymous}</td>
                  <td className="border-b border-line py-2.5 pr-4">
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(v.choices)
                        .filter(([, val]) => val !== false)
                        .map(([k, val]) => (
                          <span key={k} className="rounded border border-line px-1.5 py-px text-[12px] text-ink-2">
                            {labelOf(k, val)}
                          </span>
                        ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line py-2.5 pr-4 font-mono text-[12.5px] text-ink-2">
                    {v.checks.total > 0 ? `${v.checks.done}/${v.checks.total}` : "—"}
                  </td>
                  <td className="border-b border-line py-2.5 font-mono text-[12.5px] text-ink-2">{v.version ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
