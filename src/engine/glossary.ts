/* ──────────────────────────────────────────────────────────────
   Glossary
   Terms and abbreviations a newcomer may not know. Marked in the
   prose at compile time; the reader hovers for the definition.
   ────────────────────────────────────────────────────────────── */

import { z } from "zod";
import { Localized } from "./contract";

export const GlossaryEntry = z.object({
  /** As written in the prose. Also the key. */
  term: z.string().min(1),
  /** Other spellings that should match. */
  aliases: z.array(z.string().min(1)).default([]),
  /** Abbreviations match case-sensitively on every occurrence and show their expansion. */
  abbr: z.boolean().default(false),
  expansion: Localized.optional(),
  def: Localized,
});
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;
export const Glossary = z.array(GlossaryEntry);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type Matcher = { re: RegExp; keyOf: (match: string) => string; isAbbr: (key: string) => boolean };

/** One regex for every spelling, longest first so "reverse DNS" beats "DNS". */
export function buildMatcher(entries: GlossaryEntry[]): Matcher | null {
  if (entries.length === 0) return null;
  const spellings: { text: string; key: string; abbr: boolean }[] = [];
  for (const e of entries) for (const t of [e.term, ...e.aliases]) spellings.push({ text: t, key: e.term, abbr: e.abbr });
  spellings.sort((a, b) => b.text.length - a.text.length);
  const byLower = new Map(spellings.map((s) => [s.text.toLowerCase(), s]));
  const byExact = new Map(spellings.map((s) => [s.text, s]));
  const abbrs = new Set(entries.filter((e) => e.abbr).map((e) => e.term));
  // Case-insensitive so "Firewall" at a sentence start matches; abbreviations
  // are re-checked for exact case by the caller.
  const re = new RegExp(`(?<![\\w-])(?:${spellings.map((s) => escapeRe(s.text)).join("|")})(?![\\w-])`, "gi");
  return {
    re,
    keyOf: (m) => byExact.get(m)?.key ?? byLower.get(m.toLowerCase())?.key ?? m,
    isAbbr: (key) => abbrs.has(key),
  };
}
