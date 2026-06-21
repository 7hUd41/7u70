"use client";

import { createContext, useContext } from "react";

/* ── Variables texte (injectées dans les commandes) ───────────
   group  : bloc d'architecture (voir GROUPS)
   hint   : ligne d'aide (niveau Express et +)
   impact : conséquences précises (niveau Exhaustif) */
export const FIELDS = [
  {
    key: "SERVER_IP",
    kind: "ip",
    label: "IP du VPS",
    placeholder: "51.83.12.34",
    group: "net",
    hint: "L'adresse IPv4 publique reçue par email à la livraison du VPS.",
    impact:
      "Cible de toutes les connexions SSH et du playbook. Une IP erronée = connexion impossible. Ne change qu'en cas de réinstallation du serveur.",
  },
  {
    key: "SSH_PORT",
    kind: "port",
    label: "Port SSH",
    placeholder: "2222",
    group: "net",
    hint: "Le port d'écoute de SSH après durcissement (on évite le 22 par défaut).",
    impact:
      "Doit être ouvert dans UFW AVANT d'activer le pare-feu, sinon tu te coupes l'accès. La même valeur est réutilisée par UFW et fail2ban — la changer ici la change partout.",
  },
  {
    key: "HOSTNAME",
    kind: "hostname",
    label: "Nom d'hôte",
    placeholder: "vps-prod-01",
    group: "net",
    hint: "Le nom de la machine, visible dans le prompt et les logs.",
    impact:
      "Sert aussi de base au reverse DNS. Sans effet sur le fonctionnement, mais t'aide à distinguer tes serveurs entre eux.",
  },
  {
    key: "USERNAME",
    kind: "user",
    label: "Utilisateur",
    placeholder: "deploy",
    group: "user",
    hint: "Le compte non-root que tu utiliseras au quotidien.",
    impact:
      "Reçoit les droits sudo et ta clé SSH. Après durcissement, c'est avec lui (et non root) que tu te connectes. Le renommer ici réécrit toutes les commandes adduser/usermod.",
  },
  {
    key: "DOMAIN",
    kind: "domain",
    label: "Domaine",
    placeholder: "exemple.com",
    group: "web",
    hint: "Ton nom de domaine, sans https:// ni www.",
    impact:
      "Doit pointer (enregistrement A) vers l'IP du serveur AVANT de lancer Certbot, sinon l'obtention du certificat échoue. Utilisé aussi pour le reverse DNS.",
  },
  {
    key: "EMAIL",
    kind: "email",
    label: "Email",
    placeholder: "admin@exemple.com",
    group: "web",
    hint: "Email d'administration pour Let's Encrypt.",
    impact:
      "Reçoit les alertes d'expiration du certificat TLS. N'est pas publié. Sert aussi pour générer ta clé SSH dans le tuto.",
  },
] as const;

export type VarKey = (typeof FIELDS)[number]["key"];
export type Vars = Record<string, string>;

export const DEFAULTS: Vars = {
  SERVER_IP: "51.83.12.34",
  SSH_PORT: "2222",
  HOSTNAME: "vps-prod-01",
  USERNAME: "deploy",
  DOMAIN: "exemple.com",
  EMAIL: "admin@exemple.com",
};

/* Blocs d'architecture : structurent le panneau en haut de page (Détaillé+). */
export const GROUPS = [
  { id: "net", label: "Accès & réseau", desc: "Connexion SSH et identité de la machine" },
  { id: "user", label: "Utilisateur", desc: "Le compte de travail non-root" },
  { id: "web", label: "Domaine & web", desc: "Site et certificat TLS" },
] as const;

/* ── Choix conditionnels (montrent / cachent des sections) ── */
export const CHOICES = [
  {
    key: "OS",
    label: "Distribution",
    type: "select" as const,
    options: [
      { value: "ubuntu", label: "Ubuntu" },
      { value: "debian", label: "Debian" },
    ],
    default: "ubuntu",
  },
  {
    key: "HAS_DOMAIN",
    label: "J'ai un nom de domaine",
    type: "boolean" as const,
    default: true,
  },
] as const;

export type Choices = Record<string, string | boolean>;

export const CHOICE_DEFAULTS: Choices = CHOICES.reduce((acc, c) => {
  acc[c.key] = c.default;
  return acc;
}, {} as Choices);

/* ── Niveaux de lecture (0 = Automatique / Ansible) ───────── */
export const LEVELS = [
  { id: 0, label: "Automatique", hint: "Playbook Ansible prêt à lancer" },
  { id: 1, label: "Express", hint: "Commandes + repère par champ" },
  { id: 2, label: "Détaillé", hint: "Config en blocs d'architecture" },
  { id: 3, label: "Exhaustif", hint: "+ conséquences de chaque variable" },
] as const;

/* ── Présets (config par serveur) ─────────────────────────── */
export type Preset = {
  id: string;
  name: string;
  vars: Vars;
  choices: Choices;
};

export type EditTarget = { key: string; rect: { top: number; bottom: number; left: number } } | null;

export type DocState = {
  vars: Vars;
  choices: Choices;
  level: number;
  flashing: string | null;
  presets: Preset[];
  activeId: string;
  setVar: (key: string, value: string) => void;
  setChoice: (key: string, value: string | boolean) => void;
  setLevel: (level: number) => void;
  newPreset: () => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  selectPreset: (id: string) => void;
  exportPresets: () => void;
  importPresets: (file: File) => void;
  requestEdit: (key: string, rect: { top: number; bottom: number; left: number }) => void;
  /* Progression par étape (checkbox de vérification), propre au serveur actif. */
  done: Record<string, boolean>;
  toggleDone: (id: string) => void;
  /* Survol : clé de variable mise en évidence (champ <-> jetons). */
  highlightKey: string | null;
  setHighlight: (key: string | null) => void;
};

export const DocContext = createContext<DocState | null>(null);

export function useDoc(): DocState {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error("useDoc doit être utilisé dans <DocShell>");
  return ctx;
}

export function fieldOf(key: string) {
  return FIELDS.find((f) => f.key === key);
}

/* ── Validation de format des champs de config ──────────────── */
function isIpv4(v: string): boolean {
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every((o) => Number(o) >= 0 && Number(o) <= 255);
}
function isIpv6(v: string): boolean {
  if (!v.includes(":")) return false;
  return /^[0-9a-fA-F:]+$/.test(v) && (v.match(/::/g) || []).length <= 1 && v.split(":").length <= 8;
}
function isHostname(v: string): boolean {
  if (v.length > 253) return false;
  return /^([a-zA-Z0-9](-?[a-zA-Z0-9])*)(\.[a-zA-Z0-9](-?[a-zA-Z0-9])*)*$/.test(v);
}

/* Renvoie un message d'erreur si la valeur est mal formée, sinon null.
   Une valeur vide n'est jamais une erreur (champ simplement non renseigné). */
export function validateField(key: string, value: string): string | null {
  if (!value) return null;
  const kind = (fieldOf(key) as { kind?: string } | undefined)?.kind ?? "text";
  switch (kind) {
    case "ip":
      return isIpv4(value) || isIpv6(value) ? null : "Adresse IP invalide";
    case "port": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 65535 ? null : "Port hors plage (1–65535)";
    }
    case "hostname":
      return isHostname(value) ? null : "Nom d'hôte invalide";
    case "user":
      return /^[a-z_][a-z0-9_-]{0,31}$/.test(value) ? null : "Utilisateur invalide (minuscules, sans espace)";
    case "domain":
      return isHostname(value) && /\.[a-zA-Z]{2,}$/.test(value) ? null : "Domaine invalide (ex. exemple.com)";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Email invalide";
    default:
      return null;
  }
}

/* Remplace ${VAR} par la valeur configurée. */
export function fill(template: string, vars: Vars): string {
  return template.replace(/\$\{([A-Z_]+)\}/g, (_m, k: string) =>
    k in vars ? vars[k] : `\${${k}}`
  );
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2);
}
