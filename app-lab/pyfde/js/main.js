// Orchestrator: app state, mode/theme/rail wiring, boot sequence, and the
// status readout (including the measured boot time — the C2 metric, visible
// every morning).

import { loadContent } from "./content.js";
import { Runtime } from "./runtime.js";
import { getSetting, setSetting } from "./store.js";
import { renderSide } from "./render-side.js";
import { renderMain } from "./render-main.js";
import { stopTimer } from "./timer.js";

const lamp = document.getElementById("lamp");
const statusText = document.getElementById("statustext");
const loadbar = document.getElementById("loadbar");
const a11yStatus = document.getElementById("a11y-status");

// `announce` feeds the screen-reader live region — only boot transitions, so
// per-run chatter stays out of it (the strip's #cap announces run results).
function setStatus(kind, text, { extra = "", announce = false } = {}) {
  lamp.className = "lamp " + kind;
  statusText.textContent = text;
  if (extra) {
    const span = document.createElement("span");
    span.className = "boottime";
    span.textContent = extra;
    statusText.appendChild(span);
  }
  statusText.title = text + extra;
  if (announce) a11yStatus.textContent = text + extra;
}

const app = {
  state: { mode: "learn", id: null, stage: 0 },
  content: null,
  runtime: null,
  activeEditor: null,

  itemsFor(mode) {
    if (mode === "learn") return this.content.lessons;
    if (mode === "drill") return this.content.drills;
    if (mode === "exam") return this.content.exams;
    return [];
  },
  current() {
    const items = this.itemsFor(this.state.mode);
    return items.find((x) => x.id === this.state.id) || items[0];
  },
  activeTask() {
    const it = this.current();
    if (!it) return null;
    if (this.state.mode === "exam") return it.stages[this.state.stage];
    if (this.state.mode === "learn") return it.task;
    return it;
  },
  activeKey() {
    return this.state.mode === "exam"
      ? `exam:${this.state.id}:${this.state.stage}`
      : `${this.state.mode}:${this.state.id}`;
  },

  navigate(mode, id, stage = 0) {
    if (mode !== this.state.mode) this.selectModeButton(mode);
    this.state.mode = mode;
    this.state.id = id;
    this.state.stage = stage;
    stopTimer();
    this.persistLocation();
    this.render();
  },
  persistLocation() {
    setSetting("last", { ...this.state });
  },
  selectModeButton(mode) {
    document.querySelectorAll(".mode").forEach((x) =>
      x.setAttribute("aria-current", String(x.dataset.mode === mode)));
    document.querySelector('.mode[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  },
  setSideHidden(hidden) {
    document.getElementById("side").hidden = hidden;
    document.getElementById("sidetoggle").setAttribute("aria-expanded", String(!hidden));
  },

  renderSide() { renderSide(this); },
  renderMain() { renderMain(this); },
  render() {
    this.renderSide();
    this.renderMain();
    this.syncRunButtons();
  },

  syncRunButtons() {
    const stateNow = this.runtime ? this.runtime.state : "down";
    for (const id of ["run", "justrun", "rundemo"]) {
      const b = document.getElementById(id);
      if (b) b.disabled = stateNow !== "ready";
    }
    const stop = document.getElementById("stop");
    if (stop) {
      stop.disabled = stateNow !== "running";
      stop.title = this.runtime && this.runtime.canSignal
        ? "发送 KeyboardInterrupt"
        : "强制终止并重启运行时";
    }
  },
};

function statusChanged(kind, detail) {
  const rt = app.runtime;
  if (kind === "booting") {
    loadbar.style.width = "55%";
    setStatus("warm", "正在启动 Python…", { announce: true });
  } else if (kind === "ready") {
    loadbar.style.width = "100%";
    setTimeout(() => (loadbar.style.width = "0"), 700);
    const ms = rt.totalBootMs();
    const t = ms != null ? ` · ${(ms / 1000).toFixed(1)}s` : "";
    const mode = rt.canSignal ? "" : " · 停止=重启";
    setStatus("on", `Python ${rt.version} 就绪`, { extra: t + mode, announce: true });
  } else if (kind === "running") {
    setStatus("warm", "运行中…");
  } else if (kind === "down") {
    loadbar.style.width = "0";
    setStatus("bad", "Python 没能启动", { announce: true });
    if (detail) console.error("pyodide boot:", detail);
  }
  app.syncRunButtons();
}

function wireChrome() {
  document.querySelectorAll(".mode").forEach((b) =>
    b.addEventListener("click", () => {
      const mode = b.dataset.mode;
      const first = app.itemsFor(mode)[0];
      app.navigate(mode, first ? first.id : null, 0);
      window.scrollTo({ top: 0 });
    })
  );

  document.getElementById("sidetoggle").addEventListener("click", () => {
    app.setSideHidden(!document.getElementById("side").hidden);
  });

  const themeBtn = document.getElementById("themetoggle");
  const currentTheme = () => document.documentElement.dataset.theme ||
    (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const syncThemeLabel = () => themeBtn.setAttribute("aria-label",
    currentTheme() === "dark" ? "切换到浅色主题" : "切换到深色主题");
  themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setSetting("theme", next);
    syncThemeLabel();
  });
  syncThemeLabel();

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter" && app.go) {
      e.preventDefault();
      app.go(!e.shiftKey);
    } else if (mod && e.key === "." && app.runtime) {
      e.preventDefault();
      app.runtime.interrupt();
    }
  });

  if (window.innerWidth <= 860) app.setSideHidden(true);
}

async function start() {
  loadbar.style.width = "22%";
  app.runtime = new Runtime({ onStatus: statusChanged });
  const booting = app.runtime.boot().catch(() => { /* surfaced via status */ });

  try {
    app.content = await loadContent();
  } catch (err) {
    document.getElementById("main").innerHTML =
      `<h1>内容没能加载</h1>` +
      `<p>这个页面不能用 file:// 直接打开。请在 v2 目录里执行：</p>` +
      `<div class="pane"><pre class="demo">python3 serve.py</pre></div>` +
      `<p>然后打开 <code>http://127.0.0.1:8137/</code> 。</p>` +
      `<p class="fine">${String(err.message || err)}</p>`;
    setStatus("bad", "内容加载失败");
    return;
  }

  const last = getSetting("last");
  const valid = last && app.itemsFor(last.mode) &&
    app.itemsFor(last.mode).some((x) => x.id === last.id);
  if (valid) {
    app.state = { mode: last.mode, id: last.id, stage: last.stage || 0 };
    if (app.state.mode === "exam") {
      const stages = app.current().stages.length;
      if (app.state.stage >= stages) app.state.stage = 0;
    }
  } else {
    app.state = { mode: "learn", id: app.content.lessons[0].id, stage: 0 };
  }
  app.selectModeButton(app.state.mode);

  wireChrome();
  app.render();
  await booting;
}

start();

// Test hook for the E2E suite; not part of the app surface.
window.__pyfde = app;
