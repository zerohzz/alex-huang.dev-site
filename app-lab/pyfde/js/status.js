// Shared progress-glyph logic: sidebar and plan view must agree on what
// ● ◐ ○ · mean for any item.

import { slotKey, allProgress } from "./store.js";

export function slotGlyph(k) {
  const s = allProgress()[k];
  if (!s) return ["·", ""];
  if (s.status === "pass") return ["●", "done"];
  if (s.peeked) return ["○", "peek"];
  if (s.status === "try") return ["◐", "part"];
  return ["·", ""];
}

// One glyph per item; exams aggregate across their stages.
export function itemGlyph(mode, id, content) {
  if (mode === "exam") {
    const exam = content.exams.find((e) => e.id === id);
    if (!exam) return ["·", ""];
    const st = exam.stages.map((_, si) =>
      (allProgress()[slotKey("exam", id, si)] || {}).status === "pass");
    const n = st.filter(Boolean).length;
    if (n === st.length) return ["●", "done"];
    if (n > 0) return ["◐", "part"];
    return ["·", ""];
  }
  return slotGlyph(slotKey(mode, id));
}

export function itemTitle(mode, id, content) {
  if (mode === "learn") return content.lessons.find((x) => x.id === id)?.title || id;
  if (mode === "drill") return content.drills.find((x) => x.id === id)?.title || id;
  if (mode === "exam") return content.exams.find((x) => x.id === id)?.title || id;
  return id;
}
