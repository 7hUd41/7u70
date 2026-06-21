import { NextRequest } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { tutoBySlug } from "@/lib/tutos";

/* Lecture/écriture du fichier MDX d'un tuto publié, pour l'éditeur.
   Le slug est validé contre le registre -> pas de traversée de chemin.
   L'écriture sert d'« Enregistrer » en local (npm run dev). */
export const dynamic = "force-dynamic";

function fileFor(slug: string): string | null {
  if (!tutoBySlug(slug)) return null;
  return path.join(process.cwd(), "src", "app", "(doc)", slug, "page.mdx");
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const file = fileFor(slug);
  if (!file) return new Response("Tuto inconnu", { status: 404 });
  try {
    const text = await readFile(file, "utf8");
    return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response("Fichier introuvable", { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const file = fileFor(slug);
  if (!file) return new Response("Tuto inconnu", { status: 404 });
  try {
    const body = await req.text();
    if (!body.trim()) return new Response("Contenu vide", { status: 400 });
    await writeFile(file, body, "utf8");
    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Échec de l'écriture : " + (e instanceof Error ? e.message : "erreur"), { status: 500 });
  }
}
