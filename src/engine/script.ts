/* ──────────────────────────────────────────────────────────────
   Script assembly
   Takes the shell blocks a reader can currently see (so conditional
   sections are already resolved) and assembles one runnable file.
   ────────────────────────────────────────────────────────────── */

import { fill, type Vars } from "./template";

export type ShellBlock = {
  /** Raw template, before variable injection. */
  code: string;
  /** Heading of the step this block belongs to, used as a comment. */
  step?: string;
};

export type ScriptOptions = {
  title: string;
  /** Free-form label for the header comment (hostname, profile name…). */
  target?: string;
  vars: Vars;
  /** Stop at the first failing command. Default true. */
  strict?: boolean;
};

export function buildInstallScript(blocks: readonly ShellBlock[], opts: ScriptOptions): string {
  const lines: string[] = ["#!/usr/bin/env bash"];
  if (opts.strict !== false) lines.push("set -euo pipefail");
  lines.push(`# ${opts.title}${opts.target ? ` — ${opts.target}` : ""}`);
  lines.push(`# Generated ${new Date().toISOString().slice(0, 10)}. Review before running.`);
  lines.push("");

  let lastStep: string | undefined;
  for (const b of blocks) {
    const code = fill(b.code, opts.vars).trim();
    if (!code) continue;
    if (b.step && b.step !== lastStep) {
      lines.push(`# ── ${b.step}`);
      lastStep = b.step;
    }
    lines.push(code, "");
  }
  return lines.join("\n");
}

/** Every shell block as one paste-able string, variables filled. */
export function joinCommands(blocks: readonly ShellBlock[], vars: Vars): string {
  return blocks
    .map((b) => fill(b.code, vars).trim())
    .filter(Boolean)
    .join("\n");
}
