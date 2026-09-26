import { readFile } from "node:fs/promises";
import path from "node:path";
import { isLocale } from "@/engine";
import { CONTENT_DIR, getPage, listSeries } from "@/content/loader";

/* The page as its source files, in one Markdown document: the authoring
   brief, then series.yaml, tuto.yaml, the prose in this language and the
   diagram, each in a fence titled with its path. Paste it into a new
   conversation to ask for a revision, a translation or a sibling page. */

export const dynamic = "force-static";

export async function generateStaticParams() {
  const all = await listSeries();
  return all.flatMap((s) => s.pages.flatMap((p) => p.locales.map((lang) => ({ seg: s.slug, page: p.slug, lang }))));
}

async function maybe(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ seg: string; page: string; lang: string }> }) {
  const { seg: series, page: slug, lang } = await ctx.params;
  const page = await getPage(series, slug);
  if (!page || !isLocale(lang) || !page.locales.includes(lang)) return new Response("Not found", { status: 404 });

  const rel = (...p: string[]) => path.join("content", ...p);
  const files: [string, string, string][] = [];
  const add = async (lang: string, ...p: string[]) => {
    const text = await maybe(path.join(CONTENT_DIR, ...p));
    if (text !== null) files.push([rel(...p), lang, text.trimEnd()]);
  };
  await add("yaml", series, "series.yaml");
  await add("yaml", series, slug, "tuto.yaml");
  for (const l of page.locales) await add("mdx", series, slug, `page-${l}.mdx`);
  await add("yaml", series, slug, "diagram.yaml");

  const brief = (await maybe(path.join(process.cwd(), "AUTHORING.md"))) ?? "";
  const title = page.contract.title[lang];
  const body = [
    `# Source of "${title}"`,
    "",
    "The files of this tutorial, as they are in the repository. The authoring brief that defines the format follows them.",
    "",
    ...files.flatMap(([p, l, text]) => [`\`\`\`\`${l} title="${p}"`, text, "````", ""]),
    "---",
    "",
    brief,
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
