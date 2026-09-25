/* ──────────────────────────────────────────────────────────────
   Content loader (server side only)

   content/
     <series>/
       series.yaml                 title, summary, page order
       <page>/
         tuto.yaml                 contract: variables, choices, metadata
         page-en.mdx               prose, one file per locale
         page-fr.mdx

   A page exists in the languages it has a prose file for: some are
   written in English only, some translated later. At least one file
   is required; the reader is offered the languages that exist.
   ────────────────────────────────────────────────────────────── */

import { appendFile, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { DiagramSpec, Glossary, inherit, LOCALES, PageContract, SeriesContract, Validation, Validations, type GlossaryEntry, type TutoContract, type Locale } from "@/engine";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export type PageRef = { series: string; slug: string };

export type Page = PageRef & {
  contract: TutoContract;
  /** Absolute folder of the page. */
  dir: string;
  /** Languages this page is written in, in site order. */
  locales: Locale[];
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

async function readSeriesContract(series: string): Promise<SeriesContract> {
  return readYaml(path.join(CONTENT_DIR, series, "series.yaml"), SeriesContract);
}

async function loadPage(series: string, slug: string, seriesContract?: SeriesContract): Promise<Page> {
  const dir = path.join(CONTENT_DIR, series, slug);
  const own = await readYaml(path.join(dir, "tuto.yaml"), PageContract);
  let contract: TutoContract;
  try {
    contract = inherit(seriesContract ?? (await readSeriesContract(series)), own);
  } catch (err) {
    throw new Error(`Invalid ${path.relative(process.cwd(), path.join(dir, "tuto.yaml"))}:\n${(err as Error).message}`);
  }
  const locales: Locale[] = [];
  for (const locale of LOCALES) if (await exists(pageSourcePath({ series, slug }, locale))) locales.push(locale);
  if (locales.length === 0) throw new Error(`${path.relative(process.cwd(), dir)}: no page-<lang>.mdx — a page needs at least one language.`);
  return { series, slug, contract, dir, locales };
}

export async function loadSeries(slug: string): Promise<Series> {
  const dir = path.join(CONTENT_DIR, slug);
  const contract = await readSeriesContract(slug);
  const entries = await readdir(dir, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const pageFolders: string[] = [];
  for (const f of folders) if (await exists(path.join(dir, f, "tuto.yaml"))) pageFolders.push(f);

  const ordered = [...contract.order.filter((s) => pageFolders.includes(s)), ...pageFolders.filter((s) => !contract.order.includes(s)).sort()];
  const pages = await Promise.all(ordered.map((p) => loadPage(slug, p, contract)));
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

/** How many <Check> a page carries in a language (all branches counted). */
export async function countChecks(page: PageRef, locale: Locale): Promise<number> {
  const src = await readPageSource(page, locale);
  return (src.match(/<Check\b/g) ?? []).length;
}

/** Previous / next page inside the same series. */
export async function neighbors(page: PageRef): Promise<{ prev?: Page; next?: Page; series: Series }> {
  const series = await loadSeries(page.series);
  const i = series.pages.findIndex((p) => p.slug === page.slug);
  return { prev: i > 0 ? series.pages[i - 1] : undefined, next: i >= 0 && i < series.pages.length - 1 ? series.pages[i + 1] : undefined, series };
}

/* ── Validations: one YAML list per page, append-only ─────────── */
function validationsPath(page: PageRef): string {
  return path.join(CONTENT_DIR, page.series, page.slug, "validations.yaml");
}

export async function readValidations(page: PageRef): Promise<Validation[]> {
  const file = validationsPath(page);
  if (!(await exists(file))) return [];
  const raw = await readFile(file, "utf8");
  const data = parseYaml(raw);
  if (data == null) return [];
  try {
    return Validations.parse(data);
  } catch (err) {
    throw new Error(`Invalid ${path.relative(process.cwd(), file)}:\n${(err as Error).message}`);
  }
}

export async function appendValidation(page: PageRef, v: Validation): Promise<void> {
  const file = validationsPath(page);
  const entry = stringifyYaml([v]);
  const head = (await exists(file)) ? "" : "# Human validations of this page, append-only. Choices only, never values.\n";
  await appendFile(file, head + entry, "utf8");
}

/* ── Diagram: optional diagram.yaml next to the page ─────────── */
export async function readDiagram(page: PageRef): Promise<DiagramSpec | null> {
  const file = path.join(CONTENT_DIR, page.series, page.slug, "diagram.yaml");
  if (!(await exists(file))) return null;
  return readYaml(file, DiagramSpec);
}

/* ── Glossary: content/glossary.yaml + content/<series>/glossary.yaml ── */
export async function readGlossary(series?: string): Promise<GlossaryEntry[]> {
  const files = [path.join(CONTENT_DIR, "glossary.yaml")];
  if (series) files.push(path.join(CONTENT_DIR, series, "glossary.yaml"));
  const out: GlossaryEntry[] = [];
  for (const f of files) if (await exists(f)) out.push(...(await readYaml(f, Glossary)));
  // A series entry overrides a site entry with the same term.
  const byTerm = new Map(out.map((e) => [e.term, e]));
  return [...byTerm.values()];
}
