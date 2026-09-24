"use client";

/* Small popover anchored to the token the reader clicked. */

import { validate } from "@/engine";
import { useReader } from "./store";

export function VarEditor() {
  const { editing, closeEdit, vars, setVar, contract, locale, t } = useReader();
  if (!editing) return null;
  const spec = contract.vars.find((v) => v.key === editing.key);
  if (!spec) return null;
  const value = vars[spec.key] ?? "";
  const err = validate(spec.kind, value);
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const top = Math.min(editing.rect.bottom + 6, vh - 160);
  const left = Math.max(8, Math.min(editing.rect.left, vw - 288));
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeEdit} />
      <div role="dialog" className="ui fixed z-50 w-72 rounded-md border border-line bg-paper p-3 shadow-soft" style={{ top, left }}>
        <div className="mb-0.5 text-[13px] font-bold text-ink">{spec.label[locale]}</div>
        {spec.hint && <p className="mb-2 text-[12px] leading-snug text-ink-3">{spec.hint[locale]}</p>}
        <input
          autoFocus
          value={value}
          onChange={(e) => setVar(spec.key, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") closeEdit();
          }}
          spellCheck={false}
          autoComplete="off"
          className={"w-full rounded border bg-paper px-2.5 py-1.5 font-mono text-[13px] text-ink focus:outline-none " + (err ? "border-warn" : "border-line focus:border-accent")}
        />
        <div className={"mt-1.5 text-[12px] " + (err ? "text-warn" : "text-ink-3")}>{err ? t.validation[err] : t.context.appliesEverywhere}</div>
      </div>
    </>
  );
}
