"use client";

/* The margin, in reading order:
   1. StackPanel   — choices that shape the path (they change the outline)
   2. ValuesPanel  — the reader's values, consulted lazily, explained fully on hover
   Groups and variables can declare `when` and disappear when irrelevant. */

import { useId, useRef, useState } from "react";
import { HelpCircle, RotateCcw } from "lucide-react";
import { evaluate, validate, type ChoiceSpec, type VarSpec } from "@/engine";
import { useReader } from "./store";

/* Full, level-independent explanation of a variable: what it is, why it
   matters, what a value looks like. Opens on hover or keyboard focus. */
const TIP_WIDTH = 300;
const TIP_MAX_HEIGHT = 320;

type TipPos = { left: number; top?: number; bottom?: number };

/* One tip at a time: opening a tip closes whichever one is still open (the
   grace period of the previous ? must not leave two tips on screen). */
let closeOpenTip: (() => void) | null = null;

function Help({ spec, anchor }: { spec: VarSpec; anchor: React.RefObject<HTMLDivElement | null> }) {
  const { locale, t } = useReader();
  const [pos, setPos] = useState<TipPos | null>(null);
  const id = useId();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  const closeNow = useRef(() => {
    cancelHide();
    setPos(null);
  }).current;

  // Beside the field, never over it: to the left of the panel when there is
  // room (the usual case, the panel sits in the right margin), else under it.
  // Fixed positioning escapes the scrolling margin.
  const show = (el: HTMLElement) => {
    if (closeOpenTip && closeOpenTip !== closeNow) closeOpenTip();
    closeOpenTip = closeNow;
    const r = (anchor.current ?? el).getBoundingClientRect();
    if (r.left - TIP_WIDTH - 12 >= 8) {
      const top = Math.max(8, Math.min(r.top, window.innerHeight - TIP_MAX_HEIGHT - 8));
      setPos({ left: r.left - TIP_WIDTH - 12, top });
    } else {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - TIP_WIDTH - 8));
      const roomBelow = window.innerHeight - r.bottom;
      setPos(roomBelow >= TIP_MAX_HEIGHT ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 });
    }
  };
  const hide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      setPos(null);
      if (closeOpenTip === closeNow) closeOpenTip = null;
    }, 300);
  };

  return (
    <span className="inline-flex" onMouseLeave={hide} onMouseEnter={cancelHide}>
      <button
        type="button"
        aria-label={t.help.about(spec.label[locale])}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={(e) => {
          cancelHide();
          show(e.currentTarget);
        }}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={hide}
        className="rounded text-ink-3 hover:text-ink"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          onMouseEnter={cancelHide}
          onMouseLeave={hide}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: TIP_WIDTH, maxHeight: TIP_MAX_HEIGHT }}
          className="ui fixed z-50 overflow-y-auto rounded-md border border-line bg-paper p-3 text-left text-[12.5px] leading-snug text-ink shadow-soft"
        >
          <span className="mb-1 block font-bold">{spec.label[locale]}</span>
          {spec.hint && <span className="block">{spec.hint[locale]}</span>}
          {spec.impact && (
            <span className="mt-2 block">
              <span className="label block">{t.help.impact}</span>
              {spec.impact[locale]}
            </span>
          )}
          {spec.default && (
            <span className="mt-2 block">
              <span className="label block">{t.help.example}</span>
              <code className="text-[12px]">{spec.default}</code>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/* A value: label, the ? that explains it beside the field, the input.
   The explanation lives in the tip only, whatever the level: the panel
   stays short enough to show many values at once. */
function Field({ spec }: { spec: VarSpec }) {
  const { vars, setVar, highlight, setHighlight, locale, t } = useReader();
  const value = vars[spec.key] ?? "";
  const err = validate(spec.kind, value);
  const lit = highlight === spec.key;
  const box = useRef<HTMLDivElement>(null);
  return (
    <div ref={box} onMouseEnter={() => setHighlight(spec.key)} onMouseLeave={() => setHighlight(null)}>
      <label className="ui mb-1 flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
        <span>{spec.label[locale]}</span>
        {(spec.hint || spec.impact) && <Help spec={spec} anchor={box} />}
      </label>
      <input
        value={value}
        onChange={(e) => setVar(spec.key, e.target.value)}
        placeholder={spec.default}
        spellCheck={false}
        autoComplete="off"
        aria-label={spec.label[locale]}
        type={spec.kind === "secret" ? "password" : "text"}
        aria-invalid={err ? true : undefined}
        className={
          "w-full rounded border bg-paper px-2.5 py-1.5 font-mono text-[13px] text-ink transition placeholder:text-ink-3/60 focus:outline-none focus:ring-2 focus:ring-inset " +
          (err ? "border-warn focus:ring-warn" : lit ? "border-accent bg-accent-soft/40 focus:ring-accent" : "border-line focus:border-accent focus:ring-accent")
        }
      />
      {err && <span className="ui mt-1 block text-[12px] text-warn">{t.validation[err]}</span>}
    </div>
  );
}

function Choice({ spec }: { spec: ChoiceSpec }) {
  const { choices, setChoice, locale } = useReader();
  if (spec.type === "boolean") {
    const on = choices[spec.key] === true;
    return (
      <label className="ui flex cursor-pointer items-center justify-between gap-3 text-[13px] text-ink">
        <span>
          {spec.label[locale]}
          {spec.hint && <span className="block text-[12px] text-ink-3">{spec.hint[locale]}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setChoice(spec.key, !on)}
          className={"relative h-5 w-9 shrink-0 rounded-full transition " + (on ? "bg-accent" : "bg-line-2")}
        >
          <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-paper shadow transition " + (on ? "left-[18px]" : "left-0.5")} />
        </button>
      </label>
    );
  }
  const current = String(choices[spec.key] ?? "");
  return (
    <div className="ui text-[13px]">
      <span className="mb-1.5 block text-ink">{spec.label[locale]}</span>
      <div className="flex flex-wrap gap-1">
        {spec.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setChoice(spec.key, o.value)}
            aria-pressed={current === o.value}
            className={
              "rounded border px-2.5 py-1 text-[12.5px] transition " +
              (current === o.value ? "border-accent bg-accent-soft text-ink" : "border-line bg-paper text-ink-2 hover:border-line-2 hover:text-ink")
            }
          >
            {o.label[locale]}
          </button>
        ))}
      </div>
      {spec.hint && <span className="mt-1 block text-[12px] text-ink-3">{spec.hint[locale]}</span>}
    </div>
  );
}

export function StackPanel() {
  const { contract, t } = useReader();
  if (contract.choices.length === 0) return null;
  return (
    <section aria-label={t.context.choices} data-tour="stack" className="space-y-3">
      <header>
        <h2 className="ui text-[15px] font-bold text-ink">{t.context.choices}</h2>
        <p className="ui text-[12.5px] text-ink-3">{t.context.choicesSubtitle}</p>
      </header>
      {contract.choices.map((c) => (
        <Choice key={c.key} spec={c} />
      ))}
    </section>
  );
}

export function ValuesPanel() {
  const { contract, choices, locale, resetProfile, t } = useReader();
  const declared = new Set(contract.groups.map((g) => g.id));
  const visibleGroups = contract.groups.filter((g) => !g.when || evaluate(g.when, choices));
  const visibleIds = new Set(visibleGroups.map((g) => g.id));
  // A variable is shown when its own condition holds and its group (if declared) is visible.
  const vars = contract.vars.filter(
    (v) => (!v.when || evaluate(v.when, choices)) && (!v.group || !declared.has(v.group) || visibleIds.has(v.group))
  );
  if (vars.length === 0) return null;

  const grouped = visibleGroups.map((g) => ({ g, items: vars.filter((v) => v.group === g.id) })).filter((x) => x.items.length > 0);
  const ungrouped = vars.filter((v) => !v.group || !declared.has(v.group));

  return (
    <section aria-label={t.context.title} data-tour="values" className="space-y-5">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="ui text-[15px] font-bold text-ink">{t.context.title}</h2>
          <p className="ui text-[12.5px] text-ink-3">{t.context.subtitle}</p>
        </div>
        <button type="button" onClick={resetProfile} title={t.context.reset} className="rounded p-1 text-ink-3 hover:text-ink">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </header>

      {grouped.map(({ g, items }, i) => (
        <div key={g.id} className={"space-y-3 " + (i > 0 ? "border-t border-line pt-4" : "")}>
          <div>
            <span className="label">{g.label[locale]}</span>
            {g.desc && <p className="ui text-[12px] text-ink-3">{g.desc[locale]}</p>}
          </div>
          {items.map((v) => (
            <Field key={v.key} spec={v} />
          ))}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className={"space-y-3 " + (grouped.length > 0 ? "border-t border-line pt-4" : "")}>
          {ungrouped.map((v) => (
            <Field key={v.key} spec={v} />
          ))}
        </div>
      )}
    </section>
  );
}
