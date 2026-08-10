// Sidebar: review queue (due items), catalogue per mode, records legend,
// export/import/reset. Structure ports the baseline; the review group and the
// data controls are new.

import { esc } from "./util.js";
import {
  slotKey, allProgress, dueEntries, resetProgress,
  exportData, importData,
} from "./store.js";
import { slotGlyph as glyphFor } from "./status.js";

// State word for screen readers; the glyph itself is aria-hidden.
const STATE_WORD = { done: "已通过", part: "试过", peek: "看过答案", "": "" };

function navButton({ id, mode, stage, num, glyph, cls, title, current }) {
  const state = STATE_WORD[cls] || "";
  const label = esc(title) + (state ? `，${state}` : "");
  return `<button class="nav" data-id="${id}"` +
    (mode ? ` data-mode="${mode}"` : "") +
    (stage != null ? ` data-stage="${stage}"` : "") +
    (current != null ? ` aria-current="${current}"` : "") +
    ` aria-label="${label}">` +
    `<span class="num" aria-hidden="true">${num}</span>` +
    `<span class="gl ${cls}" aria-hidden="true">${glyph}</span>` +
    `<span class="tx">${esc(title)}</span></button>`;
}

function tally(content) {
  let total = 0, done = 0;
  const p = allProgress();
  const passed = (k) => (p[k] || {}).status === "pass";
  content.lessons.forEach((l) => { total++; if (passed(slotKey("learn", l.id))) done++; });
  content.drills.forEach((d) => { total++; if (passed(slotKey("drill", d.id))) done++; });
  content.exams.forEach((e) => e.stages.forEach((_, i) => {
    total++; if (passed(slotKey("exam", e.id, i))) done++;
  }));
  return { total, done };
}

function reviewGroupHtml(app) {
  const due = dueEntries(app.content);
  if (!due.length) return "";
  const label = { learn: "教程", drill: "练习", exam: "真题" };
  let html = `<div class="side-group" id="reviewgroup"><div class="side-h"><span>今日复习</span><b>${due.length}</b></div>`;
  due.forEach((d) => {
    html += `<button class="nav review-nav" data-mode="${d.mode}" data-id="${d.id}"` +
      (d.stage != null ? ` data-stage="${d.stage}"` : "") +
      ` aria-label="${esc(d.title)}，待复习">` +
      `<span class="num" aria-hidden="true">${label[d.mode]}</span>` +
      `<span class="gl peek" aria-hidden="true">○</span>` +
      `<span class="tx">${esc(d.title)}</span></button>`;
  });
  html += "</div>";
  return html;
}

export function renderSide(app) {
  const side = document.getElementById("side");
  const { state, content } = app;
  const t = tally(content);
  let html = reviewGroupHtml(app);

  if (state.mode === "ref" || state.mode === "plan") {
    html += `<div class="side-group"><div class="side-h"><span>进度</span><b>${t.done}/${t.total}</b></div>` +
      `<p class="fine" style="padding:0 8px">` +
      (state.mode === "plan" ? "从今天的块开始，做完一块回来勾下一块。" : "切回教程、练习或真题继续。") +
      `</p></div>`;
  } else if (state.mode === "drill") {
    [0, 1, 2, 3].forEach((lv) => {
      const label = { 0: "L0 · 语法微练", 1: "L1 · 语法手感", 2: "L2 · 数据处理", 3: "L3 · LLM 工程" }[lv];
      html += `<div class="side-group"><div class="side-h"><span>${label}</span></div>`;
      content.drills.filter((d) => d.level === lv).forEach((d) => {
        const [g, cls] = glyphFor(slotKey("drill", d.id));
        html += navButton({
          id: d.id, num: d.id.slice(1), glyph: g, cls,
          title: d.title, current: d.id === state.id,
        });
      });
      html += "</div>";
    });
  } else if (state.mode === "learn") {
    for (const tier of ["地基", "进阶"]) {
      const group = content.lessons.filter((l) => l.tier === tier);
      const label = tier === "地基"
        ? `地基 · Apex→Python · ${group.length} 课`
        : `进阶 · 语法回炉 · ${group.length} 课`;
      html += `<div class="side-group"><div class="side-h"><span>${label}</span></div>`;
      group.forEach((it, i) => {
        const [g, cls] = glyphFor(slotKey("learn", it.id));
        html += navButton({
          id: it.id, num: String(i + 1).padStart(2, "0"), glyph: g, cls,
          title: it.title, current: it.id === state.id,
        });
      });
      html += "</div>";
    }
  } else {
    html += `<div class="side-group"><div class="side-h"><span>多阶段真题 · 5 道</span><b>${t.done}/${t.total}</b></div>`;
    content.exams.forEach((it, i) => {
      const st = it.stages.map((_, si) => (allProgress()[slotKey("exam", it.id, si)] || {}).status === "pass");
      const n = st.filter(Boolean).length;
      const g = n === st.length ? "●" : n > 0 ? "◐" : "·";
      const cls = n === st.length ? "done" : n > 0 ? "part" : "";
      html += navButton({
        id: it.id, num: String(i + 1).padStart(2, "0"), glyph: g, cls,
        title: it.title, current: it.id === state.id,
      });
    });
    html += "</div>";
  }

  html += `<div class="side-group"><div class="side-h"><span>记录</span></div>` +
    `<p class="fine" style="padding:0 8px 4px">● 通过　◐ 试过　○ 看过答案　· 没动</p>` +
    `<p class="fine" style="padding:0 8px 4px">看过答案或没跑过的题，第二天会出现在"今日复习"。</p></div>` +
    `<div class="side-foot">` +
    `<button class="btn ghost" id="export">导出进度</button>` +
    `<button class="btn ghost" id="importbtn">导入进度</button>` +
    `<input type="file" id="importfile" accept="application/json" hidden>` +
    `<button class="btn ghost" id="reset">清空全部进度</button>` +
    `</div>`;

  side.innerHTML = html;

  side.querySelectorAll(".nav").forEach((b) =>
    b.addEventListener("click", () => {
      const mode = b.dataset.mode || state.mode;
      const stage = b.dataset.stage != null ? Number(b.dataset.stage) : 0;
      const id = b.dataset.id;
      app.navigate(mode, id, stage);
      if (window.innerWidth <= 860) {
        app.setSideHidden(true);
      } else {
        // navigate() rebuilt the sidebar — put keyboard focus back on the item
        document.querySelector(`#side .nav[data-id="${id}"]`)?.focus();
      }
      document.getElementById("main").scrollIntoView({ block: "start" });
    })
  );

  document.getElementById("export").addEventListener("click", () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pyfde-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const fileInput = document.getElementById("importfile");
  document.getElementById("importbtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files[0];
    if (!f) return;
    if (!confirm("导入会覆盖当前的全部进度和代码，继续？")) { fileInput.value = ""; return; }
    try {
      importData(await f.text());
      app.render();
    } catch (e) {
      alert("导入失败：" + e.message);
    }
    fileInput.value = "";
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (confirm("清空所有进度和保存的代码？这一步没法撤销。")) {
      resetProgress();
      app.render();
    }
  });
}
