"use client";

/* The visual gist of a page. Boxes are HTML (skin tokens, clickable
   values), arrows are an SVG underneath; the layout comes from the engine
   and follows the reader's choices. */

import { useEffect, useRef, useState } from "react";
import { Cloud, Database, FileText, Globe, Monitor, Network, Server, User, type LucideIcon } from "lucide-react";
import { layoutDiagram, type DiagramSpec, type Localized, type NodeKind } from "@/engine";
import { useReader } from "./store";
import { Tokenized } from "./Tokenized";

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

/* Scale the drawing down to the available width (never up). */
function useFit(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { ref, scale };
}

export function Diagram({ spec }: { spec: DiagramSpec }) {
  const { choices, locale } = useReader();
  const l = layoutDiagram(spec, choices);
  const { ref, scale } = useFit(l.width);
  const text = (t: string | Localized | undefined) => (t === undefined ? undefined : typeof t === "string" ? t : t[locale]);

  return (
    <div ref={ref} className="w-full" style={{ height: l.height * scale }}>
      <div className="relative origin-top-left" style={{ width: l.width, height: l.height, transform: `scale(${scale})` }}>
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
          <div key={g.id} className="absolute rounded-lg border border-dashed border-line-2" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
            <span className="label absolute left-3 top-1.5">{g.label[locale]}</span>
          </div>
        ))}

        {l.edges
          .filter((e) => e.label)
          .map((e, i) => (
            <span
              key={"l" + i}
              className="ui absolute -translate-x-1/2 -translate-y-1/2 rounded bg-paper px-1.5 py-px text-[11px] text-ink-2"
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
                  <span className="block truncate font-mono text-[11px] text-ink-2" title={text(n.sub)}>
                    <Tokenized template={text(n.sub) ?? ""} />
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* The card at the top of a page: title, diagram, caption. */
export function Gist({ spec }: { spec: DiagramSpec }) {
  const { locale, t } = useReader();
  return (
    <section data-tour="gist" className="mt-6 rounded-md border border-line bg-paper-2/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="label">{t.gist.title}</span>
        {spec.title && <span className="ui text-[13px] text-ink-2">{spec.title[locale]}</span>}
      </div>
      <Diagram spec={spec} />
      {spec.caption && <p className="mt-3 text-[14px] leading-snug text-ink-2">{spec.caption[locale]}</p>}
    </section>
  );
}
