/* ──────────────────────────────────────────────────────────────
   Human validations
   A validation is one person saying "I ran this whole page today and it
   worked", with the path they took (their choices). Stored next to the
   page in validations.yaml, one entry per validation, never edited.
   ────────────────────────────────────────────────────────────── */

import { z } from "zod";
import { LOCALES } from "./contract";
import type { Choices } from "./conditions";

export const Validation = z.object({
  /** ISO timestamp. */
  at: z.string().datetime(),
  by: z.string().trim().min(1).max(60).optional(),
  locale: z.enum(LOCALES),
  /** The reader's stack at validation time: which path was exercised. */
  choices: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  checks: z.object({ done: z.number().int().min(0), total: z.number().int().min(0) }),
  /** Upstream version the reader was on, free text. */
  version: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});
export type Validation = z.infer<typeof Validation>;

export const Validations = z.array(Validation);

export type ValidationSummary = {
  total: number;
  last?: Validation;
  /** Validations whose choices match the reader's current choices. */
  onMyPath: number;
  lastOnMyPath?: Validation;
  /** Days since the last validation (any path), or null if none. */
  daysSince: number | null;
};

/** Two paths match when every choice recorded in the validation equals the reader's. */
export function samePath(recorded: Choices, current: Choices): boolean {
  return Object.entries(recorded).every(([k, v]) => current[k] === v);
}

export function summarize(list: readonly Validation[], current: Choices, now: number): ValidationSummary {
  const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
  const last = sorted[sorted.length - 1];
  const mine = sorted.filter((v) => samePath(v.choices, current));
  return {
    total: sorted.length,
    last,
    onMyPath: mine.length,
    lastOnMyPath: mine[mine.length - 1],
    daysSince: last ? Math.max(0, Math.floor((now - new Date(last.at).getTime()) / 86_400_000)) : null,
  };
}
