/* ──────────────────────────────────────────────────────────────
   Carry: a link that carries the reader's state
   No account, no server: values, choices and progress travel in the
   URL fragment (#s=…), which browsers never send. Secrets never go in;
   the reader types them again on the other side. The same link serves
   two purposes: hand a pre-filled tutorial to a colleague, or pick up
   where you were on another device.
   ────────────────────────────────────────────────────────────── */

import type { ChoiceValue } from "./conditions";
import type { TutoContract } from "./contract";

export type Carry = {
  /** Format version. */
  v: 1;
  /** The series the values belong to. */
  series: string;
  vars: Record<string, string>;
  choices: Record<string, ChoiceValue>;
  /** Checks done, per page of the series: { "<page>": ["<checkId>", …] }. */
  done: Record<string, string[]>;
};

export const CARRY_PARAM = "s";

/** Values without the secrets: only what can safely leave the browser. */
export function stripSecrets(vars: Record<string, string>, contract: TutoContract): Record<string, string> {
  const secret = new Set(contract.vars.filter((v) => v.kind === "secret").map((v) => v.key));
  return Object.fromEntries(Object.entries(vars).filter(([k, v]) => !secret.has(k) && v !== ""));
}

/* base64url over UTF-8, both ways, without Node Buffers so the reader can run it. */
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeCarry(c: Carry): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(c)));
}

/** null when the text is not a carry (wrong format, wrong version). */
export function decodeCarry(s: string): Carry | null {
  try {
    const c = JSON.parse(new TextDecoder().decode(fromBase64Url(s))) as Partial<Carry>;
    if (c?.v !== 1 || typeof c.series !== "string") return null;
    return {
      v: 1,
      series: c.series,
      vars: typeof c.vars === "object" && c.vars ? c.vars : {},
      choices: typeof c.choices === "object" && c.choices ? c.choices : {},
      done: typeof c.done === "object" && c.done ? c.done : {},
    };
  } catch {
    return null;
  }
}

/** The fragment to append to a page URL. */
export function carryFragment(c: Carry): string {
  return `#${CARRY_PARAM}=${encodeCarry(c)}`;
}

/** The carry in a URL fragment, if any. */
export function carryFromHash(hash: string): Carry | null {
  const m = hash.match(new RegExp(`(?:^#|[#&])${CARRY_PARAM}=([A-Za-z0-9_-]+)`));
  return m ? decodeCarry(m[1]) : null;
}
