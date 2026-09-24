"use client";

/* The one place the reader describes their situation. Variables are
   grouped as the contract declares; choices (stack) come last. */

import { RotateCcw } from "lucide-react";
import { atLeast, validate, type ChoiceSpec, type VarSpec } from "@/engine";
import { useReader } from "./store";

function Field({ spec }: { spec: VarSpec }) {
  const { vars, setVar, highlight, setHighlight, level, locale, t } = useReader();
  const value = vars[spec.key] ?? "";
  const err = validate(spec.kind, value);
  const lit = highlight === spec.key;
  const showHint = atLeast(level, "quick") && spec.hint;
  const showImpact = atLeast(level, "deep") && spec.impact;
  return (
    <label className="block" onMouseEnter={() => setHighlight(spec.key)} onMouseLeave={() => setHighlight(null)}>
      <span className="ui mb-1 block text-[12.5px] text-ink-2">{spec.label[locale]}</span>
      <input
        value={value}
        onChange={(e) => setVar(spec.key, e.target.value)}
        placeholder={spec.default}
        spellCheck={false}
        autoComplete="off"
        type={spec.kind === "secret" ? "password" : "text"}
        aria-invalid={err ? true : undefined}
        className={
          "w-full rounded border bg-paper px-2.5 py-1.5 font-mono text-[13px] text-ink transition placeholder:text-ink-3/60 focus:outline-none " +
          (err ? "border-warn" : lit ? "border-accent bg-accent-soft/40" : "border-line focus:border-accent")
        }
      />
      {err ? (
        <span className="ui mt-1 block text-[12px] text-warn">{t.validation[err]}</span>
      ) : (
        showHint && <span className="ui mt-1 block text-[12px] leading-snug text-ink-3">{spec.hint![locale]}</span>
      )}
      {showImpact && <span className="ui mt-1.5 block border-l border-accent/50 pl-2 text-[12px] leading-snug text-ink-2">{spec.impact![locale]}</span>}
    </label>
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

export function ContextPanel() {
  const { contract, locale, resetProfile, t } = useReader();
  const { vars, choices, groups } = contract;
  if (vars.length === 0 && choices.length === 0) return null;

  const grouped = groups.map((g) => ({ g, items: vars.filter((v) => v.group === g.id) })).filter((x) => x.items.length > 0);
  const ungrouped = vars.filter((v) => !v.group || !groups.some((g) => g.id === v.group));

  return (
    <section aria-label={t.context.title} className="space-y-5">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="ui text-[15px] font-bold text-ink">{t.context.title}</h2>
          <p className="ui text-[12.5px] text-ink-3">{t.context.subtitle}</p>
        </div>
        <button type="button" onClick={resetProfile} title={t.context.reset} className="rounded p-1 text-ink-3 hover:text-ink">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </header>

      {choices.length > 0 && (
        <div className="space-y-3 border-t border-line pt-4">
          <span className="label">{t.context.choices}</span>
          {choices.map((c) => (
            <Choice key={c.key} spec={c} />
          ))}
        </div>
      )}

      {grouped.map(({ g, items }) => (
        <div key={g.id} className="space-y-3 border-t border-line pt-4">
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
        <div className="space-y-3 border-t border-line pt-4">
          {ungrouped.map((v) => (
            <Field key={v.key} spec={v} />
          ))}
        </div>
      )}
    </section>
  );
}
