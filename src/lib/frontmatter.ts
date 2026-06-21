/* ── Parseur de frontmatter YAML (sous-ensemble, sans dépendance) ──
   Gère :
     author: nom
     slug: vps-phase-1
     difficulty: intermédiaire
     description: une phrase
     tags: [a, b, c]      (ou liste sur plusieurs lignes avec "- ")
     date:
       created: 2025-11-13
       edited: 2026-01-30
   Renvoie les métadonnées + le corps MDX (frontmatter retiré) + le temps
   de lecture estimé. */

export type TutoMeta = {
  author?: string;
  slug?: string;
  difficulty?: string;
  description?: string;
  tags?: string[];
  vars?: string[];
  created?: string;
  edited?: string;
};

function stripQuotes(v: string): string {
  return v.replace(/^['"]|['"]$/g, "").trim();
}

function parseInlineList(v: string): string[] {
  const m = v.match(/^\[(.*)\]$/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => stripQuotes(s))
    .filter(Boolean);
}

export function splitFrontmatter(raw: string): { meta: TutoMeta | null; body: string } {
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: null, body: raw };
  const body = raw.slice(m[0].length);
  const meta: TutoMeta = {};
  const lines = m[1].split(/\r?\n/);
  let inDate = false;
  let lastListKey: "tags" | "vars" | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;

    // élément de liste "- valeur"
    const li = line.trim().match(/^-\s+(.*)$/);
    if (li && lastListKey === "tags") {
      (meta.tags ||= []).push(stripQuotes(li[1]));
      continue;
    }
    if (li && lastListKey === "vars") {
      (meta.vars ||= []).push(stripQuotes(li[1]));
      continue;
    }

    const kv = line.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    lastListKey = null as "tags" | "vars" | null;

    if (key === "date" && val === "") {
      inDate = true;
      continue;
    }
    if (inDate && indent >= 2 && (key === "created" || key === "edited")) {
      meta[key] = stripQuotes(val);
      continue;
    }
    inDate = false;

    if (key === "tags") {
      if (val.startsWith("[")) meta.tags = parseInlineList(val);
      else lastListKey = "tags";
    } else if (key === "vars") {
      if (val.startsWith("[")) meta.vars = parseInlineList(val);
      else lastListKey = "vars";
    } else if (key === "author" || key === "slug" || key === "difficulty" || key === "description") {
      meta[key] = stripQuotes(val);
    } else if (key === "created" || key === "edited") {
      meta[key] = stripQuotes(val);
    }
  }
  return { meta, body };
}

/* Temps de lecture estimé (200 mots/min), code et balises exclus. */
export function readingMinutes(body: string): number {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`\-]/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
