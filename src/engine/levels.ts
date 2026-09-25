/* ──────────────────────────────────────────────────────────────
   Reading levels
   The reader picks how much they want to read, from "just run it"
   to "explain everything". Content is authored once; each element
   declares the minimum level at which it appears.
   ────────────────────────────────────────────────────────────── */

export const LEVELS = ["run", "quick", "guided", "deep"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_INDEX: Record<Level, number> = { run: 0, quick: 1, guided: 2, deep: 3 };

/** A new reader lands on Quick: the page works, the drawing is the simple one. */
export const DEFAULT_LEVEL: Level = "quick";

/** True when `current` shows content that requires at least `min`. */
export function atLeast(current: Level, min: Level): boolean {
  return LEVEL_INDEX[current] >= LEVEL_INDEX[min];
}

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}
