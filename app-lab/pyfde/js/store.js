// Progress persistence (localStorage, in-memory fallback), the review-queue
// scheduler, and export/import.
//
// Review rules — deliberately two buckets, nothing cleverer:
//   peek or failed run          -> due tomorrow           (rstage 0)
//   pass while due              -> due in 3 days          (rstage 1)
//   pass while due, second time -> graduated (due clears)
//   pass when not due           -> schedule untouched

const KEY = "pyfde.v2";

let mem = {};
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {
    return mem;
  }
}
function writeAll(v) {
  mem = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch (e) { /* storage unavailable — keep in-memory copy */ }
}

let data = readAll();
if (!data.progress) data.progress = {};
if (!data.settings) data.settings = {};

export function slotKey(mode, id, stage) {
  return stage == null ? `${mode}:${id}` : `${mode}:${id}:${stage}`;
}

const EMPTY = { status: "none", peeked: false, code: null, due: null, rstage: 0 };

export function slot(k) {
  return { ...EMPTY, ...(data.progress[k] || {}) };
}

export function saveSlot(k, patch) {
  data.progress[k] = { ...slot(k), ...patch };
  writeAll(data);
}

export function allProgress() {
  return data.progress;
}

export function resetProgress() {
  data = { ...data, progress: {} };
  writeAll(data);
}

export function getSetting(k, fallback = null) {
  return k in data.settings ? data.settings[k] : fallback;
}

export function setSetting(k, v) {
  data = { ...data, settings: { ...data.settings, [k]: v } };
  writeAll(data);
}

/* ── review scheduling ─────────────────────────── */

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayStr() {
  return localDate(0);
}

function scheduleSoon(k) {
  const s = slot(k);
  const tomorrow = localDate(1);
  const due = s.due && s.due <= tomorrow ? s.due : tomorrow;
  saveSlot(k, { due, rstage: 0 });
}

export function notePeek(k) {
  saveSlot(k, { peeked: true });
  scheduleSoon(k);
}

export function noteRun(k, allPass) {
  const s = slot(k);
  const today = todayStr();
  if (!allPass) {
    saveSlot(k, { status: s.status === "pass" ? "pass" : "try" });
    scheduleSoon(k);
    return;
  }
  const patch = { status: "pass" };
  if (s.due && s.due <= today) {
    if (s.rstage >= 1) {
      patch.due = null;
      patch.rstage = 0;
    } else {
      patch.due = localDate(3);
      patch.rstage = 1;
    }
  }
  saveSlot(k, patch);
}

export function noteTried(k) {
  const s = slot(k);
  if (s.status === "none") saveSlot(k, { status: "try" });
}

// Everything due today or overdue, resolved to navigable items.
export function dueEntries(content) {
  const today = todayStr();
  const out = [];
  for (const [k, s] of Object.entries(data.progress)) {
    if (!s.due || s.due > today) continue;
    const [mode, id, stage] = k.split(":");
    let title = null;
    if (mode === "learn") title = content.lessons.find((x) => x.id === id)?.title;
    else if (mode === "drill") title = content.drills.find((x) => x.id === id)?.title;
    else if (mode === "exam") {
      const ex = content.exams.find((x) => x.id === id);
      if (ex) title = `${ex.title} · 阶段 ${Number(stage) + 1}`;
    }
    if (title) out.push({ key: k, mode, id, stage: stage == null ? null : Number(stage), title });
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

/* ── export / import ───────────────────────────── */

export function exportData() {
  return JSON.stringify(
    { app: "pyfde-lab", version: 2, exportedAt: new Date().toISOString(), data },
    null, 1,
  );
}

export function importData(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error("不是合法的 JSON 文件");
  }
  if (!obj || obj.app !== "pyfde-lab" || obj.version !== 2 ||
      typeof obj.data !== "object" || typeof obj.data.progress !== "object") {
    throw new Error("文件格式不对——需要本练习台导出的进度文件");
  }
  data = { progress: obj.data.progress, settings: obj.data.settings || {} };
  writeAll(data);
}
