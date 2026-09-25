"use client";

/* Community validation of a page.
   - ValidationLine : under the title, "validated N times, last on…, on your path: M".
   - ValidatePanel  : end of page, "did everything work?" with the button.
   Only the reader's choices (their path) are recorded, never their values. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { summarize, type Validation } from "@/engine";
import { site } from "@/site.config";
import { useReader } from "./store";

const NAME_KEY = "at:name";
const ANON_KEY = "at:anon";

/** A pseudonym the reader chose, or a stable anonymous tag for this browser. */
function identity(): { name: string; anonymous: boolean } {
  try {
    const name = localStorage.getItem(NAME_KEY);
    if (name) return { name, anonymous: false };
    let anon = localStorage.getItem(ANON_KEY);
    if (!anon) {
      anon = "anon-" + Math.random().toString(16).slice(2, 6);
      localStorage.setItem(ANON_KEY, anon);
    }
    return { name: anon, anonymous: true };
  } catch {
    return { name: "anon", anonymous: true };
  }
}

export function useValidations(initial: Validation[]) {
  const [list, setList] = useState(initial);
  return { list, add: (v: Validation) => setList((l) => [...l, v]) };
}

export function ValidationLine({ list, href }: { list: Validation[]; href: string }) {
  const { choices, locale, t } = useReader();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock is an external system
    setNow(Date.now());
  }, []);
  const s = summarize(list, choices, now ?? 0);
  const stale = s.daysSince !== null && s.daysSince > 365;
  const aging = s.daysSince !== null && !stale && s.daysSince > 180;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  return (
    <p data-tour="validation-line" className="ui mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
      <span className="inline-flex items-center gap-2">
        <span className={"h-2 w-2 rounded-full " + (s.total === 0 ? "bg-line-2" : stale ? "bg-warn" : aging ? "bg-warn/60" : "bg-ok")} />
        {s.total === 0 ? (
          t.validated.none
        ) : (
          <>
            <Link href={href} className="hover:text-ink hover:underline">
              {t.validated.count(s.total)}
            </Link>
            {s.last && (
              <span className="text-ink-3">
                · {t.validated.last(fmt(s.last.at), s.last.by ?? t.validated.anonymous)}
              </span>
            )}
            <span className={s.onMyPath > 0 ? "text-ok" : "text-ink-3"}>· {t.validated.onMyPath(s.onMyPath)}</span>
          </>
        )}
      </span>
      <a href={site.issues} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-3 hover:text-ink">
        {t.validated.report} <ExternalLink className="h-3 w-3" />
      </a>
      {stale && <span className="basis-full text-warn">{t.meta.stale}</span>}
    </p>
  );
}

export function ValidatePanel({ series, slug, onAdded, canValidate }: { series: string; slug: string; onAdded: (v: Validation) => void; canValidate: boolean }) {
  const { choices, locale, done, t } = useReader();
  const [name, setName] = useState("");
  const [anon, setAnon] = useState(true);
  const [version, setVersion] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [checks, setChecks] = useState({ done: 0, total: 0 });

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reads storage and the rendered body */
    const id = identity();
    setName(id.name);
    setAnon(id.anonymous);
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".doc-body [data-check]"));
    setChecks({ total: nodes.length, done: nodes.filter((n) => n.dataset.done === "true").length });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [done]);

  const submit = async () => {
    setState("sending");
    const by = name.trim() || identity().name;
    try {
      if (!anon && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    try {
      const res = await fetch("/api/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series, page: slug, validation: { by, locale, choices, checks, version: version.trim() || undefined } }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { validation: Validation };
      onAdded(data.validation);
      setState("done");
    } catch {
      setState("error");
    }
  };

  const incomplete = checks.total > 0 && checks.done < checks.total;

  return (
    <section data-tour="validate" className="ui mt-14 rounded-md border border-line bg-paper-2/60 p-5 print:hidden">
      <h2 className="font-serif text-[1.25rem] font-semibold text-ink">{t.validated.title}</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">{t.validated.intro}</p>
      {checks.total > 0 && (
        <p className={"mt-2 text-[12.5px] " + (incomplete ? "text-warn" : "text-ok")}>
          {incomplete ? t.validated.incomplete(checks.done, checks.total) : t.validated.complete(checks.total)}
        </p>
      )}

      {state === "done" ? (
        <p className="mt-4 inline-flex items-center gap-2 text-[14px] text-ok">
          <BadgeCheck className="h-4 w-4" /> {t.validated.thanks}
        </p>
      ) : canValidate ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-3">{t.validated.name}</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAnon(false);
              }}
              placeholder="anon-…"
              className="w-44 rounded border border-line bg-paper px-2.5 py-1.5 font-mono text-[13px] text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-3">{t.validated.version}</span>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v4.4.3"
              className="w-36 rounded border border-line bg-paper px-2.5 py-1.5 font-mono text-[13px] text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={state === "sending"}
            className="inline-flex items-center gap-1.5 rounded border border-ink bg-ink px-3 py-1.5 text-[13px] text-paper hover:opacity-90 disabled:opacity-50"
          >
            <BadgeCheck className="h-4 w-4" /> {t.validated.button}
          </button>
          {state === "error" && <span className="text-[12.5px] text-warn">{t.validated.error}</span>}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-2">
          {t.validated.readOnly}{" "}
          <a href={site.issues} target="_blank" rel="noreferrer" className="underline hover:text-ink">
            {t.validated.reportLink}
          </a>
        </p>
      )}
      <p className="mt-3 text-[12px] text-ink-3">{t.validated.privacy}</p>
    </section>
  );
}
