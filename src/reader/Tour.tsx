"use client";

/* Guided tour: a spotlight that glides from one zone of the page to the
   next, with a short card each time. Targets are looked up by data-tour
   attributes or selectors; a missing target is skipped, so the same tour
   works on any page. */

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useReader } from "./store";

export const TOUR_DONE_KEY = "at:tour:done";

type Step = { key: string; target: string | string[] };

const STEPS: Step[] = [
  { key: "levels", target: '[data-tour="levels"]' },
  { key: "validationLine", target: '[data-tour="validation-line"]' },
  { key: "outline", target: ['[data-tour="outline"]', '[data-tour="outline-toggle"]'] },
  { key: "stack", target: '[data-tour="stack"]' },
  { key: "values", target: '[data-tour="values"]' },
  { key: "token", target: ".doc-body figure .token" },
  { key: "copy", target: ".doc-body figure[data-shell]" },
  { key: "export", target: '[data-tour="toolbar"]' },
  { key: "check", target: ".doc-body [data-check]" },
  { key: "details", target: ".doc-body details" },
  { key: "validate", target: '[data-tour="validate"]' },
  { key: "locale", target: '[data-tour="locale"]' },
];

type Box = { top: number; left: number; width: number; height: number };

function find(target: string | string[]): HTMLElement | null {
  for (const sel of Array.isArray(target) ? target : [target]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useReader();
  const [i, setI] = useState(0);
  // Restart from the first step each time the tour opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setI(0);
  }
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);

  const measure = useCallback(() => {
    const el = find(STEPS[i].target);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 8;
    const b = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    setBox(b);
    const cardW = 340;
    const cardH = 170;
    const below = b.top + b.height + 12;
    const top = below + cardH < window.innerHeight ? below : Math.max(12, b.top - cardH - 12);
    const left = Math.max(12, Math.min(b.left, window.innerWidth - cardW - 12));
    setCard({ top, left });
    return true;
  }, [i]);

  // On each step: scroll the target into view, then measure; skip missing targets.
  useEffect(() => {
    if (!open) return;
    const el = find(STEPS[i].target);
    if (!el) {
      // The DOM (an external system) has no such zone on this page: move on.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (i < STEPS.length - 1) setI(i + 1);
      else onClose();
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const id = setTimeout(measure, 350);
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [open, i, measure, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") setI((n) => Math.min(STEPS.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !box || !card) return null;
  const step = t.tour.steps[STEPS[i].key as keyof typeof t.tour.steps];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label={t.tour.title}>
      {/* The spotlight: everything outside it is dimmed by the shadow. */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-accent transition-all duration-500 ease-out"
        style={{ ...box, boxShadow: "0 0 0 9999px rgb(20 18 14 / 0.55)" }}
      />
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="ui absolute w-[340px] rounded-md border border-line bg-paper p-4 shadow-soft transition-all duration-500 ease-out"
        style={card}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <span className="label">
            {t.tour.title} · {i + 1}/{STEPS.length}
          </span>
          <button type="button" onClick={onClose} aria-label={t.tour.skip} className="rounded text-ink-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-serif text-[16px] font-semibold text-ink">{step.title}</h3>
        <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-[12.5px] text-ink-3 hover:text-ink">
            {t.tour.skip}
          </button>
          <span className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="rounded border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:text-ink">
                {t.tour.back}
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="rounded border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-paper hover:opacity-90"
            >
              {last ? t.tour.done : t.tour.next}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
