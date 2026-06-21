import { NextRequest } from "next/server";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";

/* Création d'un nouveau tuto depuis l'éditeur :
   - écrit src/app/(doc)/<slug>/page.mdx (frontmatter + contenu/modèle)
   - ajoute l'entrée dans src/lib/tutos.data.json
   Destiné à l'usage local (npm run dev). */
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readingMinutes(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ");
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export async function POST(req: NextRequest) {
  let data: {
    slug?: string;
    title?: string;
    group?: string;
    summary?: string;
    difficulty?: string;
    icon?: string;
    accent?: string;
    author?: string;
    content?: string;
  };
  try {
    data = await req.json();
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const title = (data.title || "").trim();
  const group = (data.group || "").trim() || "Divers";
  const slug = (data.slug || slugify(title)).trim();
  if (!title) return new Response("Titre requis", { status: 400 });
  if (!SLUG_RE.test(slug)) return new Response("Slug invalide (a-z, 0-9, tirets)", { status: 400 });

  const root = process.cwd();
  const dir = path.join(root, "src", "app", "(doc)", slug);
  const dataPath = path.join(root, "src", "lib", "tutos.data.json");

  // unicité
  let list: Array<{ slug: string }> = [];
  try {
    list = JSON.parse(await readFile(dataPath, "utf8"));
  } catch {
    return new Response("Registre introuvable", { status: 500 });
  }
  if (list.some((t) => t.slug === slug)) return new Response("Ce slug existe déjà", { status: 409 });

  // contenu : soit fourni, soit un modèle
  const today = new Date().toISOString().slice(0, 10);
  const author = (data.author || "Toi").trim();
  const difficulty = (data.difficulty || "débutant").trim();
  let body = (data.content || "").trim();
  // si le contenu fourni a déjà un frontmatter, on le retire (on régénère le nôtre)
  body = body.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  if (!body) {
    body = [
      `# ${title}`,
      "",
      "Intro du tuto — toujours visible quel que soit le niveau.",
      "",
      "## 1. Première étape",
      "",
      "<Detailed>Explication visible dès le niveau Détaillé.</Detailed>",
      "",
      "```bash",
      'echo "à compléter"',
      "```",
      "",
      '<Check cmd="commande de vérif" expect="sortie attendue" />',
      "",
    ].join("\n");
  }

  const fm = [
    "---",
    `author: ${author}`,
    "date:",
    `  created: ${today}`,
    `  edited: ${today}`,
    `slug: ${slug}`,
    `difficulty: ${difficulty}`,
    "tags: []",
    "vars: []",
    "---",
    "",
    "",
  ].join("\n");

  const mdx = fm + body + "\n";

  try {
    await access(dir).then(
      () => {
        throw new Error("exists");
      },
      () => undefined
    );
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "page.mdx"), mdx, "utf8");

    const entry = {
      slug,
      title,
      heading: title,
      group,
      summary: (data.summary || "").trim() || title,
      icon: (data.icon || "Server").trim(),
      accent: (data.accent || "slate").trim(),
      minutes: readingMinutes(body),
    };
    list.push(entry);
    await writeFile(dataPath, JSON.stringify(list, null, 2) + "\n", "utf8");

    return new Response(JSON.stringify({ ok: true, slug }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error && e.message === "exists" ? "Le dossier existe déjà" : "Échec de la création";
    return new Response(msg, { status: 500 });
  }
}
