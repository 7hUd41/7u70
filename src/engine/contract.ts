/* ──────────────────────────────────────────────────────────────
   Tutorial contract (tuto.yaml)
   Language-independent description of a tutorial: which variables
   the reader fills in, which choices shape the path, and metadata.
   Prose lives next to it in page-<locale>.mdx and must only use
   variables and choices declared here.
   ────────────────────────────────────────────────────────────── */

import { z } from "zod";
import { KINDS } from "./validate";

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Every user-facing string exists in every locale. */
export const Localized = z.object({ en: z.string().min(1), fr: z.string().min(1) });
export type Localized = z.infer<typeof Localized>;

const Key = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "keys are UPPER_SNAKE_CASE");

/** Same shape as <When> in prose: show only when the choice matches. */
export const ConditionSpec = z
  .object({
    flag: Key.optional(),
    notFlag: Key.optional(),
    is: Key.optional(),
    equals: z.string().optional(),
    oneOf: z.array(z.string()).optional(),
  })
  .strict();
export type ConditionSpec = z.infer<typeof ConditionSpec>;
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slugs are kebab-case");

export const VarSpec = z.object({
  key: Key,
  kind: z.enum(KINDS).default("text"),
  /** Group id (see `groups`), drives the layout of the context panel. */
  group: z.string().optional(),
  default: z.string().default(""),
  label: Localized,
  /** One line shown under the field (quick+). */
  hint: Localized.optional(),
  /** Consequences of getting it wrong / where it is reused (deep). */
  impact: Localized.optional(),
  /** Only relevant when this condition holds; hidden otherwise. */
  when: ConditionSpec.optional(),
});
export type VarSpec = z.infer<typeof VarSpec>;

export const ChoiceSpec = z.discriminatedUnion("type", [
  z.object({
    key: Key,
    type: z.literal("boolean"),
    label: Localized,
    hint: Localized.optional(),
    default: z.boolean().default(false),
  }),
  z.object({
    key: Key,
    type: z.literal("select"),
    label: Localized,
    hint: Localized.optional(),
    options: z.array(z.object({ value: z.string().min(1), label: Localized })).min(2),
    default: z.string().optional(),
  }),
]);
export type ChoiceSpec = z.infer<typeof ChoiceSpec>;

export const GroupSpec = z.object({
  id: z.string().min(1),
  label: Localized,
  desc: Localized.optional(),
  /** Only relevant when this condition holds; hidden otherwise. */
  when: ConditionSpec.optional(),
});

export const Difficulty = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const TutoContract = z
  .object({
    title: Localized,
    summary: Localized,
    difficulty: Difficulty.default("intermediate"),
    tags: z.array(z.string()).default([]),
    authors: z.array(z.string()).default([]),
    created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /** Estimated hands-on time in minutes. */
    minutes: z.number().int().positive().optional(),
    /** Upstream project version the tutorial was validated against. */
    validated: z.string().optional(),
    groups: z.array(GroupSpec).default([]),
    vars: z.array(VarSpec).default([]),
    choices: z.array(ChoiceSpec).default([]),
  })
  .superRefine((t, ctx) => {
    const groupIds = new Set(t.groups.map((g) => g.id));
    const seen = new Set<string>();
    for (const v of t.vars) {
      if (seen.has(v.key)) ctx.addIssue({ code: "custom", message: `duplicate variable ${v.key}`, path: ["vars"] });
      seen.add(v.key);
      if (v.group && !groupIds.has(v.group))
        ctx.addIssue({ code: "custom", message: `variable ${v.key} references unknown group "${v.group}"`, path: ["vars"] });
    }
    for (const c of t.choices) {
      if (seen.has(c.key)) ctx.addIssue({ code: "custom", message: `choice ${c.key} collides with a variable`, path: ["choices"] });
      seen.add(c.key);
      if (c.type === "select" && c.default !== undefined && !c.options.some((o) => o.value === c.default))
        ctx.addIssue({ code: "custom", message: `choice ${c.key}: default "${c.default}" is not an option`, path: ["choices"] });
    }
    const choiceKeys = new Set(t.choices.map((c) => c.key));
    const checkWhen = (owner: string, when: ConditionSpec | undefined, path: string) => {
      if (!when) return;
      const ref = when.flag ?? when.notFlag ?? when.is;
      if (ref && !choiceKeys.has(ref)) ctx.addIssue({ code: "custom", message: `${owner}: "when" references unknown choice "${ref}"`, path: [path] });
    };
    for (const g of t.groups) checkWhen(`group ${g.id}`, g.when, "groups");
    for (const v of t.vars) checkWhen(`variable ${v.key}`, v.when, "vars");
  });
export type TutoContract = z.infer<typeof TutoContract>;

export const SeriesContract = z.object({
  title: Localized,
  summary: Localized,
  /** Page slugs in reading order. Folders not listed are appended alphabetically. */
  order: z.array(Slug).default([]),
});
export type SeriesContract = z.infer<typeof SeriesContract>;

/** Initial values for a fresh profile of this tutorial. */
export function defaultsOf(t: TutoContract): { vars: Record<string, string>; choices: Record<string, string | boolean> } {
  const vars: Record<string, string> = {};
  for (const v of t.vars) vars[v.key] = v.default;
  const choices: Record<string, string | boolean> = {};
  for (const c of t.choices) choices[c.key] = c.type === "boolean" ? c.default : (c.default ?? c.options[0].value);
  return { vars, choices };
}
