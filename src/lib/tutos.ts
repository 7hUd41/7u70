/* ── Registre des tutos ───────────────────────────────────────
   Les données vivent dans tutos.data.json (éditable par l'API de
   création de tuto). Ce module les type et fournit les helpers.
   `icon` = clé lucide résolue côté nav ; `group` = catégorie libre. */
import data from "./tutos.data.json";

export type TutoGroup = string;

export type Tuto = {
  slug: string;
  title: string; // titre court (nav / fil d'Ariane)
  heading: string; // titre long (H1 de la page)
  group: TutoGroup;
  summary: string;
  icon: string; // clé lucide
  accent: string; // teinte tailwind (ex. "cyan")
  minutes: number; // durée estimée
};

export const TUTOS: Tuto[] = data as Tuto[];

/* Groupes dans l'ordre de première apparition. */
export const TUTO_GROUPS: TutoGroup[] = TUTOS.reduce<TutoGroup[]>((acc, t) => {
  if (!acc.includes(t.group)) acc.push(t.group);
  return acc;
}, []);

export function tutoBySlug(slug: string): Tuto | undefined {
  return TUTOS.find((t) => t.slug === slug);
}

export function tutosByGroup(group: TutoGroup): Tuto[] {
  return TUTOS.filter((t) => t.group === group);
}

/* Voisins dans le même groupe (pour la navigation de série). */
export function tutoNeighbors(slug: string): { prev?: Tuto; next?: Tuto } {
  const t = tutoBySlug(slug);
  if (!t) return {};
  const list = tutosByGroup(t.group);
  const i = list.findIndex((x) => x.slug === slug);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}
