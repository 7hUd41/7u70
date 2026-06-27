"use client";

import { Component, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import Link from "next/link";
import { FileDown, BookOpen, Eye, Code2, AlertTriangle, Keyboard, X, Wand2, CheckCircle2, Save, FolderOpen, FilePlus } from "lucide-react";
import {
  DocContext,
  CHOICES,
  CHOICE_DEFAULTS,
  DEFAULTS,
  LEVELS,
  type Choices,
  type DocState,
} from "@/components/doc-context";
import { useMDXComponents } from "@/mdx-components";
import type { EditorApi } from "@/components/CodeEditor";
import { TUTOS, TUTO_GROUPS } from "@/lib/tutos";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => <div className="p-5 text-sm text-slate-400">Chargement de l&apos;éditeur…</div>,
});

/* Modèle de départ : montre toutes les fonctionnalités d'un coup. */
const STARTER = [
  "---",
  "author: Toi",
  "date:",
  "  created: 2026-01-01",
  "  edited: 2026-01-01",
  "slug: mon-tuto",
  "difficulty: débutant",
  "tags: [exemple, vps]",
  "---",
  "",
  "# Mon nouveau tuto",
  "",
  "Texte d'intro, toujours visible quel que soit le niveau.",
  "",
  "<Automatic>",
  "",
  "```yaml",
  "# Le bloc Automatique n'apparaît qu'au niveau « Automatique ».",
  "- hosts: ${SERVER_IP}",
  "  become: true",
  "```",
  "",
  "</Automatic>",
  "",
  "## 01 — Une étape",
  "",
  "<Detailed>Visible à partir du niveau Détaillé.</Detailed>",
  "",
  "<Full>Visible seulement au niveau Exhaustif. On peut citer une variable dans le texte : <V name=\"DOMAIN\" />.</Full>",
  "",
  "```bash",
  "ssh -p ${SSH_PORT} ${USERNAME}@${SERVER_IP}",
  "```",
  "",
  "<Warn>Un avertissement, visible à tous les niveaux.</Warn>",
  "",
  "<When flag=\"HAS_DOMAIN\">",
  "",
  "## 02 — Étape conditionnelle",
  "",
  "<Note>Ce bloc n'apparaît que si « J'ai un domaine » est activé à gauche.</Note>",
  "",
  "```bash",
  "certbot --nginx -d ${DOMAIN} -m ${EMAIL} --agree-tos",
  "```",
  "",
  "</When>",
  "",
].join("\n");

/* Capture les erreurs de rendu du MDX compilé. */
class Boundary extends Component<{ children: ReactNode; sig: string }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidUpdate(prev: { sig: string }) {
    if (prev.sig !== this.props.sig && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Erreur de rendu.</strong> {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Aide-mémoire ancré sous l'éditeur. */
function Row({ code, color, desc }: { code: string; color: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <code className="shrink-0 font-mono text-[12px]" style={{ color }}>
        {code}
      </code>
      <span className="text-[12px] leading-snug text-slate-500">{desc}</span>
    </div>
  );
}

const C = { var: "#d97706", tag: "#7c3aed", str: "#059669", fence: "#0891b2", head: "#0f172a" };

function CheatSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="max-h-60 shrink-0 overflow-y-auto border-t border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aide-mémoire syntaxe</span>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <Row code="${VARIABLE}" color={C.var} desc="remplacé par ta config (ambre)" />
        <Row code="<Composant>" color={C.tag} desc="balise maison (violet)" />
        <Row code={'"valeur"'} color={C.str} desc="attribut (vert)" />
        <Row code="```bash" color={C.fence} desc="commande copiable, prompt $" />
        <Row code="```yaml / ini" color={C.fence} desc="extrait de fichier (sans $)" />
        <Row code="## Titre" color={C.head} desc="étape / section (pliable)" />
        <Row code="<Detailed>…</Detailed>" color={C.tag} desc="visible dès le niveau Détaillé" />
        <Row code="<Full>…</Full>" color={C.tag} desc="visible en Exhaustif seulement" />
        <Row code="<Note>…</Note>" color={C.tag} desc="encadré info (dès Détaillé)" />
        <Row code="<Warn>…</Warn>" color={C.tag} desc="avertissement (tous niveaux)" />
        <Row code='<When flag="HAS_DOMAIN">' color={C.tag} desc="affiché si le toggle est ON" />
        <Row code='<When notFlag="HAS_DOMAIN">' color={C.tag} desc="affiché si le toggle est OFF" />
        <Row code='<When is="OS" equals="debian">' color={C.tag} desc="affiché si le select = debian" />
        <Row code="<Automatic>…</Automatic>" color={C.tag} desc="bloc Ansible (niveau Automatique)" />
        <Row code={'<Check cmd="…" expect="…" />'} color={C.tag} desc="vérif d'étape + case à cocher" />
        <Row code="<Checklist><Task>…</Task>" color={C.tag} desc="liste de planning cochable" />
        <Row code='<V name="DOMAIN" />' color={C.tag} desc="variable au milieu d'une phrase" />
      </div>
      <p className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-400">
        Mets des lignes vides autour du contenu à l&apos;intérieur de &lt;When&gt; et &lt;Automatic&gt;. La gouttière à gauche
        permet de replier titres, composants et blocs de code.
      </p>
    </div>
  );
}

/* ── Snippets d'insertion (barre au-dessus de l'éditeur) ──── */
const INSERTS: { label: string; snippet: string }[] = [
  { label: "Étape ##", snippet: "\n## 0X — Titre\n\n" },
  { label: "bash", snippet: "\n```bash\ncommande ${SERVER_IP}\n```\n\n" },
  { label: "fichier", snippet: "\n```ini\nclé = valeur\n```\n\n" },
  { label: "Check", snippet: '\n<Check cmd="commande de vérif" expect="sortie attendue" />\n\n' },
  { label: "Checklist", snippet: "\n<Checklist>\n  <Task>premier point</Task>\n  <Task>second point</Task>\n</Checklist>\n\n" },
  { label: "When", snippet: '\n<When flag="HAS_DOMAIN">\n\ncontenu conditionnel\n\n</When>\n\n' },
  { label: "Diagram", snippet: '\n<Diagram name="ovh-vps" />\n\n' },
  { label: "Note", snippet: "\n<Note>information utile</Note>\n\n" },
  { label: "Warn", snippet: "\n<Warn>avertissement important</Warn>\n\n" },
  { label: "Detailed", snippet: "<Detailed>visible dès Détaillé</Detailed>\n\n" },
  { label: "Full", snippet: "<Full>visible en Exhaustif</Full>\n\n" },
  { label: "<V>", snippet: '<V name="DOMAIN" />' },
];

function InsertBar({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2">
      <Wand2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {INSERTS.map((it) => (
        <button
          key={it.label}
          onClick={() => onInsert(it.snippet)}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11.5px] text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ── Lint des conventions MDX ──────────────────────────────── */
const KNOWN_TAGS = new Set(["Detailed", "Full", "Note", "Warn", "V", "When", "Automatic", "Check", "Checklist", "Task", "Diagram"]);
const PAIRED_TAGS = ["When", "Automatic", "Checklist", "Detailed", "Full", "Note", "Warn", "Task"];

type Lint = { line: number; msg: string };

function lintSource(src: string): Lint[] {
  const out: Lint[] = [];
  const lines = src.split("\n");
  let fence = false;
  let fm = false;
  lines.forEach((ln, i) => {
    const n = i + 1;
    const trimmed = ln.trim();
    // Frontmatter en tête : ignoré par le lint (supporté via remark-frontmatter).
    if (i === 0 && trimmed === "---") {
      fm = true;
      return;
    }
    if (fm) {
      if (trimmed === "---") fm = false;
      return;
    }
    if (/^```/.test(trimmed)) {
      fence = !fence;
      return;
    }
    if (fence) return;
    if (ln.includes("<!--")) out.push({ line: n, msg: "Commentaire HTML <!-- --> interdit en MDX" });
    const openBlock = trimmed.match(/^<(When|Automatic)\b[^>]*>$/);
    if (openBlock && lines[i + 1] !== undefined && lines[i + 1].trim() !== "") out.push({ line: n, msg: `Ajoute une ligne vide après <${openBlock[1]}>` });
    const closeBlock = trimmed.match(/^<\/(When|Automatic)>$/);
    if (closeBlock && i > 0 && lines[i - 1].trim() !== "") out.push({ line: n, msg: `Ajoute une ligne vide avant </${closeBlock[1]}>` });
    for (const m of ln.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
      if (!KNOWN_TAGS.has(m[1])) out.push({ line: n, msg: `Composant inconnu <${m[1]}> — sera une erreur de rendu` });
    }
    if (/\$\{[A-Z_]+\}/.test(ln) && !/=("|\{)/.test(ln) && !trimmed.startsWith("<")) {
      out.push({ line: n, msg: 'Variable ${…} en prose : utilise plutôt <V name="…" /> (ou un bloc de code)' });
    }
  });
  const noFence = src.replace(/```[\s\S]*?```/g, "");
  for (const tag of PAIRED_TAGS) {
    const o = (noFence.match(new RegExp(`<${tag}(\\s[^>]*)?>`, "g")) || []).length;
    const c = (noFence.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (o !== c) out.push({ line: 0, msg: `<${tag}> non équilibré : ${o} ouverture(s) / ${c} fermeture(s)` });
  }
  return out;
}

function LintPanel({ warnings }: { warnings: Lint[] }) {
  if (warnings.length === 0) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-emerald-50/60 px-4 py-2 text-[12px] text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Conventions OK
      </div>
    );
  }
  return (
    <div className="max-h-40 shrink-0 overflow-y-auto border-t border-amber-200 bg-amber-50/70 px-4 py-2">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} convention(s) à revoir
      </div>
      <ul className="space-y-0.5">
        {warnings.map((w, i) => (
          <li key={i} className="text-[12px] leading-snug text-amber-900">
            {w.line > 0 && <span className="mr-1.5 font-mono text-amber-600">L{w.line}</span>}
            {w.msg}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Injecte data-source-line sur les éléments markdown (positions de source)
   pour permettre le clic-vers-ligne depuis l'aperçu. */
function rehypeSourceLine() {
  return (tree: unknown) => {
    const walk = (node: { type?: string; position?: { start?: { line?: number } }; properties?: Record<string, unknown>; children?: unknown[] }) => {
      if (node.type === "element" && node.position?.start?.line) {
        node.properties = node.properties || {};
        node.properties["data-source-line"] = node.position.start.line;
      }
      if (Array.isArray(node.children)) for (const c of node.children) walk(c as typeof node);
    };
    walk(tree as { children?: unknown[] });
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type NewTutoForm = { title: string; slug: string; group: string; summary: string; difficulty: string; useCurrent: boolean };

function NewTutoModal({ onClose, onCreate }: { onClose: () => void; onCreate: (f: NewTutoForm) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [group, setGroup] = useState(TUTO_GROUPS[0] ?? "VPS");
  const [summary, setSummary] = useState("");
  const [difficulty, setDifficulty] = useState("débutant");
  const [useCurrent, setUseCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const effSlug = slugEdited ? slug : slugify(title);
  const valid = title.trim().length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effSlug);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onCreate({ title: title.trim(), slug: effSlug, group: group.trim(), summary: summary.trim(), difficulty, useCurrent });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nouveau tuto</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Titre</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Phase 2 — Users & SSH Hardening"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Slug (URL)</span>
            <input
              value={effSlug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-[13px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Groupe</span>
              <input
                list="tuto-groups"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
              <datalist id="tuto-groups">
                {TUTO_GROUPS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Difficulté</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <option>débutant</option>
                <option>intermédiaire</option>
                <option>avancé</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Résumé (carte)</span>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Une phrase de présentation"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={useCurrent} onChange={(e) => setUseCurrent(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Partir du contenu actuel de l&apos;éditeur
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            <FilePlus className="h-4 w-4" /> {busy ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  const [source, setSource] = useState(STARTER);
  const [Comp, setComp] = useState<{ c: React.ComponentType<{ components: object }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(2);
  const [choices, setChoices] = useState<Choices>({ ...CHOICE_DEFAULTS });
  const [view, setView] = useState<"preview" | "code">("preview");
  const [showCheat, setShowCheat] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const apiRef = useRef<EditorApi | null>(null);
  const warnings = useMemo(() => lintSource(source), [source]);

  // Clic dans l'aperçu -> place le curseur sur la ligne source correspondante.
  const onPreviewClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-source-line]");
    if (!el) return;
    const ln = Number(el.getAttribute("data-source-line"));
    if (!ln) return;
    const m = source.match(/^\ufeff?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    const offset = m ? (m[0].match(/\n/g) || []).length : 0;
    apiRef.current?.goToLine(ln + offset);
  };
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const createTuto = async (f: NewTutoForm) => {
    try {
      const r = await fetch("/api/tuto-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: f.title,
          slug: f.slug,
          group: f.group,
          summary: f.summary,
          difficulty: f.difficulty,
          content: f.useCurrent ? source : "",
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setShowNew(false);
      await loadTuto(j.slug);
    } catch (e) {
      window.alert("Création impossible : " + (e instanceof Error ? e.message : ""));
    }
  };

  const loadTuto = async (slug: string) => {
    if (!slug) return;
    setLoadingSrc(true);
    try {
      const r = await fetch(`/api/tuto-source?slug=${encodeURIComponent(slug)}`);
      if (!r.ok) throw new Error(await r.text());
      setSource(await r.text());
      setEditingSlug(slug);
      window.history.replaceState(null, "", `/editor?slug=${slug}`);
    } catch (e) {
      window.alert("Impossible de charger ce tuto : " + (e instanceof Error ? e.message : ""));
    } finally {
      setLoadingSrc(false);
    }
  };

  const saveTuto = async () => {
    if (!editingSlug) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tuto-source?slug=${encodeURIComponent(editingSlug)}`, {
        method: "POST",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: source,
      });
      if (!r.ok) throw new Error(await r.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      window.alert("Échec de l'enregistrement : " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  // Au montage : si l'URL contient ?slug=..., on charge le tuto publié.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (slug) loadTuto(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const components = useMDXComponents({});

  // Compile le MDX dans le navigateur (debounce 300 ms).
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const clean = source.replace(/^\ufeff?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
        const mod: any = await evaluate(clean, { ...(runtime as any), development: false, rehypePlugins: [rehypeSourceLine] });
        if (!cancelled) {
          setComp({ c: mod.default });
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [source]);

  const docState: DocState = useMemo(
    () => ({
      vars: DEFAULTS,
      choices,
      level,
      flashing: null,
      presets: [],
      activeId: "",
      setVar: () => {},
      setChoice: (k, v) => setChoices((c) => ({ ...c, [k]: v })),
      setLevel,
      newPreset: () => {},
      renamePreset: () => {},
      deletePreset: () => {},
      selectPreset: () => {},
      exportPresets: () => {},
      importPresets: () => {},
      requestEdit: () => {},
      done,
      toggleDone: (id: string) => setDone((d) => ({ ...d, [id]: !d[id] })),
      highlightKey: null,
      setHighlight: () => {},
    }),
    [choices, level, done]
  );

  const downloadMdx = () => {
    const name = window.prompt("Nom du fichier :", (editingSlug || "mon-tuto") + ".mdx") || "mon-tuto.mdx";
    const blob = new Blob([source], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.endsWith(".mdx") ? name : name + ".mdx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      {/* En-tête */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Code2 className="h-5 w-5 text-cyan-600" />
        <span className="font-semibold tracking-tight">Éditeur de tuto</span>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <BookOpen className="h-4 w-4" /> Voir la doc
        </Link>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <FilePlus className="h-4 w-4" /> Nouveau
        </button>

        {/* Bascule aperçu/code sur mobile */}
        <div className="ml-auto flex rounded-lg border border-slate-200 bg-slate-50 p-1 lg:hidden">
          {(["preview", "code"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={"rounded-md px-3 py-1 text-xs font-medium " + (view === v ? "bg-white shadow-sm" : "text-slate-500")}
            >
              {v === "preview" ? "Aperçu" : "Code"}
            </button>
          ))}
        </div>

        {editingSlug && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Modification de {editingSlug}.mdx{loadingSrc ? " · chargement…" : ""}
          </span>
        )}

        <label className="relative inline-flex items-center">
          <FolderOpen className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" />
          <select
            value=""
            onChange={(e) => loadTuto(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none"
          >
            <option value="">Ouvrir un tuto publié…</option>
            {TUTOS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.group} — {t.title}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setShowCheat((s) => !s)}
          className={
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm " +
            (showCheat ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          <Keyboard className="h-4 w-4" /> Syntaxe
        </button>
        {editingSlug && (
          <button
            onClick={saveTuto}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-100 disabled:opacity-60"
          >
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Enregistré" : saving ? "…" : "Enregistrer"}
          </button>
        )}
        <button
          onClick={downloadMdx}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          <FileDown className="h-4 w-4" /> Télécharger .mdx
        </button>
      </header>

      {/* Aperçu à gauche, code à droite */}
      <div className="flex min-h-0 flex-1">
        {/* APERÇU */}
        <section className={"min-h-0 flex-1 overflow-y-auto border-r border-slate-200 " + (view === "code" ? "hidden lg:block" : "")}>
          {/* Barre de contrôle de l'aperçu */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2 backdrop-blur">
            <Eye className="h-4 w-4 text-slate-400" />
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={"rounded-md px-2 py-1 text-xs font-medium " + (level === l.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {CHOICES.filter((c) => c.type === "boolean").map((c) => (
              <button
                key={c.key}
                onClick={() => setChoices((ch) => ({ ...ch, [c.key]: !ch[c.key] }))}
                className={
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition " +
                  (choices[c.key] ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-400")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-5">
            <DocContext.Provider value={docState}>
              <div className="doc-body cursor-text" data-level={level} onClick={onPreviewClick} title="Clique pour aller à la ligne dans le code">
                <Boundary sig={source}>{Comp ? <Comp.c components={components} /> : null}</Boundary>
              </div>
            </DocContext.Provider>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <strong>Erreur de compilation.</strong> {error}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CODE */}
        <section className={"flex min-h-0 flex-1 flex-col " + (view === "preview" ? "hidden lg:flex" : "flex")}>
          <InsertBar onInsert={(t) => apiRef.current?.insert(t)} />
          <div className="min-h-0 flex-1">
            <CodeEditor value={source} onChange={setSource} apiRef={apiRef} />
          </div>
          <LintPanel warnings={warnings} />
          {showCheat && <CheatSheet onClose={() => setShowCheat(false)} />}
        </section>
      </div>
      {showNew && <NewTutoModal onClose={() => setShowNew(false)} onCreate={createTuto} />}
    </div>
  );
}
