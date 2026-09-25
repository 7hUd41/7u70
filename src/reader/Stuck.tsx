"use client";

/* "Stuck here?" next to every step heading: opens an issue pre-filled with
   the page, the step, the reading level, the language and the stack choices.
   Never the values. The counterpart of the validation button, for failures. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LifeBuoy } from "lucide-react";
import { site } from "@/site.config";
import { useReader } from "./store";

/** A heading's own text, without the "stuck here" link appended to it. */
export function headingText(h: HTMLElement): string {
  return Array.from(h.childNodes)
    .filter((n) => !(n instanceof HTMLElement && n.classList.contains("stuck-slot")))
    .map((n) => n.textContent ?? "")
    .join("")
    .trim();
}

export function StuckLinks({ title }: { title: string }) {
  const { t, level, locale, contract, choices } = useReader();
  const [slots, setSlots] = useState<{ el: HTMLElement; step: string; id: string }[]>([]);
  const signature = useRef("");

  // One slot per h2 of the prose (also inside <When> blocks); rebuilt when
  // the level or the choices change which headings are shown.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".doc-body");
    if (!root) return;
    const build = () => {
      const found: { el: HTMLElement; step: string; id: string }[] = [];
      for (const h of Array.from(root.querySelectorAll<HTMLHeadingElement>("h2"))) {
        const step = headingText(h);
        let el = h.querySelector<HTMLElement>(":scope > .stuck-slot");
        if (!el) {
          el = document.createElement("span");
          el.className = "stuck-slot no-print";
          h.appendChild(el);
        }
        found.push({ el, step: step || h.id, id: h.id });
      }
      const sig = found.map((f) => f.id + "|" + f.step).join("\n");
      if (sig === signature.current) return;
      signature.current = sig;
      setSlots(found);
    };
    build();
    const mo = new MutationObserver(build);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [level, choices]);

  const stack = contract.choices
    .map((c) => {
      const v = choices[c.key];
      if (v === undefined) return null;
      if (c.type === "boolean") return `${c.label[locale]}: ${v ? "✓" : "✗"}`;
      return `${c.label[locale]}: ${c.options.find((o) => o.value === v)?.label[locale] ?? String(v)}`;
    })
    .filter(Boolean)
    .join(" · ");

  const href = (step: string, id: string) => {
    const url = window.location.origin + window.location.pathname + (id ? `#${id}` : "");
    const body = t.stuck.issueBody({ url, step, level: t.levels[level].label, locale, stack });
    return `${site.issues}?title=${encodeURIComponent(t.stuck.issueTitle(title, step))}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      {slots.map((s) =>
        createPortal(
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open(href(s.step, s.id), "_blank", "noopener");
            }}
            title={t.stuck.title}
            className="stuck ui ml-3 inline-flex items-center gap-1 align-middle text-[11.5px] font-normal text-ink-3 no-underline transition hover:text-ink"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> {t.stuck.label}
          </a>,
          s.el
        )
      )}
    </>
  );
}
