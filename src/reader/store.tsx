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
import { LANG_KEY } from "@/urls";
import { carryFromHash, DEFAULT_LEVEL, defaultsOf, isLevel, stripSecrets, type Carry, type ChoiceValue, type Level, type Locale, type TutoContract } from "@/engine";
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
  /** The reader's state as a link can carry it: values (no secrets), choices, progress of the whole series. */
  buildCarry: () => Carry;
  /** What a link just brought in, if any: how many values and checks. */
  imported: { vars: number; checks: number } | null;
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
/** Last page read in a series, for "pick up where you were". */
export const lastReadKey = (series: string) => `at:last:${series}`;
export type LastRead = { page: string; at: string };

/** Progress of every page of a series, from storage: { "<page>": ["<checkId>", …] }. */
export function readSeriesProgress(series: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  try {
    const prefix = progressKey(`${series}/`);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(prefix)) continue;
      const d = readJson<Record<string, boolean>>(k) ?? {};
      const ids = Object.keys(d).filter((x) => d[x]);
      if (ids.length) out[k.slice(prefix.length)] = ids;
    }
  } catch {}
  return out;
}

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
  const [imported, setImported] = useState<{ vars: number; checks: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const series = id.split("/")[0];
  const slug = id.split("/")[1];

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

    // A carry in the URL (#s=…): apply it over what is stored, for the whole
    // series, then drop it from the address bar so a reload does not redo it.
    const carry = carryFromHash(window.location.hash);
    if (carry && carry.series === series) {
      setProfile((cur) => ({ vars: { ...cur.vars, ...carry.vars }, choices: { ...cur.choices, ...carry.choices } }));
      let checks = 0;
      for (const [page, ids] of Object.entries(carry.done)) {
        const key = progressKey(`${series}/${page}`);
        const merged = { ...(readJson<Record<string, boolean>>(key) ?? {}) };
        for (const x of ids) merged[x] = true;
        checks += ids.length;
        writeJson(key, merged);
        if (page === slug) setDone(merged);
      }
      setImported({ vars: Object.keys(carry.vars).length, checks });
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id, series, slug, defaults]);

  // Remember the page read last in this series.
  useEffect(() => {
    writeJson(lastReadKey(series), { page: slug, at: new Date().toISOString() } satisfies LastRead);
  }, [series, slug]);

  useEffect(() => {
    if (hydrated) writeJson(LEVEL_KEY, level);
  }, [level, hydrated]);
  // The language read last: the bare article URL lands there next time.
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LANG_KEY, locale);
    } catch {}
  }, [locale]);
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

  const buildCarry = useCallback((): Carry => {
    const done = readSeriesProgress(series);
    return { v: 1, series, vars: stripSecrets(profile.vars, contract), choices: profile.choices, done };
  }, [series, profile, contract]);

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
    buildCarry,
    imported,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
