import { NextResponse } from "next/server";
import { z } from "zod";
import { Validation } from "@/engine";
import { appendValidation, getPage } from "@/content/loader";
import { site } from "@/site.config";

/* Records "I ran this page end to end and it worked". Author mode only:
   the static export has no server, the UI then links to the issue tracker. */

const Body = z.object({
  series: z.string().regex(/^[a-z0-9-]+$/),
  page: z.string().regex(/^[a-z0-9-]+$/),
  validation: Validation.omit({ at: true }),
});

export async function POST(req: Request) {
  if (!site.authorMode) return NextResponse.json({ error: "read-only" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { series, page, validation } = parsed.data;
  const p = await getPage(series, page);
  if (!p) return NextResponse.json({ error: "unknown page" }, { status: 404 });

  // Only declared choices are kept, so the file never carries anything else.
  const allowed = new Set(p.contract.choices.map((c) => c.key));
  const choices = Object.fromEntries(Object.entries(validation.choices).filter(([k]) => allowed.has(k)));
  const entry = Validation.parse({ ...validation, choices, at: new Date().toISOString() });
  await appendValidation(p, entry);
  return NextResponse.json({ ok: true, validation: entry });
}
