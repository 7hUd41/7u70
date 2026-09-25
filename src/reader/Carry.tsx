"use client";

/* Share / carry: a link (and its QR code) that carries the reader's values,
   choices and progress for the series — secrets excluded, nothing sent to
   a server. Also the notice shown when a page was opened from such a link. */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Link2, Share2, X } from "lucide-react";
import { carryFragment } from "@/engine";
import { useReader } from "./store";

export function CarryButton() {
  const { t } = useReader();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="carry"
        className="ui inline-flex items-center gap-1.5 rounded border border-line bg-paper px-2.5 py-1 text-[12.5px] text-ink-2 transition hover:text-ink print:hidden"
      >
        <Share2 className="h-3.5 w-3.5" /> {t.carry.button}
      </button>
      {open && <CarryPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function CarryPanel({ onClose }: { onClose: () => void }) {
  const { t, buildCarry } = useReader();
  const [url, setUrl] = useState("");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);

  // Built when the panel opens: the link reflects the state at that moment.
  useEffect(() => {
    const link = window.location.origin + window.location.pathname + carryFragment(buildCarry());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- from the URL, after mount
    setUrl(link);
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "L" })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [buildCarry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-ink/40 p-4" onClick={onClose} role="dialog" aria-modal aria-label={t.carry.title}>
      <div className="ui w-full max-w-xl cursor-default rounded-md border border-line bg-paper p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-serif text-[18px] font-semibold text-ink">{t.carry.title}</h2>
          <button type="button" onClick={onClose} aria-label={t.gist.close} className="rounded text-ink-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[13.5px] leading-snug text-ink-2">{t.carry.intro}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_128px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 rounded border border-line bg-paper-2 px-2.5 py-1.5">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-3" />
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="w-full bg-transparent font-mono text-[11.5px] text-ink outline-none" />
            </div>
            <button
              type="button"
              onClick={copy}
              className="mt-2 inline-flex items-center gap-1.5 rounded border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-paper hover:opacity-90"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? t.carry.copied : t.carry.copy}
            </button>
            <p className="mt-3 text-[12px] leading-snug text-ink-3">{t.carry.secrets}</p>
          </div>
          <div className="text-center">
            {svg && <div className="mx-auto h-32 w-32 rounded bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
            <span className="label mt-1.5 block text-[10.5px]">{t.carry.qr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Shown once under the title when the page was opened from a carry link. */
export function ImportedNotice() {
  const { t, imported } = useReader();
  const [dismissed, setDismissed] = useState(false);
  if (!imported || dismissed) return null;
  return (
    <p className="ui mt-3 flex items-center gap-2 rounded border border-ok/40 bg-ok-soft px-3 py-1.5 text-[12.5px] text-ink">
      <Check className="h-3.5 w-3.5 text-ok" />
      {t.carry.imported(imported.vars, imported.checks)}
      <button type="button" onClick={() => setDismissed(true)} aria-label={t.gist.close} className="ml-auto text-ink-3 hover:text-ink">
        <X className="h-3.5 w-3.5" />
      </button>
    </p>
  );
}
