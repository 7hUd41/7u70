"use client";

import { ReactNode, isValidElement, useState } from "react";
import { Info, AlertTriangle, Sparkles, Check as CheckIcon, Copy } from "lucide-react";
import { useDoc, fill } from "./doc-context";
import { Tokenized } from "./Tokenized";

/* Visible à partir du niveau Détaillé (2). */
export function Detailed({ children }: { children: ReactNode }) {
  const { level } = useDoc();
  if (level < 2) return null;
  return <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">{children}</p>;
}

/* Visible uniquement au niveau Exhaustif (3). */
export function Full({ children }: { children: ReactNode }) {
  const { level } = useDoc();
  if (level < 3) return null;
  return <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">{children}</p>;
}

/* Encadré d'info, visible à partir du niveau Détaillé. */
export function Note({ children }: { children: ReactNode }) {
  const { level } = useDoc();
  if (level < 2) return null;
  return (
    <div className="my-4 flex max-w-2xl items-start gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-[14px] leading-relaxed text-cyan-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
      <div>{children}</div>
    </div>
  );
}

/* Avertissement, visible à tous les niveaux (sécurité = important). */
export function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 flex max-w-2xl items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] leading-relaxed text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>{children}</div>
    </div>
  );
}

/* Pastille de variable dans la prose : <V name="DOMAIN" /> (cliquable) */
export function V({ name }: { name: string }) {
  return <Tokenized template={"${" + name + "}"} />;
}

/* ── Contenu conditionnel ─────────────────────────────────────
   <When flag="HAS_DOMAIN"> ... </When>      (si vrai)
   <When notFlag="HAS_DOMAIN"> ... </When>   (si faux)
   <When is="OS" equals="debian"> ... </When>
   ──────────────────────────────────────────────────────────── */
export function When({
  flag,
  notFlag,
  is,
  equals,
  children,
}: {
  flag?: string;
  notFlag?: string;
  is?: string;
  equals?: string;
  children: ReactNode;
}) {
  const { choices } = useDoc();
  let show = true;
  if (flag) show = Boolean(choices[flag]);
  else if (notFlag) show = !choices[notFlag];
  else if (is && equals !== undefined) show = choices[is] === equals;
  if (!show) return null;
  return <>{children}</>;
}

/* ── Bloc « Automatique » (mode Ansible) ──────────────────────
   Visible uniquement au niveau 0. La visibilité est pilotée par
   le CSS (.automatic-block) pour pouvoir masquer tout le reste. */
export function Automatic({ children }: { children: ReactNode }) {
  return (
    <div className="automatic-block">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[14px] text-violet-900">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
        <span>
          Mode automatique : un seul playbook Ansible fait tout. Renseigne ta config à gauche, télécharge le
          fichier et lance-le.
        </span>
      </div>
      {children}
    </div>
  );
}


/* ── Vérification d'étape + checkbox de progression ───────────
   <Check cmd="ufw status" expect="Status: active" />
   - cmd    : commande de vérification (injection ${VAR} + copie remplie)
   - expect : le « retour de prompt » attendu (optionnel, multi-lignes OK)
   - id     : identifiant d'étape stable (optionnel ; sinon dérivé du cmd)
   La case cochée est persistée par serveur (localStorage). Le bloc n'est PAS
   marqué data-kind="shell" -> il n'entre jamais dans install.sh / le playbook.
   Masqué au niveau Automatique via le CSS .doc-body[data-level="0"]. */
function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return "chk_" + (h >>> 0).toString(36);
}

export function Check({ cmd, expect, id }: { cmd: string; expect?: string; id?: string }) {
  const { level, vars, done, toggleDone } = useDoc();
  const [copied, setCopied] = useState(false);
  if (level < 1) return null; // jamais en mode Automatique

  const stepId = id || hashId(cmd);
  const isDone = Boolean(done[stepId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fill(cmd, vars));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      data-check={stepId}
      data-done={isDone ? "true" : "false"}
      className={
        "my-4 max-w-2xl rounded-xl border transition-colors " +
        (isDone ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 bg-white")
      }
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          onClick={() => toggleDone(stepId)}
          title={isDone ? "Étape faite — décocher" : "Marquer cette étape comme faite"}
          className={
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition " +
            (isDone
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-emerald-400")
          }
        >
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span
              className={
                "text-[11px] font-semibold uppercase tracking-wider " +
                (isDone ? "text-emerald-700" : "text-slate-400")
              }
            >
              {isDone ? "Vérifié" : "Vérification"}
            </span>
            <button
              onClick={copy}
              aria-label="Copier la commande"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-3 w-3 text-emerald-600" /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copier
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-slate-100">
            <span className="mr-2 select-none text-slate-600">$</span>
            <Tokenized template={cmd} dark />
          </div>

          {expect && (
            <div className="mt-1.5 flex items-start gap-2">
              <span className="mt-0.5 select-none text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Retour&nbsp;attendu
              </span>
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-100 px-2.5 py-1.5 font-mono text-[12px] leading-relaxed text-slate-600">
                <Tokenized template={expect} />
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── Liste de planning cochable (objectifs / plan / etc.) ─────
   Différent de <Check> (qui vérifie une COMMANDE). Ici ce sont des
   intentions/étapes que le lecteur coche au fil de l'eau.
   <Checklist>
     <Task>objectif A</Task>
     <Task>objectif B</Task>
   </Checklist>
   Persisté par (serveur, tuto) comme les <Check>, mais marqué data-task
   pour ne PAS gonfler la barre de progression des vérifications. */
function nodeText(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join("");
  if (isValidElement(n)) return nodeText((n.props as { children?: ReactNode }).children);
  return "";
}

export function Checklist({ children }: { children: ReactNode }) {
  return <div className="my-4 max-w-2xl space-y-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">{children}</div>;
}

export function Task({ id, children }: { id?: string; children: ReactNode }) {
  const { done, toggleDone } = useDoc();
  const stepId = id || "task_" + hashId(nodeText(children));
  const isDone = Boolean(done[stepId]);
  return (
    <div data-task={stepId} data-done={isDone ? "true" : "false"} className="flex items-start gap-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        onClick={() => toggleDone(stepId)}
        className={
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition " +
          (isDone ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-cyan-400")
        }
      >
        <CheckIcon className="h-3 w-3" strokeWidth={3} />
      </button>
      <span className={"text-[14px] leading-relaxed " + (isDone ? "text-slate-400 line-through" : "text-slate-700")}>{children}</span>
    </div>
  );
}
