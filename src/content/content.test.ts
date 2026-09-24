/* Content integrity: every page compiles in every locale, and only
   uses variables and choices its contract declares. Runs in CI so a
   broken tutorial never reaches a reader. */

import { describe, expect, it } from "vitest";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { keysOf, LOCALES } from "@/engine";
import { listSeries, readPageSource } from "./loader";
import { rehypeHeadingIds } from "./rehype-heading-ids";

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
        await expect(compile(src, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHeadingIds] })).resolves.toBeTruthy();
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
