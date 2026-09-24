/* ──────────────────────────────────────────────────────────────
   Content loader (server side only)

   content/
     <series>/
       series.yaml                 title, summary, page order
       <page>/
         tuto.yaml                 contract: variables, choices, metadata
         page-en.mdx               prose, one file per locale
         page-fr.mdx

   Both locales are mandatory: a page missing one is a build error,
   not a fallback.
   ────────────────────────────────────────────────────────────── */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { LOCALES, SeriesContract, TutoContract, type Locale } from "@/engine";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export type PageRef = { series: string; slug: string };

export type Page = PageRef & {
  contract: TutoContract;
  /** Absolute folder of the page. */
  dir: string;
};

export type Series = {
  slug: string;
  contract: SeriesContract;
  pages: Page[];
};

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readYaml<T>(file: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const raw = await readFile(file, "utf8");
  try {
    return schema.parse(parseYaml(raw));
  } catch (err) {
    throw new Error(`Invalid ${path.relative(process.cwd(), file)}:\n${(err as Error).message}`);
  }
}

export function pageSourcePath(page: PageRef, locale: Locale): string {
  return path.join(CONTENT_DIR, page.series, page.slug, `page-${locale}.mdx`);
}

async function loadPage(series: string, slug: string): Promise<Page> {
  const dir = path.join(CONTENT_DIR, series, slug);
  const contract = await readYaml(path.join(dir, "tuto.yaml"), TutoContract);
  for (const locale of LOCALES) {
    const src = pageSourcePath({ series, slug }, locale);
    if (!(await exists(src))) throw new Error(`Missing ${path.relative(process.cwd(), src)} — every page needs every locale.`);
  }
  return { series, slug, contract, dir };
}

export async function loadSeries(slug: string): Promise<Series> {
  const dir = path.join(CONTENT_DIR, slug);
  const contract = await readYaml(path.join(dir, "series.yaml"), SeriesContract);
  const entries = await readdir(dir, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const pageFolders: string[] = [];
  for (const f of folders) if (await exists(path.join(dir, f, "tuto.yaml"))) pageFolders.push(f);

  const ordered = [...contract.order.filter((s) => pageFolders.includes(s)), ...pageFolders.filter((s) => !contract.order.includes(s)).sort()];
  const pages = await Promise.all(ordered.map((p) => loadPage(slug, p)));
  return { slug, contract, pages };
}

export async function listSeries(): Promise<Series[]> {
  if (!(await isDir(CONTENT_DIR))) return [];
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const out: Series[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (await exists(path.join(CONTENT_DIR, e.name, "series.yaml"))) out.push(await loadSeries(e.name));
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getPage(series: string, slug: string): Promise<Page | null> {
  try {
    return await loadPage(series, slug);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function readPageSource(page: PageRef, locale: Locale): Promise<string> {
  return readFile(pageSourcePath(page, locale), "utf8");
}

/** Previous / next page inside the same series. */
export async function neighbors(page: PageRef): Promise<{ prev?: Page; next?: Page; series: Series }> {
  const series = await loadSeries(page.series);
  const i = series.pages.findIndex((p) => p.slug === page.slug);
  return { prev: i > 0 ? series.pages[i - 1] : undefined, next: i >= 0 && i < series.pages.length - 1 ? series.pages[i + 1] : undefined, series };
}
