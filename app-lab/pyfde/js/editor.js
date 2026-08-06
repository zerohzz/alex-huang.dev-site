// CodeMirror 6 wrapper: petrol/paper theme via CSS variables (one definition,
// both themes), Python highlighting with AA-checked colors, native undo
// (history is part of basicSetup — the baseline broke undo by writing to
// textarea.value directly), and an error gutter fed by traceback line numbers.

import {
  EditorView, basicSetup, EditorState, StateEffect, StateField, RangeSet,
  python, keymap, indentWithTab, Decoration, gutter, GutterMarker,
  HighlightStyle, syntaxHighlighting, tags,
} from "../vendor/codemirror.js";

const setErrorLineEffect = StateEffect.define();

const errorLineField = StateField.define({
  create: () => null,
  update(value, tr) {
    if (tr.docChanged) value = null;
    for (const e of tr.effects) if (e.is(setErrorLineEffect)) value = e.value;
    return value;
  },
});

const errorLineDeco = EditorView.decorations.compute([errorLineField], (state) => {
  const ln = state.field(errorLineField);
  if (!ln || ln > state.doc.lines) return Decoration.none;
  return Decoration.set([Decoration.line({ class: "err-line" }).range(state.doc.line(ln).from)]);
});

class ErrMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement("span");
    el.className = "err-dot";
    el.textContent = "●";
    return el;
  }
}

const errorGutter = gutter({
  class: "err-gutter",
  markers(view) {
    const ln = view.state.field(errorLineField);
    if (!ln || ln > view.state.doc.lines) return RangeSet.empty;
    return RangeSet.of(new ErrMarker().range(view.state.doc.line(ln).from));
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syn-kw)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--syn-str)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--syn-num)" },
  { tag: tags.comment, color: "var(--syn-comment)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--syn-fn)", fontWeight: "600" },
  { tag: tags.operator, color: "var(--syn-op)" },
]);

const theme = EditorView.theme({
  "&": { backgroundColor: "var(--panel)", color: "var(--ink)", fontSize: "13px" },
  ".cm-content": { fontFamily: "var(--f-mono)", lineHeight: "1.6", caretColor: "var(--ink)", padding: "12px 0" },
  ".cm-line": { padding: "0 14px 0 6px" },
  ".cm-gutters": { backgroundColor: "var(--gutter-bg)", color: "var(--faint)", border: "none", fontFamily: "var(--f-mono)" },
  ".cm-activeLine": { backgroundColor: "var(--active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--active-line)", color: "var(--dim)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "var(--sel-bg)" },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  "&.cm-focused": { outline: "none" },
});

export function createEditor({ parent, doc, onRun, onRunOnly, onChange }) {
  // Own keymap first so Mod-Enter wins; indentWithTab keeps CM6's built-in
  // escape hatch (Esc, then Tab moves focus).
  const runKeys = keymap.of([
    { key: "Mod-Enter", run: () => { if (onRun) onRun(); return true; } },
    { key: "Mod-Shift-Enter", run: () => { if (onRunOnly) onRunOnly(); return true; } },
    indentWithTab,
  ]);

  let view; // assigned below; the listener closes over it
  let debounce = null;
  const watcher = EditorView.updateListener.of((u) => {
    if (u.docChanged && onChange) {
      clearTimeout(debounce);
      debounce = setTimeout(() => onChange(view.state.doc.toString()), 250);
    }
  });

  view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        runKeys, basicSetup, python(), syntaxHighlighting(highlight),
        theme, errorLineField, errorLineDeco, errorGutter, watcher,
      ],
    }),
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    setErrorLine: (ln) => view.dispatch({ effects: setErrorLineEffect.of(ln) }),
    focus: () => view.focus(),
  };
}
