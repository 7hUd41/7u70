import { NextResponse } from "next/server";
import { isLocale, LOCALES } from "@/engine";
import { buildIndex } from "@/content/search-index";

/* The search index for one locale. Static: generated at build time. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return LOCALES.map((seg) => ({ seg }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ seg: string }> }) {
  const { seg: locale } = await ctx.params;
  if (!isLocale(locale)) return NextResponse.json([], { status: 404 });
  return NextResponse.json(await buildIndex(locale));
}
