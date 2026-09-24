/* ──────────────────────────────────────────────────────────────
   Conditional content
   A tutorial declares "choices" (select or boolean). Sections can
   be gated on them:  <When flag="LDAP">, <When is="WEB" equals="nginx">
   ────────────────────────────────────────────────────────────── */

export type ChoiceValue = string | boolean;
export type Choices = Readonly<Record<string, ChoiceValue>>;

export type Condition = {
  /** Show when the boolean choice is on. */
  flag?: string;
  /** Show when the boolean choice is off. */
  notFlag?: string;
  /** Show when the select choice `is` equals `equals` (or one of `oneOf`). */
  is?: string;
  equals?: string;
  oneOf?: readonly string[];
};

export function evaluate(cond: Condition, choices: Choices): boolean {
  if (cond.flag !== undefined) return choices[cond.flag] === true;
  if (cond.notFlag !== undefined) return choices[cond.notFlag] !== true;
  if (cond.is !== undefined) {
    const v = choices[cond.is];
    if (cond.oneOf) return typeof v === "string" && cond.oneOf.includes(v);
    if (cond.equals !== undefined) return v === cond.equals;
    return Boolean(v);
  }
  return true;
}
