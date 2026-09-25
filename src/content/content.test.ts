/* Content integrity: every page compiles in every locale, and only
   uses variables and choices its contract declares. Runs in CI so a
   broken tutorial never reaches a reader. */

import { describe, expect, it } from "vitest";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { keysOf, LOCALES } from "@/engine";
import { listSeries, readPageSource } from "./loader";
import { rehypeHeadingIds } from "./rehype-heading-ids";
import { parseMeta, rehypeCodeMeta } from "./rehype-code-meta";
import { sectionsOf } from "./search-index";

const series = await listSeries();
const pages = series.flatMap((s) => s.pages);

describe("content", () => {
  it("has at least one series with pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const page of pages) {
    for (const locale of LOCALES) {
      const name = `${page.series}/${page.slug} (${locale})`;

      it(`${name} compiles`, async () => {
        const src = await readPageSource(page, locale);
        await expect(compile(src, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHeadingIds, rehypeCodeMeta] })).resolves.toBeTruthy();
      });

      it(`${name} only uses declared variables and choices`, async () => {
        const src = await readPageSource(page, locale);
        const declaredVars = new Set(page.contract.vars.map((v) => v.key));
        const declaredChoices = new Set(page.contract.choices.map((c) => c.key));

        const usedVars = new Set([...keysOf(src), ...[...src.matchAll(/<V\s+name="([A-Z0-9_]+)"/g)].map((m) => m[1])]);
        const undeclaredVars = [...usedVars].filter((k) => !declaredVars.has(k));
        expect(undeclaredVars, "undeclared variables").toEqual([]);

        const usedChoices = [...src.matchAll(/<When\s+(?:flag|notFlag|is)="([A-Z0-9_]+)"/g)].map((m) => m[1]);
        const undeclaredChoices = [...new Set(usedChoices)].filter((k) => !declaredChoices.has(k));
        expect(undeclaredChoices, "undeclared choices").toEqual([]);
      });
    }

    it(`${page.series}/${page.slug}: locales use the same headings`, async () => {
      const outlines = await Promise.all(
        LOCALES.map(async (l) => (await readPageSource(page, l)).split("\n").filter((line) => /^##+ /.test(line)).length)
      );
      expect(new Set(outlines).size, "same number of headings in every locale").toBe(1);
    });
  }
});

describe("rehype inside JSX containers", () => {
  it("keeps fence meta and heading ids nested in <When>/<Annotated>", async () => {
    const src = '<When flag="X">\n\n## Inside\n\n```ini title="a.conf" {1}\nk = v\n```\n\n</When>\n';
    const out = String(await compile(src, { rehypePlugins: [rehypeHeadingIds, rehypeCodeMeta] }));
    expect(out).toContain('id: "inside"');
    expect(out).toContain('"data-meta": "title=\\"a.conf\\" {1}"');
  });
});

describe("fence meta", () => {
  it("parses title and highlighted lines", () => {
    const m = parseMeta('title="configuration.py" {2,4-6}');
    expect(m.title).toBe("configuration.py");
    expect([...m.highlight].sort((a, b) => a - b)).toEqual([2, 4, 5, 6]);
  });
  it("is empty without meta", () => {
    expect(parseMeta(undefined).highlight.size).toBe(0);
  });
});

describe("search index", () => {
  it("cuts a page into sections with the renderer's ids and plain text", () => {
    const src = 'Intro <V name="HOST" /> here.\n\n## Install it\n\nRun this:\n\n```bash\nsudo apt install -y nginx\n```\n\n<When flag="X">\n\n### Sub step\n\nHidden text.\n\n</When>\n';
    const s = sectionsOf(src);
    expect(s.map((x) => x.id)).toEqual(["", "install-it", "sub-step"]);
    expect(s[0].text).toContain("Intro ${HOST} here.");
    expect(s[1].text).toContain("sudo apt install -y nginx");
    expect(s[2].text).toBe("Hidden text.");
  });
});
