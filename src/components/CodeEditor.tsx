"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
  foldGutter,
  codeFolding,
  foldKeymap,
  foldService,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/* ── Tokenizer de notre syntaxe maison ────────────────────── */
const dsl = StreamLanguage.define<{ fence: boolean }>({
  startState: () => ({ fence: false }),
  token(stream, state) {
    // Ouverture / fermeture d'un bloc de code ```
    if (stream.sol() && stream.match(/```[^\n]*/)) {
      state.fence = !state.fence;
      return "fence";
    }
    if (state.fence) {
      if (stream.match(/\$\{[A-Z_]+\}/)) return "var";
      stream.next();
      return null;
    }
    // Titres
    if (stream.sol() && stream.match(/#{1,6}\s.*/)) return "head";
    // Variables ${...}
    if (stream.match(/\$\{[A-Z_]+\}/)) return "var";
    // Balises maison <When>, </Automatic>, <V ...>
    if (stream.match(/<\/?[A-Z][A-Za-z0-9]*/)) return "tag";
    // Valeurs d'attribut "..."
    if (stream.match(/"[^"]*"/)) return "str";
    // Code en ligne `...`
    if (stream.match(/`[^`]+`/)) return "fence";
    stream.next();
    return null;
  },
  tokenTable: {
    var: t.variableName,
    tag: t.tagName,
    str: t.string,
    head: t.heading,
    fence: t.meta,
  },
});

const highlight = HighlightStyle.define([
  { tag: t.variableName, color: "#d97706", fontWeight: "600" }, // ambre = variables
  { tag: t.tagName, color: "#7c3aed", fontWeight: "600" }, // violet = composants
  { tag: t.string, color: "#059669" }, // vert = attributs
  { tag: t.heading, color: "#0f172a", fontWeight: "700" }, // titres
  { tag: t.meta, color: "#0891b2" }, // cyan = blocs / code inline
]);

/* ── Pliage par blocs logiques ────────────────────────────── */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockFold = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const text = line.text;

  // Titre : replie jusqu'au prochain titre de niveau égal ou supérieur
  const h = text.match(/^(#{1,6})\s/);
  if (h) {
    const level = h[1].length;
    let endLine = state.doc.lines;
    for (let n = line.number + 1; n <= state.doc.lines; n++) {
      const m = state.doc.line(n).text.match(/^(#{1,6})\s/);
      if (m && m[1].length <= level) {
        endLine = n - 1;
        break;
      }
    }
    const to = state.doc.line(endLine).to;
    return to > line.to ? { from: line.to, to } : null;
  }

  // Composant bloc : <When ...> ... </When>
  const open = text.match(/^<([A-Z][A-Za-z0-9]*)(\s|>)/);
  if (open && !text.includes("/>")) {
    const name = escapeRe(open[1]);
    const openRe = new RegExp("<" + name + "(\\s|>)", "g");
    const closeRe = new RegExp("</" + name + ">", "g");
    let depth = 0;
    for (let n = line.number; n <= state.doc.lines; n++) {
      const lt = state.doc.line(n).text;
      depth += (lt.match(openRe) || []).length - (lt.match(closeRe) || []).length;
      if (n > line.number && depth <= 0) return { from: line.to, to: state.doc.line(n).from };
    }
  }

  // Bloc de code ``` ... ```
  if (/^```/.test(text)) {
    for (let n = line.number + 1; n <= state.doc.lines; n++) {
      if (/^```/.test(state.doc.line(n).text)) return { from: line.to, to: state.doc.line(n).to };
    }
  }
  return null;
});

const theme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "13px", backgroundColor: "#ffffff", color: "#0f172a" },
    ".cm-scroller": {
      fontFamily: "'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontVariantLigatures: "contextual",
      fontFeatureSettings: '"calt" 1, "liga" 1',
      lineHeight: "1.65",
      padding: "8px 0",
    },
    ".cm-content": { caretColor: "#0891b2" },
    ".cm-gutters": { backgroundColor: "#f8fafc", color: "#cbd5e1", border: "none" },
    ".cm-activeLineGutter": { backgroundColor: "#eef2f6", color: "#64748b" },
    ".cm-activeLine": { backgroundColor: "#f8fafc" },
    ".cm-foldGutter span": { color: "#94a3b8", cursor: "pointer" },
    "&.cm-focused": { outline: "none" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#e2e8f0",
      color: "#64748b",
      border: "none",
      borderRadius: "4px",
      padding: "0 6px",
      margin: "0 2px",
    },
  },
  { dark: false }
);

export type EditorApi = { insert: (text: string) => void; goToLine: (line: number) => void };

export default function CodeEditor({
  value,
  onChange,
  apiRef,
}: {
  value: string;
  onChange: (v: string) => void;
  apiRef?: MutableRefObject<EditorApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Synchronise le contenu si `value` change de l'extérieur (chargement d'un tuto).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (value !== cur) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        codeFolding(),
        blockFold,
        dsl,
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
        theme,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: host.current });
    viewRef.current = view;
    if (apiRef) {
      apiRef.current = {
        insert: (text: string) => {
          const sel = view.state.selection.main;
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: text },
            selection: { anchor: sel.from + text.length },
            scrollIntoView: true,
          });
          view.focus();
        },
        goToLine: (line: number) => {
          const total = view.state.doc.lines;
          const l = Math.max(1, Math.min(Math.floor(line), total));
          const info = view.state.doc.line(l);
          view.dispatch({
            selection: { anchor: info.from },
            effects: EditorView.scrollIntoView(info.from, { y: "center" }),
          });
          view.focus();
        },
      };
    }
    return () => {
      if (apiRef) apiRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
    // init unique
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="h-full overflow-hidden" />;
}
