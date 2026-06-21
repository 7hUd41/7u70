"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Server,
  ShieldCheck,
  Container,
  Network,
  HardDrive,
  ShieldX,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Download,
  Upload,
  Copy,
  Check,
  FileDown,
  PenSquare,
  BookOpen,
  Clock,
  User,
  CalendarDays,
} from "lucide-react";
import {
  DocContext,
  FIELDS,
  GROUPS,
  CHOICES,
  DEFAULTS,
  CHOICE_DEFAULTS,
  LEVELS,
  fill,
  fieldOf,
  validateField,
  newId,
  type Vars,
  type Preset,
  type DocState,
  type EditTarget,
} from "./doc-context";
import { TUTOS, TUTO_GROUPS, tutoBySlug, tutosByGroup, tutoNeighbors, type Tuto } from "@/lib/tutos";
import { splitFrontmatter, readingMinutes, type TutoMeta } from "@/lib/frontmatter";

const STORAGE_KEY = "vps-doc-state-v1";
const PROGRESS_KEY = "vps-doc-progress-v1";

const ICONS: Record<string, typeof Server> = {
  Server,
  ShieldCheck,
  Container,
  Network,
  HardDrive,
  ShieldX,
};

function makePreset(name: string): Preset {
  return { id: newId(), name, vars: { ...DEFAULTS }, choices: { ...CHOICE_DEFAULTS } };
}

function slugFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "ovh-vps";
}

/* ── Nav de gauche : catalogue des tutos, groupé ──────────── */
function TutoNav({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="space-y-5">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <BookOpen className="h-4 w-4" /> Tous les tutos
      </Link>
      {TUTO_GROUPS.map((group) => (
        <div key={group}>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</div>
          <div className="space-y-0.5">
            {tutosByGroup(group).map((t) => {
              const Icon = ICONS[t.icon] ?? Server;
              const active = t.slug === activeSlug;
              return (
                <Link
                  key={t.slug}
                  href={`/${t.slug}`}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition " +
                    (active ? "bg-slate-900 font-medium text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                  }
                >
                  <Icon className={"h-4 w-4 shrink-0 " + (active ? "text-white" : "text-slate-400")} />
                  <span className="min-w-0 truncate">{t.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ── Fil d'Ariane ─────────────────────────────────────────── */
function Breadcrumb({ tuto }: { tuto?: Tuto }) {
  return (
    <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-400">
      <Link href="/" className="hover:text-slate-700">
        Accueil
      </Link>
      {tuto && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span>{tuto.group}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-600">{tuto.title}</span>
        </>
      )}
    </nav>
  );
}

/* ── Barre de progression globale (compte les <Check>) ────── */
function ProgressBar({ trigger }: { trigger: string }) {
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".doc-body [data-check]"));
      setTotal(nodes.length);
      setDone(nodes.filter((n) => n.getAttribute("data-done") === "true").length);
    }, 30);
    return () => clearTimeout(id);
  }, [trigger]);

  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const all = done === total;

  const jumpNext = () => {
    const next = Array.from(document.querySelectorAll<HTMLElement>(".doc-body [data-check]")).find(
      (n) => n.getAttribute("data-done") !== "true"
    );
    const target = next?.closest("h2, [data-check]")?.previousElementSibling ?? next;
    (next ?? target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-700">
          {all ? "Terminé 🎉" : "Progression"} <span className="text-slate-400">· {done}/{total} étapes</span>
        </span>
        {!all && (
          <button onClick={jumpNext} className="text-[12px] font-medium text-cyan-700 hover:text-cyan-900">
            Reprendre où j&apos;en étais →
          </button>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={"h-full rounded-full transition-all duration-500 " + (all ? "bg-emerald-500" : "bg-cyan-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── TOC de droite : sommaire de la page (h2) + scrollspy ─── */
function Toc({ trigger }: { trigger: string }) {
  const [items, setItems] = useState<{ id: string; text: string }[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      const hs = Array.from(document.querySelectorAll<HTMLHeadingElement>(".doc-body h2"));
      const list = hs.map((h) => {
        if (!h.id) {
          h.id =
            (h.textContent || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "") || "section";
        }
        h.style.scrollMarginTop = "84px";
        return { id: h.id, text: h.textContent || "" };
      });
      setItems(list);
      const obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && setActive((e.target as HTMLElement).id)),
        { rootMargin: "-15% 0px -75% 0px" }
      );
      hs.forEach((h) => obs.observe(h));
      return () => obs.disconnect();
    }, 40);
    return () => clearTimeout(id);
  }, [trigger]);

  if (items.length === 0) return null;
  return (
    <nav className="space-y-1 border-l border-slate-200 pl-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sur cette page</div>
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className={
            "block truncate py-0.5 text-[12.5px] transition " +
            (active === it.id ? "font-medium text-cyan-700" : "text-slate-500 hover:text-slate-900")
          }
        >
          {it.text}
        </a>
      ))}
    </nav>
  );
}

function PresetBar({ doc }: { doc: DocState }) {
  const { presets, activeId } = doc;
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Serveur</span>
        <div className="flex items-center gap-1">
          <button onClick={doc.newPreset} title="Nouveau serveur" className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              const name = window.prompt("Renommer ce serveur :", presets.find((p) => p.id === activeId)?.name);
              if (name) doc.renamePreset(activeId, name);
            }}
            title="Renommer"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (presets.length > 1 && window.confirm("Supprimer ce serveur ?")) doc.deletePreset(activeId);
            }}
            title="Supprimer"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
            disabled={presets.length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <select
        value={activeId}
        onChange={(e) => doc.selectPreset(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="mt-1.5 flex gap-1.5">
        <button onClick={doc.exportPresets} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Exporter
        </button>
        <button onClick={() => fileInput.current?.click()} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" /> Importer
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doc.importPresets(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ChoiceControls({ doc }: { doc: DocState }) {
  const { choices } = doc;
  return (
    <div className="space-y-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ta stack</span>
      {CHOICES.map((c) =>
        c.type === "boolean" ? (
          <label key={c.key} className="flex cursor-pointer items-center justify-between gap-2 text-[13px] text-slate-700">
            <span>{c.label}</span>
            <button
              role="switch"
              aria-checked={Boolean(choices[c.key])}
              onClick={() => doc.setChoice(c.key, !choices[c.key])}
              className={"relative h-5 w-9 shrink-0 rounded-full transition " + (choices[c.key] ? "bg-cyan-600" : "bg-slate-300")}
            >
              <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition " + (choices[c.key] ? "left-4" : "left-0.5")} />
            </button>
          </label>
        ) : (
          <label key={c.key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{c.label}</span>
            <select
              value={String(choices[c.key])}
              onChange={(e) => doc.setChoice(c.key, e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )
      )}
    </div>
  );
}

/* Champ avec survol -> surlignage des jetons correspondants. */
function Field({ doc, fieldKey, showHint, showImpact }: { doc: DocState; fieldKey: string; showHint: boolean; showImpact: boolean }) {
  const f = fieldOf(fieldKey);
  if (!f) return null;
  const lit = doc.highlightKey === f.key;
  const value = doc.vars[f.key] ?? "";
  const err = validateField(f.key, value);
  return (
    <label className="block" onMouseEnter={() => doc.setHighlight(f.key)} onMouseLeave={() => doc.setHighlight(null)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
      <input
        value={value}
        onChange={(e) => doc.setVar(f.key, e.target.value)}
        placeholder={f.placeholder}
        spellCheck={false}
        aria-invalid={err ? true : undefined}
        className={
          "w-full rounded-lg border bg-white px-3 py-2 font-mono text-[13px] text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 " +
          (err
            ? "border-red-400 ring-red-200 focus:border-red-500 focus:ring-red-300/40"
            : lit
              ? "border-amber-400 ring-2 ring-amber-300/50 focus:border-cyan-500 focus:ring-cyan-500/30"
              : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500/30")
        }
      />
      {err ? (
        <span className="mt-1 block text-[11px] font-medium leading-snug text-red-600">{err}</span>
      ) : (
        showHint && <span className="mt-1 block text-[11px] leading-snug text-slate-400">{f.hint}</span>
      )}
      {showImpact && <span className="mt-1.5 block border-l-2 border-amber-300 pl-2 text-[11px] leading-snug text-slate-500">{f.impact}</span>}
    </label>
  );
}

function ConfigPanel({ doc, showHints, fields }: { doc: DocState; showHints: boolean; fields: typeof FIELDS[number][] }) {
  return (
    <div className="space-y-4">
      <PresetBar doc={doc} />
      <div className="grid gap-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} doc={doc} fieldKey={f.key} showHint={showHints} showImpact={false} />
        ))}
      </div>
      <div className="border-t border-slate-100 pt-3">
        <ChoiceControls doc={doc} />
      </div>
    </div>
  );
}

function ConfigBlocks({ doc, detailed, fields }: { doc: DocState; detailed: boolean; fields: typeof FIELDS[number][] }) {
  const groups = GROUPS.map((g) => ({ g, items: fields.filter((f) => f.group === g.id) })).filter((x) => x.items.length > 0);
  return (
    <div>
      <div className="mb-4">
        <PresetBar doc={doc} />
      </div>
      <div className={"grid gap-4 " + (groups.length >= 3 ? "md:grid-cols-3" : groups.length === 2 ? "md:grid-cols-2" : "")}>
        {groups.map(({ g, items }) => (
          <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-800">{g.label}</h3>
            <p className="mb-3 text-[12px] text-slate-500">{g.desc}</p>
            <div className="space-y-3">
              {items.map((f) => (
                <Field key={f.key} doc={doc} fieldKey={f.key} showHint={true} showImpact={detailed} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <ChoiceControls doc={doc} />
      </div>
    </div>
  );
}

/* Carte de config repliable, en tête de contenu (tous niveaux). */
function ConfigCard({ doc, allowedVars }: { doc: DocState; allowedVars?: string[] }) {
  const [open, setOpen] = useState(true);
  const { level } = doc;
  // allowedVars défini -> on filtre ; vide -> ce tuto n'a pas de config.
  const fields = allowedVars ? FIELDS.filter((f) => allowedVars.includes(f.key)) : (FIELDS as unknown as typeof FIELDS[number][]);
  if (allowedVars && fields.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Ta configuration</h2>
          <p className="text-[13px] text-slate-500">
            {level >= 2 ? "Organisée par zone d'architecture — tout le tuto s'y adapte." : "Renseigne tes valeurs : chaque commande se remplit toute seule."}
          </p>
        </div>
        <ChevronDown className={"h-5 w-5 shrink-0 text-slate-400 transition " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="mt-4">{level >= 2 ? <ConfigBlocks doc={doc} detailed={level >= 3} fields={fields} /> : <ConfigPanel doc={doc} showHints={level >= 1} fields={fields} />}</div>}
    </section>
  );
}

function Toolbar({ doc, title }: { doc: DocState; title: string }) {
  const { level, vars } = doc;
  const [copied, setCopied] = useState(false);

  const collectShell = (): string[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.doc-body [data-kind="shell"]'))
      .filter((n) => !n.closest(".automatic-block"))
      .map((n) => fill(n.getAttribute("data-cmd") || "", vars))
      .filter(Boolean);

  const collectPlaybook = (): string => {
    const node = document.querySelector<HTMLElement>('.automatic-block [data-kind="yaml"], .automatic-block [data-kind="yml"]');
    if (node) return fill(node.getAttribute("data-cmd") || "", vars);
    // Pas de YAML : on retombe sur le bash consolidé du bloc Automatique.
    const sh = Array.from(document.querySelectorAll<HTMLElement>('.automatic-block [data-kind="shell"]'))
      .map((n) => fill(n.getAttribute("data-cmd") || "", vars))
      .filter(Boolean);
    return sh.join("\n");
  };

  const buildScript = () =>
    `#!/usr/bin/env bash\nset -euo pipefail\n# ${title} — ${vars.HOSTNAME || "serveur"}\n\n` + collectShell().join("\n") + "\n";

  const download = (content: string, name: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    const text = level === 0 ? collectPlaybook() : collectShell().join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {level !== 0 && (
        <span className="mr-auto inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Clique une valeur surlignée pour la corriger partout
        </span>
      )}
      {level === 0 && <span className="mr-auto" />}
      <button onClick={copyAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {level === 0 ? "Copier le playbook" : "Tout copier"}
      </button>
      <button
        onClick={() => (level === 0 ? download(collectPlaybook(), "playbook.yml") : download(buildScript(), "install.sh"))}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
      >
        <FileDown className="h-3.5 w-3.5" />
        {level === 0 ? "playbook.yml" : "install.sh"}
      </button>
    </div>
  );
}

function VarEditor({ edit, vars, setVar, onClose }: { edit: NonNullable<EditTarget>; vars: Vars; setVar: (k: string, v: string) => void; onClose: () => void }) {
  const f = fieldOf(edit.key);
  const vErr = validateField(edit.key, vars[edit.key] ?? "");
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const top = Math.min(edit.rect.bottom + 6, vh - 170);
  const left = Math.max(8, Math.min(edit.rect.left, vw - 280));
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={{ top, left }}>
        <div className="mb-1 text-xs font-semibold text-slate-800">{f?.label ?? edit.key}</div>
        {f?.hint && <p className="mb-2 text-[11px] leading-snug text-slate-500">{f.hint}</p>}
        <input
          autoFocus
          value={vars[edit.key] ?? ""}
          onChange={(e) => setVar(edit.key, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") onClose();
          }}
          spellCheck={false}
          className={
            "w-full rounded-lg border px-2.5 py-1.5 font-mono text-[13px] text-slate-900 focus:outline-none focus:ring-2 " +
            (vErr ? "border-red-400 focus:border-red-500 focus:ring-red-300/40" : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500/30")
          }
        />
        {vErr ? (
          <div className="mt-1.5 text-[11px] font-medium text-red-600">{vErr}</div>
        ) : (
          <div className="mt-1.5 text-[11px] text-slate-400">S&apos;applique à tout le document.</div>
        )}
      </div>
    </>
  );
}

/* ── Navigation de série : précédent / suivant dans le groupe ─ */
function SeriesNav({ slug }: { slug: string }) {
  const { prev, next } = tutoNeighbors(slug);
  if (!prev && !next) return null;
  return (
    <nav className="mt-10 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
      {prev ? (
        <Link href={`/${prev.slug}`} className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <span className="mb-1 inline-flex items-center gap-1 text-[12px] text-slate-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Précédent
          </span>
          <span className="font-medium text-slate-800">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={`/${next.slug}`} className="group flex flex-col rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-right shadow-sm transition hover:border-cyan-300 hover:shadow-md sm:items-end">
          <span className="mb-1 inline-flex items-center gap-1 text-[12px] text-cyan-700">
            Suivant <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-cyan-900">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

/* ── Barre de métadonnées (sous le fil d'Ariane) ──────────── */
const DIFF_TONE: Record<string, string> = {
  "débutant": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "intermédiaire": "border-amber-200 bg-amber-50 text-amber-700",
  "avancé": "border-rose-200 bg-rose-50 text-rose-700",
};

function fmtDate(s?: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function MetaBar({ meta, minutes }: { meta: TutoMeta | null; minutes: number | null }) {
  if (!meta && minutes == null) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-4 text-[12.5px] text-slate-500">
      {minutes != null && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" /> ~{minutes} min de lecture
        </span>
      )}
      {meta?.author && (
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" /> {meta.author}
        </span>
      )}
      {meta?.created && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> créé le {fmtDate(meta.created)}
          {meta.edited ? ` · màj ${fmtDate(meta.edited)}` : ""}
        </span>
      )}
      {meta?.difficulty && (
        <span className={"rounded-full border px-2 py-0.5 text-[11px] font-medium " + (DIFF_TONE[meta.difficulty] ?? "border-slate-200 bg-slate-50 text-slate-600")}>
          {meta.difficulty}
        </span>
      )}
      {meta?.tags && meta.tags.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {meta.tags.map((t) => (
            <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">#{t}</span>
          ))}
        </span>
      )}
    </div>
  );
}

/* ── Barre de progression de lecture (bas de page) ────────── */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 h-[3px] bg-slate-200/40">
      <div className="h-full bg-cyan-500 transition-[width] duration-75" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Catalogue d'accueil (route "/") ──────────────────────── */
function Catalogue({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Server className="h-5 w-5 text-cyan-600" />
          <span className="font-semibold tracking-tight">{title}</span>
          <Link href="/editor" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            <PenSquare className="h-3.5 w-3.5" /> Éditeur
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tutos adaptatifs</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
          Des guides serveur &amp; homelab qui s&apos;adaptent à toi : renseigne ta config une fois, chaque commande se
          remplit avec tes valeurs. Choisis ton niveau de lecture, coche tes étapes, exporte un script.
        </p>
        {TUTO_GROUPS.map((group) => (
          <section key={group} className="mt-9">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tutosByGroup(group).map((t) => {
                const Icon = ICONS[t.icon] ?? Server;
                return (
                  <Link
                    key={t.slug}
                    href={`/${t.slug}`}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-semibold tracking-tight text-slate-900">{t.title}</div>
                        <div className="text-[12px] text-slate-400">~{t.minutes} min</div>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-600">{t.summary}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export default function DocShell({ title = "Doc adaptative", children }: { title?: string; children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const slug = slugFromPath(pathname);
  const tuto = tutoBySlug(slug);

  const [presets, setPresets] = useState<Preset[]>([makePreset("Mon VPS OVH")]);
  const [activeId, setActiveId] = useState<string>("");
  const [level, setLevel] = useState(2);
  const [flashing, setFlashing] = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [edit, setEdit] = useState<EditTarget>(null);
  const [progress, setProgress] = useState<Record<string, Record<string, boolean>>>({});
  const [meta, setMeta] = useState<TutoMeta | null>(null);
  const [readMin, setReadMin] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.presets) && data.presets.length) {
          setPresets(data.presets);
          setActiveId(data.presets.some((p: Preset) => p.id === data.activeId) ? data.activeId : data.presets[0].id);
          if (typeof data.level === "number") setLevel(data.level);
          setHydrated(true);
          return;
        }
      }
    } catch {}
    setActiveId((p) => p || presets[0].id);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ presets, activeId, level }));
    } catch {}
  }, [presets, activeId, level, hydrated]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") setProgress(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress, hydrated]);

  useEffect(() => {
    if (!edit) return;
    const close = () => setEdit(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [edit]);

  // Métadonnées : on relit la source brute du tuto (frontmatter) via l'API.
  useEffect(() => {
    if (isHome) {
      setMeta(null);
      setReadMin(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/tuto-source?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((raw) => {
        if (cancelled) return;
        const { meta: fm, body } = splitFrontmatter(raw);
        setMeta(fm);
        setReadMin(readingMinutes(body));
      })
      .catch(() => {
        if (!cancelled) {
          setMeta(null);
          setReadMin(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isHome]);

  const active = presets.find((p) => p.id === activeId) ?? presets[0];
  const vars = active.vars;
  const choices = active.choices;
  // Progression propre au couple (serveur, tuto).
  const progressKey = `${active.id}::${slug}`;
  const done = progress[progressKey] ?? {};

  const toggleDone = (stepId: string) =>
    setProgress((pr) => {
      const cur = pr[progressKey] ?? {};
      return { ...pr, [progressKey]: { ...cur, [stepId]: !cur[stepId] } };
    });

  const patchActive = (patch: Partial<Preset>) => setPresets((ps) => ps.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));

  const setVar = (key: string, value: string) => {
    patchActive({ vars: { ...vars, [key]: value } });
    setFlashing(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashing(null), 600);
  };
  const setChoice = (key: string, value: string | boolean) => patchActive({ choices: { ...choices, [key]: value } });

  const newPreset = () => {
    const p = makePreset("Nouveau serveur");
    setPresets((ps) => [...ps, p]);
    setActiveId(p.id);
  };
  const renamePreset = (id: string, name: string) => setPresets((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  const deletePreset = (id: string) =>
    setPresets((ps) => {
      const next = ps.filter((p) => p.id !== id);
      if (id === activeId && next.length) setActiveId(next[0].id);
      return next;
    });
  const selectPreset = (id: string) => setActiveId(id);

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify({ presets }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vps-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importPresets = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.presets) && data.presets.length) {
          setPresets(data.presets);
          setActiveId(data.presets[0].id);
        }
      } catch {
        window.alert("Fichier de présets invalide.");
      }
    };
    reader.readAsText(file);
  };

  const doc: DocState = {
    vars,
    choices,
    level,
    flashing,
    presets,
    activeId: active.id,
    setVar,
    setChoice,
    setLevel,
    newPreset,
    renamePreset,
    deletePreset,
    selectPreset,
    exportPresets,
    importPresets,
    requestEdit: (key, rect) => setEdit({ key, rect }),
    done,
    toggleDone,
    highlightKey,
    setHighlight: setHighlightKey,
  };

  // Déclencheur de recalcul du TOC / progression : change quand le contenu visible change.
  const trigger = useMemo(
    () => `${slug}|${level}|${JSON.stringify(choices)}|${JSON.stringify(done)}`,
    [slug, level, choices, done]
  );

  if (isHome) return <Catalogue title={title} />;

  return (
    <DocContext.Provider value={doc}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setNavOpen((o) => !o)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Menu">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <Server className="h-5 w-5 text-cyan-600" />
            <span className="font-semibold tracking-tight">{title}</span>
            <Link href="/editor" className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 sm:inline-flex">
              <PenSquare className="h-3.5 w-3.5" /> Éditeur
            </Link>
            {tuto && (
              <Link
                href={`/editor?slug=${tuto.slug}`}
                className="hidden items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-800 shadow-sm hover:bg-cyan-100 sm:inline-flex"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier ce tuto
              </Link>
            )}
            <div className="ml-auto flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  title={l.hint}
                  className={"rounded-lg px-2 py-1.5 text-xs font-medium transition sm:px-2.5 " + (level === l.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          {navOpen && (
            <div className="max-h-[70vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
              <TutoNav activeSlug={slug} />
            </div>
          )}
        </header>

        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
              <TutoNav activeSlug={slug} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <Breadcrumb tuto={tuto} />
            <MetaBar meta={meta} minutes={readMin ?? tuto?.minutes ?? null} />
            <Toolbar doc={doc} title={tuto?.title ?? title} />
            <ProgressBar trigger={trigger} />
            <ConfigCard doc={doc} allowedVars={meta?.vars} />
            <div className="doc-body" data-level={level}>
              {children}
            </div>
            {tuto && <SeriesNav slug={slug} />}
          </main>

          <aside className="hidden w-48 shrink-0 xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <Toc trigger={trigger} />
            </div>
          </aside>
        </div>
      </div>

      {edit && <VarEditor edit={edit} vars={vars} setVar={setVar} onClose={() => setEdit(null)} />}
      <ReadingProgress />
    </DocContext.Provider>
  );
}
