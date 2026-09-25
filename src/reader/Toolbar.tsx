"use client";

/* Export what the reader currently sees: conditional sections are
   already resolved in the DOM, so we collect from it and let the
   engine assemble the file. */

import { useState } from "react";
import { Check, Copy, FileDown } from "lucide-react";
import { buildInstallScript, fill, joinCommands, type ShellBlock } from "@/engine";
import { useReader } from "./store";
import { PrintButton } from "./Print";

function collect(root: HTMLElement, selector: string, exclude?: string): ShellBlock[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(`h2, ${selector}`));
  const out: ShellBlock[] = [];
  let step: string | undefined;
  for (const n of nodes) {
    if (n.tagName === "H2") {
      step = n.textContent?.trim() || undefined;
      continue;
    }
    if (exclude && n.closest(exclude)) continue;
    out.push({ code: n.dataset.code ?? "", step });
  }
  return out;
}

function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar({ title, slug }: { title: string; slug: string }) {
  const { level, vars, t } = useReader();
  const [copied, setCopied] = useState(false);
  const run = level === "run";

  const root = () => document.querySelector<HTMLElement>(".doc-body");

  const runText = (): { text: string; name: string } => {
    const r = root();
    if (!r) return { text: "", name: "run.sh" };
    // Prefer a single non-shell file (playbook, compose…), else join the shell blocks.
    const file = r.querySelector<HTMLElement>("[data-run] [data-code]:not([data-shell])");
    if (file) {
      const lang = file.dataset.lang ?? "txt";
      const name = lang === "yaml" || lang === "yml" ? "playbook.yml" : `run.${lang}`;
      return { text: fill(file.dataset.code ?? "", vars), name };
    }
    return { text: joinCommands(collect(r, "[data-run] [data-shell]"), vars), name: `${slug}.sh` };
  };

  const scriptText = () => {
    const r = root();
    return r ? buildInstallScript(collect(r, "[data-shell]", "[data-run]"), { title, vars }) : "";
  };

  const copy = async () => {
    const text = run ? runText().text : joinCommands(collect(root()!, "[data-shell]", "[data-run]"), vars);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const save = () => {
    if (run) {
      const { text, name } = runText();
      download(text, name);
    } else download(scriptText(), `${slug}-install.sh`);
  };

  const btn = "ui inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12.5px] transition";
  return (
    <div data-tour="toolbar" className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className={btn + " border-line bg-paper text-ink-2 hover:text-ink"}>
        {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t.toolbar.copied : run ? t.toolbar.copyRun : t.toolbar.copyAll}
      </button>
      <button type="button" onClick={save} className={btn + " border-ink bg-ink text-paper hover:opacity-90"}>
        <FileDown className="h-3.5 w-3.5" />
        {run ? t.toolbar.downloadRun : t.toolbar.download}
      </button>
      <PrintButton />
    </div>
  );
}
