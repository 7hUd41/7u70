"use client";

/* ──────────────────────────────────────────────────────────────
   Reader state
   - level      : global reading depth (persisted once for the site)
   - profile    : the reader's values for this tutorial (vars + choices)
   - progress   : checks marked done, per tutorial
   - highlight  : variable currently hovered (field <-> tokens)
   - flash      : variable just edited, briefly emphasised
   - editing    : token the reader clicked, to edit inline
   Persistence is localStorage; the first render uses defaults so the
   server and client markup match, then the stored state is applied.
   ────────────────────────────────────────────────────────────── */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_LEVEL, defaultsOf, isLevel, type ChoiceValue, type Level, type Locale, type TutoContract } from "@/engine";
import { dict, type Dict } from "@/i18n";

export type Profile = { vars: Record<string, string>; choices: Record<string, ChoiceValue> };

export type EditTarget = { key: string; rect: { top: number; bottom: number; left: number } } | null;

export type ReaderState = {
  id: string;
  locale: Locale;
  t: Dict;
  contract: TutoContract;
  level: Level;
  setLevel: (l: Level) => void;
  vars: Profile["vars"];
  choices: Profile["choices"];
  setVar: (key: string, value: string) => void;
  setChoice: (key: string, value: ChoiceValue) => void;
  resetProfile: () => void;
  done: Record<string, boolean>;
  toggleDone: (id: string) => void;
  highlight: string | null;
  setHighlight: (k: string | null) => void;
  flash: string | null;
  editing: EditTarget;
  requestEdit: (key: string, rect: EditTarget extends null ? never : NonNullable<EditTarget>["rect"]) => void;
  closeEdit: () => void;
  hydrated: boolean;
};

const Ctx = createContext<ReaderState | null>(null);

export function useReader(): ReaderState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useReader must be used inside <ReaderProvider>");
  return s;
}

const LEVEL_KEY = "at:level";
/* Values and choices are shared by the whole series (declared once, filled once). */
const profileKey = (id: string) => `at:profile:${id.split("/")[0]}`;
const progressKey = (id: string) => `at:progress:${id}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: state stays in memory */
  }
}

export function ReaderProvider({ id, locale, contract, children }: { id: string; locale: Locale; contract: TutoContract; children: ReactNode }) {
  const defaults = useMemo(() => defaultsOf(contract), [contract]);
  const [level, setLevelState] = useState<Level>(DEFAULT_LEVEL);
  const [profile, setProfile] = useState<Profile>(defaults);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [highlight, setHighlight] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [hydrated, setHydrated] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state once, after the first paint. Reading storage in an
  // effect (not during render) is what keeps server and client markup equal.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydration from storage */
    const l = readJson<string>(LEVEL_KEY);
    if (isLevel(l)) setLevelState(l);
    const p = readJson<Profile>(profileKey(id));
    if (p && p.vars && p.choices) {
      // Merge so a variable added to the contract later gets its default.
      setProfile({ vars: { ...defaults.vars, ...p.vars }, choices: { ...defaults.choices, ...p.choices } });
    }
    const d = readJson<Record<string, boolean>>(progressKey(id));
    if (d) setDone(d);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id, defaults]);

  useEffect(() => {
    if (hydrated) writeJson(LEVEL_KEY, level);
  }, [level, hydrated]);
  useEffect(() => {
    if (hydrated) writeJson(profileKey(id), profile);
  }, [profile, id, hydrated]);
  useEffect(() => {
    if (hydrated) writeJson(progressKey(id), done);
  }, [done, id, hydrated]);

  // Any scroll closes the inline editor.
  useEffect(() => {
    if (!editing) return;
    const close = () => setEditing(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [editing]);

  const setLevel = useCallback((l: Level) => setLevelState(l), []);

  const setVar = useCallback((key: string, value: string) => {
    setProfile((p) => ({ ...p, vars: { ...p.vars, [key]: value } }));
    setFlash(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 500);
  }, []);

  const setChoice = useCallback((key: string, value: ChoiceValue) => {
    setProfile((p) => ({ ...p, choices: { ...p.choices, [key]: value } }));
  }, []);

  const resetProfile = useCallback(() => setProfile(defaults), [defaults]);

  const toggleDone = useCallback((stepId: string) => setDone((d) => ({ ...d, [stepId]: !d[stepId] })), []);

  const value: ReaderState = {
    id,
    locale,
    t: dict(locale),
    contract,
    level,
    setLevel,
    vars: profile.vars,
    choices: profile.choices,
    setVar,
    setChoice,
    resetProfile,
    done,
    toggleDone,
    highlight,
    setHighlight,
    flash,
    editing,
    requestEdit: (key, rect) => setEditing({ key, rect }),
    closeEdit: () => setEditing(null),
    hydrated,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
