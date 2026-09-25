"use client";

/* The visual gist of a page. Boxes are HTML (skin tokens, clickable
   values), arrows are an SVG underneath; the layout comes from the engine
   and follows the reader's choices and reading level: Quick shows the
   picture, Deep shows every layer of it. The magnifier opens the same
   drawing full screen, to zoom and pan: no picture, the live elements. */

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Cloud, Database, FileText, Globe, Maximize2, Minus, Monitor, Network, Plus, Scan, Server, User, X, type LucideIcon } from "lucide-react";
import { layoutDiagram, layoutForStage, type DiagramSpec, type Layout, type Localized, type NodeKind } from "@/engine";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";
import { LevelSwitch } from "./controls";

const ICON: Record<NodeKind, LucideIcon> = {
  user: User,
  client: Monitor,
  server: Server,
  service: Network,
  store: Database,
  file: FileText,
  net: Globe,
  cloud: Cloud,
};

/* The drawing itself, at its natural size. */
function Drawing({ l }: { l: Layout }) {
  const { locale } = useReader();
  const text = (t: string | Localized | undefined) => (t === undefined ? undefined : typeof t === "string" ? t : t[locale]);
  return (
    <div className="relative" style={{ width: l.width, height: l.height }}>
      <svg className="absolute inset-0" width={l.width} height={l.height} aria-hidden>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-3)" />
          </marker>
        </defs>
        {l.edges.map((e, i) => (
          <path key={i} d={e.d} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray={e.dashed ? "5 4" : undefined} markerEnd="url(#arrow)" />
        ))}
      </svg>

      {l.groups.map((g) => (
        <div key={`${g.id}/${g.part}`} className="absolute rounded-lg border border-dashed border-line-2" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
          <span className="label absolute left-3 top-1.5">
            {g.label[locale]}
            {g.part > 0 && " ↵"}
          </span>
        </div>
      ))}

      {l.edges
        .filter((e) => e.label)
        .map((e, i) => (
          <span
            key={"l" + i}
            className={
              "ui absolute -translate-y-1/2 whitespace-nowrap rounded bg-paper px-1.5 py-px text-[11px] text-ink-2 " +
              (e.align === "start" ? "" : e.align === "end" ? "-translate-x-full" : "-translate-x-1/2")
            }
            style={{ left: e.mx, top: e.my }}
          >
            <Tokenized template={text(e.label) ?? ""} />
          </span>
        ))}

      {l.nodes.map((n) => {
        const Icon = ICON[n.kind];
        return (
          <div
            key={n.id}
            className={
              "absolute flex items-center gap-2.5 rounded-md border px-3 shadow-soft " +
              (n.focus ? "border-accent bg-accent-soft/60" : "border-line bg-paper-2")
            }
            style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
          >
            <Icon className={"h-4 w-4 shrink-0 " + (n.focus ? "text-accent" : "text-ink-3")} />
            <span className="min-w-0">
              <span className={"ui block truncate text-[13px] " + (n.focus ? "font-bold text-ink" : "text-ink")}>{n.label[locale]}</span>
              {n.sub && (
                <span className="line-clamp-3 font-mono text-[11px] leading-[14px] text-ink-2" title={text(n.sub)}>
                  <Tokenized template={text(n.sub) ?? ""} />
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Scale the drawing down to the available width (never up). A detailed
   drawing stops shrinking at 62% and scrolls sideways instead. */
const MIN_SCALE = 0.62;
function useFit(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.max(MIN_SCALE, Math.min(1, el.clientWidth / width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { ref, scale };
}

export function Diagram({ spec }: { spec: DiagramSpec }) {
  const { choices, level } = useReader();
  const l = layoutDiagram(spec, choices, level);
  const { ref, scale } = useFit(l.width);
  return (
    <div ref={ref} className="w-full overflow-x-auto overflow-y-hidden" style={{ height: l.height * scale }}>
      <div className="origin-top-left" style={{ width: l.width, height: l.height, transform: `scale(${scale})` }}>
        <Drawing l={l} />
      </div>
    </div>
  );
}

/* ── Full screen: zoom with the wheel, pan by dragging ───────── */
type View = { x: number; y: number; k: number };
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

const STAGE_PAD = 48;

function Fullscreen({ spec, onClose }: { spec: DiagramSpec; onClose: () => void }) {
  const { choices, locale, level, setLevel, t } = useReader();
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  // The stage size decides how the chain wraps: as many rows as fill the screen best.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const l = size ? layoutForStage(spec, choices, level, size.w - STAGE_PAD, size.h - STAGE_PAD) : layoutDiagram(spec, choices, level);

  const fit = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const k = Math.min(ZOOM_MAX, (el.clientWidth - STAGE_PAD) / l.width, (el.clientHeight - STAGE_PAD) / l.height);
    setView({ k, x: (el.clientWidth - l.width * k) / 2, y: (el.clientHeight - l.height * k) / 2 });
  }, [l.width, l.height]);

  /** Zoom around a stage point (defaults to the centre). */
  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const el = stage.current;
    if (!el) return;
    const cx = px ?? el.clientWidth / 2;
    const cy = py ?? el.clientHeight / 2;
    setView((v) => {
      const k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.k * factor));
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  }, []);
  const zoomBy = zoomAt;

  // Fit on open and whenever the drawing changes shape (level, choices).
  useEffect(() => {
    fit();
  }, [fit]);

  // Lock the page behind; Escape closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "0") fit();
      else if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, fit, zoomBy]);

  // The wheel zooms instead of scrolling: a native, non-passive listener.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  // A drag must not count as a click on a value inside a box.
  const onClickCapture = (e: ReactMouseEvent) => {
    if (drag.current?.moved) e.stopPropagation();
  };

  return (
    <div className="ui fixed inset-0 z-[80] flex flex-col bg-paper" role="dialog" aria-modal aria-label={t.gist.fullscreen}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <span className="label">{t.gist.title}</span>
        {spec.title && <span className="text-[13px] text-ink-2">{spec.title[locale]}</span>}
        <span className="ml-auto flex items-center gap-2">
          <LevelSwitch level={level} setLevel={setLevel} locale={locale} />
          <span className="inline-flex rounded-md border border-line">
            <button type="button" onClick={() => zoomBy(0.8)} title="−" aria-label="−" className="px-2 py-1 text-ink-2 hover:text-ink">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="border-x border-line px-2 py-1 font-mono text-[11.5px] text-ink-3">{Math.round(view.k * 100)}%</span>
            <button type="button" onClick={() => zoomBy(1.25)} title="+" aria-label="+" className="px-2 py-1 text-ink-2 hover:text-ink">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={fit} title={`${t.gist.fit} (0)`} aria-label={t.gist.fit} className="border-l border-line px-2 py-1 text-ink-2 hover:text-ink">
              <Scan className="h-3.5 w-3.5" />
            </button>
          </span>
          <button type="button" onClick={onClose} title={`${t.gist.close} (esc)`} aria-label={t.gist.close} className="rounded-md border border-line p-1.5 text-ink-2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </span>
      </div>
      <div
        ref={stage}
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden bg-paper-2/30 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          <Drawing l={l} />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-1.5 text-[12px] text-ink-3">
        <span>{t.gist.hint}</span>
        {spec.caption && <span className="hidden max-w-[60%] truncate sm:inline">{spec.caption[locale]}</span>}
      </div>
    </div>
  );
}

/* The card at the top of a page: title, diagram, caption. */
export function Gist({ spec }: { spec: DiagramSpec }) {
  const { locale, t, level, setLevel } = useReader();
  const [full, setFull] = useState(false);
  // Only offer the level switch when the drawing actually has more (or less) to show.
  const hasLayers = [...spec.nodes, ...spec.edges, ...spec.groups].some((x) => x.level || x.max || ("guided" in x && x.guided) || ("deep" in x && x.deep));
  const deep = level === "deep";
  return (
    <section data-tour="gist" className="mt-6 rounded-md border border-line bg-paper-2/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="label">{t.gist.title}</span>
        <span className="ui flex items-center gap-3 text-[13px] text-ink-2">
          {spec.title && <span>{spec.title[locale]}</span>}
          {hasLayers && (
            <button type="button" onClick={() => setLevel(deep ? "quick" : "deep")} className="no-print text-[12px] text-accent-ink hover:underline">
              {deep ? t.gist.less : t.gist.more}
            </button>
          )}
          <button type="button" onClick={() => setFull(true)} title={t.gist.fullscreen} aria-label={t.gist.fullscreen} className="no-print rounded border border-line p-1 text-ink-3 hover:text-ink">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <Diagram spec={spec} />
      {spec.caption && <p className="mt-3 text-[14px] leading-snug text-ink-2">{spec.caption[locale]}</p>}
      {full && createPortal(<Fullscreen spec={spec} onClose={() => setFull(false)} />, document.body)}
    </section>
  );
}
