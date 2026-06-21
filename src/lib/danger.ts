/* ── Détection de commandes à effet de bord ───────────────────
   Renvoie la liste des raisons pour lesquelles un bloc shell mérite
   un avertissement. Purement informatif (n'empêche rien). */

const RULES: { re: RegExp; reason: string }[] = [
  { re: /\brm\b[^\n]*\s-[a-zA-Z]*[rf]/, reason: "suppression récursive/forcée (rm)" },
  { re: /\bufw\s+enable\b/, reason: "ufw enable peut couper ton accès" },
  { re: /\bmkfs\b/, reason: "formatage de disque (mkfs)" },
  { re: /\bdd\s+if=/, reason: "écriture disque brute (dd)" },
  { re: />\s*\/(etc|boot)\//, reason: "écrase un fichier système" },
  { re: /\bchmod\s+(-R\s+)?0?777\b/, reason: "permissions 777 (trop ouvertes)" },
  { re: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: "fork bomb" },
  { re: /\bsystemctl\s+(stop|disable)\s+ssh\b/, reason: "coupe le service SSH" },
  { re: /\biptables\s+-F\b|\bnft\s+flush\b/, reason: "vide les règles de pare-feu" },
  { re: /(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(bash|sh)\b/, reason: "exécute un script distant" },
  { re: /\b(reboot|shutdown|poweroff|halt)\b/, reason: "redémarre/éteint la machine" },
];

export function scanDangers(code: string): string[] {
  const out = new Set<string>();
  for (const r of RULES) if (r.re.test(code)) out.add(r.reason);
  return [...out];
}
