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
  { key: "gist", target: '[data-tour="gist"]' },
  { key: "outline", target: ['[data-tour="outline"]', '[data-tour="outline-toggle"]'] },
  { key: "stack", target: '[data-tour="stack"]' },
  { key: "values", target: '[data-tour="values"]' },
  { key: "token", target: ".doc-body figure .token" },
  { key: "copy", target: ".doc-body figure[data-shell]" },
  { key: "export", target: '[data-tour="toolbar"]' },
  { key: "carry", target: '[data-tour="carry"]' },
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

/** The nearest ancestor that scrolls on its own (a side panel), if any. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
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
    // A target inside a scrolling panel is only lit where the panel shows it;
    // the panel keeps scrolling under the spotlight.
    const sp = scrollParent(el);
    const clip = sp ? sp.getBoundingClientRect() : { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
    const y0 = Math.max(r.top, clip.top, 0) - pad;
    const x0 = Math.max(r.left, clip.left, 0) - pad;
    const y1 = Math.min(r.bottom, clip.bottom, window.innerHeight) + pad;
    // …and its scrollbar stays in the light, so the hint is visible.
    const x1 = Math.min(sp ? clip.right : r.right, window.innerWidth) + pad;
    const b = { top: y0, left: x0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
    setBox(b);
    const cardW = 340;
    const cardH = 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tall = b.height > vh * 0.5;
    let top: number;
    let left: number;
    if (tall && b.left - cardW - 16 >= 12) {
      // Tall target on the right (a side panel): card to its left, vertically centred in view.
      left = b.left - cardW - 16;
      top = Math.max(12, Math.min(vh - cardH - 12, Math.max(b.top, 0) + Math.min(b.height, vh) / 2 - cardH / 2));
    } else if (tall && b.left + b.width + cardW + 16 <= vw - 12) {
      left = b.left + b.width + 16;
      top = Math.max(12, Math.min(vh - cardH - 12, Math.max(b.top, 0) + Math.min(b.height, vh) / 2 - cardH / 2));
    } else {
      const below = b.top + b.height + 12;
      top = below + cardH < vh ? below : Math.max(12, b.top - cardH - 12);
      left = Math.max(12, Math.min(b.left, vw - cardW - 12));
    }
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
    // Hide the spotlight while the page moves; show it once the scroll has settled.
    setBox(null);
    setCard(null);
    const sp = scrollParent(el);
    el.scrollIntoView({ block: sp ? "start" : "center", behavior: "smooth" });
    // Hint that the panel scrolls: its scrollbar takes the accent for this step.
    sp?.setAttribute("data-tour-scroll", "");
    let settled = false;
    let lastY = window.scrollY;
    let stableFor = 0;
    const started = Date.now();
    const tick = setInterval(() => {
      if (settled) return;
      const y = window.scrollY;
      stableFor = y === lastY ? stableFor + 60 : 0;
      lastY = y;
      if (stableFor >= 180 || Date.now() - started > 1500) {
        settled = true;
        clearInterval(tick);
        measure();
      }
    }, 60);
    const onMove = () => {
      if (settled) measure();
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    sp?.addEventListener("scroll", onMove, { passive: true });
    return () => {
      clearInterval(tick);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      sp?.removeEventListener("scroll", onMove);
      sp?.removeAttribute("data-tour-scroll");
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

  if (!open) return null;
  const step = t.tour.steps[STEPS[i].key as keyof typeof t.tour.steps];
  const last = i === STEPS.length - 1;

  if (!box || !card) {
    // Between two steps: keep the page dimmed, show nothing else until the scroll settles.
    return <div className="fixed inset-0 z-[60] bg-[rgb(20_18_14_/_0.35)] transition-colors" role="dialog" aria-modal aria-label={t.tour.title} />;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal aria-label={t.tour.title}>
      {/* The spotlight: everything outside it is dimmed by the shadow. */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-accent transition-all duration-500 ease-out"
        style={{ ...box, boxShadow: "0 0 0 9999px rgb(20 18 14 / 0.55)" }}
      />
      {/* Four panes around the spotlight close the tour on click; inside it, the page stays live (a panel scrolls, a value opens). */}
      {[
        { top: 0, left: 0, right: 0, height: Math.max(0, box.top) },
        { top: box.top + box.height, left: 0, right: 0, bottom: 0 },
        { top: box.top, left: 0, width: Math.max(0, box.left), height: box.height },
        { top: box.top, left: box.left + box.width, right: 0, height: box.height },
      ].map((st, k) => (
        <div key={k} className="pointer-events-auto absolute cursor-pointer" style={st} onClick={onClose} />
      ))}
      <div
        className="ui pointer-events-auto absolute w-[340px] rounded-md border border-line bg-paper p-4 shadow-soft transition-all duration-500 ease-out"
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
