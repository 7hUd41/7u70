/* ──────────────────────────────────────────────────────────────
   UI strings. Tutorial prose is translated in content/, this is
   only the chrome around it. `en` is the reference shape.
   ────────────────────────────────────────────────────────────── */

import type { Locale } from "@/engine";

const en = {
  brand: "Adaptive tutorials",
  tagline: "Fill in your context once. Read at the depth you need.",
  home: "All tutorials",
  series: "Series",
  levels: {
    run: { label: "Run", hint: "One script, filled with your values. Read nothing." },
    quick: { label: "Quick", hint: "Commands only, with your values injected." },
    guided: { label: "Guided", hint: "Commands and what each step does." },
    deep: { label: "Deep", hint: "Everything, including why and what could go wrong." },
  },
  context: {
    title: "Your values",
    subtitle: "Every command on this page is filled with these. Click a value in a command to change it there.",
    choices: "Your stack",
    choicesSubtitle: "Your choices decide which steps appear.",
    reset: "Reset to defaults",
    appliesEverywhere: "Applies to the whole page.",
    edit: "Edit",
  },
  toolbar: {
    copyAll: "Copy all commands",
    copied: "Copied",
    download: "Download install.sh",
    downloadRun: "Download the script",
    copyRun: "Copy the script",
  },
  code: {
    copy: "Copy",
    copied: "Copied",
    sensitive: "Sensitive command",
    review: "Review before running.",
  },
  check: {
    title: "Check",
    done: "Verified",
    expect: "Expected output",
    mark: "Mark this step as done",
    unmark: "Step done — unmark",
  },
  progress: {
    title: "Progress",
    steps: (done: number, total: number) => `${done}/${total} checks`,
    resume: "Resume where I left off",
    complete: "All checks passed",
  },
  toc: "On this page",
  help: {
    about: (label: string) => `About ${label}`,
    impact: "Why it matters",
    example: "Example",
  },
  meta: {
    minutes: (m: number) => `~${m} min hands-on`,
    validated: (v: string) => `validated on ${v}`,
    updated: "updated",
    difficulty: { beginner: "beginner", intermediate: "intermediate", advanced: "advanced" },
  },
  nav: { prev: "Previous", next: "Next" },
  theme: { light: "Light theme", dark: "Dark theme" },
  locale: { en: "English", fr: "Français" },
  run: {
    banner: "Run mode: one script does everything. Fill in your context, download, run. Switch to Quick to see what it did.",
  },
  danger: {
    rm_recursive: "recursive or forced deletion (rm)",
    firewall_enable: "may cut your own access (firewall)",
    mkfs: "formats a disk (mkfs)",
    dd: "raw disk write (dd)",
    overwrite_system_file: "overwrites a system file",
    chmod_777: "world-writable permissions (777)",
    fork_bomb: "fork bomb",
    ssh_stop: "stops the SSH service",
    firewall_flush: "flushes firewall rules",
    remote_script: "runs a remote script",
    reboot: "reboots or powers off the machine",
    drop_database: "drops a database",
  },
  validation: {
    invalid_ip: "Invalid IP address",
    invalid_cidr: "Invalid CIDR (e.g. 10.0.0.0/24)",
    invalid_port: "Port out of range (1–65535)",
    invalid_hostname: "Invalid hostname",
    invalid_domain: "Invalid domain (e.g. example.com)",
    invalid_user: "Invalid user name (lowercase, no spaces)",
    invalid_email: "Invalid email",
    invalid_path: "Absolute path expected",
    invalid_url: "Invalid URL (http or https)",
    too_short: "Too short (12 characters minimum)",
  },
};

export type Dict = typeof en;

const fr: Dict = {
  brand: "Tutos adaptatifs",
  tagline: "Renseigne ton contexte une fois. Lis à la profondeur qu'il te faut.",
  home: "Tous les tutos",
  series: "Série",
  levels: {
    run: { label: "Automatique", hint: "Un script rempli avec tes valeurs. Rien à lire." },
    quick: { label: "Express", hint: "Les commandes seules, avec tes valeurs injectées." },
    guided: { label: "Détaillé", hint: "Les commandes et ce que fait chaque étape." },
    deep: { label: "Exhaustif", hint: "Tout, y compris le pourquoi et ce qui peut mal tourner." },
  },
  context: {
    title: "Tes valeurs",
    subtitle: "Chaque commande de la page est remplie avec. Clique une valeur dans une commande pour la changer sur place.",
    choices: "Ta stack",
    choicesSubtitle: "Tes choix décident des étapes qui apparaissent.",
    reset: "Revenir aux valeurs par défaut",
    appliesEverywhere: "S'applique à toute la page.",
    edit: "Modifier",
  },
  toolbar: {
    copyAll: "Copier toutes les commandes",
    copied: "Copié",
    download: "Télécharger install.sh",
    downloadRun: "Télécharger le script",
    copyRun: "Copier le script",
  },
  code: {
    copy: "Copier",
    copied: "Copié",
    sensitive: "Commande sensible",
    review: "Vérifie avant d'exécuter.",
  },
  check: {
    title: "Vérification",
    done: "Vérifié",
    expect: "Retour attendu",
    mark: "Marquer cette étape comme faite",
    unmark: "Étape faite — décocher",
  },
  progress: {
    title: "Progression",
    steps: (done, total) => `${done}/${total} vérifications`,
    resume: "Reprendre où j'en étais",
    complete: "Toutes les vérifications passent",
  },
  toc: "Sur cette page",
  help: {
    about: (label) => `À propos de ${label}`,
    impact: "Pourquoi c'est important",
    example: "Exemple",
  },
  meta: {
    minutes: (m) => `~${m} min de manipulation`,
    validated: (v) => `validé sur ${v}`,
    updated: "mis à jour",
    difficulty: { beginner: "débutant", intermediate: "intermédiaire", advanced: "avancé" },
  },
  nav: { prev: "Précédent", next: "Suivant" },
  theme: { light: "Thème clair", dark: "Thème sombre" },
  locale: { en: "English", fr: "Français" },
  run: {
    banner: "Mode automatique : un seul script fait tout. Renseigne ton contexte, télécharge, lance. Passe en Express pour voir ce qu'il a fait.",
  },
  danger: {
    rm_recursive: "suppression récursive ou forcée (rm)",
    firewall_enable: "peut couper ton propre accès (pare-feu)",
    mkfs: "formate un disque (mkfs)",
    dd: "écriture disque brute (dd)",
    overwrite_system_file: "écrase un fichier système",
    chmod_777: "permissions ouvertes à tous (777)",
    fork_bomb: "fork bomb",
    ssh_stop: "arrête le service SSH",
    firewall_flush: "vide les règles de pare-feu",
    remote_script: "exécute un script distant",
    reboot: "redémarre ou éteint la machine",
    drop_database: "supprime une base de données",
  },
  validation: {
    invalid_ip: "Adresse IP invalide",
    invalid_cidr: "CIDR invalide (ex. 10.0.0.0/24)",
    invalid_port: "Port hors plage (1–65535)",
    invalid_hostname: "Nom d'hôte invalide",
    invalid_domain: "Domaine invalide (ex. exemple.com)",
    invalid_user: "Nom d'utilisateur invalide (minuscules, sans espace)",
    invalid_email: "Email invalide",
    invalid_path: "Chemin absolu attendu",
    invalid_url: "URL invalide (http ou https)",
    too_short: "Trop court (12 caractères minimum)",
  },
};

const DICTS: Record<Locale, Dict> = { en, fr };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}
