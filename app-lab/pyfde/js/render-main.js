// Main working area: lesson / drill / exam views, the editors, the run bar,
// hints and the two-step answer reveal. Ports the baseline's view logic onto
// the worker runtime and CM6.

import { esc } from "./util.js";
import { slotKey, slot, saveSlot, notePeek, noteRun, noteTried, allProgress } from "./store.js";
import { createEditor } from "./editor.js";
import {
  stripHtml, paintStripRunning, paintStripIdle, paintStripResults, renderOutput,
} from "./run-ui.js";
import { startTimer, timerActive, paintClock } from "./timer.js";

function countFallback(tests) {
  if (!tests) return 1;
  const a = (tests.match(/@case\(/g) || []).length;
  const b = (tests.match(/check_eq\(/g) || []).length;
  return Math.max(a + b, 1);
}

function headerHtml(app, it, task) {
  const { state, content } = app;
  let html = "";
  if (state.mode === "learn") {
    const n = content.lessons.indexOf(it) + 1;
    html += `<div class="eyebrow"><span class="tag">教程 ${String(n).padStart(2, "0")}/12</span>` +
      `<span>${esc(it.goal)}</span></div><h1>${esc(it.title)}</h1>` +
      `<div>${it.body}</div>` +
      `<h2>跑一遍这段</h2><p class="fine">改它，弄坏它，再修好。这比读十遍有用。</p>` +
      `<div class="pane"><div class="pane-h"><span>示例</span>` +
      `<span class="right"><span class="kbd">⌘/Ctrl+Enter 运行 · Esc 后 Tab 移出</span></span></div>` +
      `<div class="edwrap demo" id="demo-editor"></div></div>` +
      `<div style="display:flex;gap:8px;margin-bottom:8px">` +
      `<button class="btn" id="rundemo">运行示例</button>` +
      `<button class="btn ghost" id="resetdemo">还原</button></div>` +
      `<div class="pane"><div class="pane-h"><span>输出</span></div>` +
      `<pre class="out" id="demoout"><span class="d">还没运行。</span></pre></div>` +
      `<h2>动手</h2><p>${it.task.prompt}</p>`;
  } else if (state.mode === "drill") {
    const lv = { 1: "L1 语法手感", 2: "L2 数据处理", 3: "L3 LLM 工程" }[it.level];
    html += `<div class="eyebrow"><span class="tag${it.level === 3 ? " hot" : ""}">${lv}</span>` +
      `<span class="tag">${esc(it.tag)}</span></div><h1>${esc(it.title)}</h1><p>${it.prompt}</p>`;
  } else {
    const cleared = it.stages.filter((_, si) =>
      (allProgress()[slotKey("exam", it.id, si)] || {}).status === "pass").length;
    html += `<div class="eyebrow"><span class="tag exam">多阶段真题</span>` +
      `<span class="tag">${it.minutes} 分钟</span>` +
      `<span>${cleared}/${it.stages.length} 阶段通过</span></div>` +
      `<h1>${esc(it.title)}</h1><p>${it.brief}</p>` +
      `<p class="fine">题源：${esc(it.source)}</p>` +
      `<div style="display:flex;gap:8px;align-items:center;margin:18px 0 6px;flex-wrap:wrap">` +
      `<button class="btn" id="starttimer">开始计时 ${it.minutes} 分钟</button>` +
      `<span id="clock" class="off">--:--</span>` +
      `<span id="clockannounce" class="sr-only" role="status"></span>` +
      `<details class="rev" id="tipwrap" style="margin:0;border:0;background:transparent">` +
      `<summary style="padding:9px 0">临场提示</summary></details></div>` +
      `<div id="tipbox" hidden class="note"><b>做完再看</b><ul style="margin:8px 0 0">` +
      it.tips.map((t) => `<li>${t}</li>`).join("") + `</ul></div>` +
      `<div id="stages">` + it.stages.map((s, i) => {
        const done = (allProgress()[slotKey("exam", it.id, i)] || {}).status === "pass";
        return `<button class="stg${done ? " cleared" : ""}" data-stage="${i}"` +
          ` aria-current="${i === state.stage}"` +
          ` aria-label="阶段 ${i + 1}${done ? "，已通过" : ""}">` +
          `${done ? "●" : "○"} 阶段 ${i + 1}</button>`;
      }).join("") + `</div>` +
      `<h2>${esc(task.title)}</h2><p>${task.prompt}</p>`;
    const deps = (app.content.meta[app.activeKey()] || {}).deps || [];
    if (deps.length) {
      html += `<p class="fine">本阶段的测试会用到阶段 ${deps.map((d) => d + 1).join("、")} 的实现` +
        `——延续你上一阶段的代码，或载入上一阶段参考实现。</p>`;
    }
  }
  return html;
}

export function renderMain(app) {
  const main = document.getElementById("main");
  const { state } = app;
  document.getElementById("rail").className = state.mode === "exam" ? "exam" : "";

  if (state.mode === "ref") {
    main.innerHTML = app.content.refHtml;
    return;
  }

  const it = app.current();
  const task = app.activeTask();
  const key = app.activeKey();
  const count = (app.content.meta[key] || {}).cases || countFallback(task.tests);

  let html = headerHtml(app, it, task);

  html += `<div class="pane"><div class="pane-h"><span>你的代码</span>` +
    `<span class="right"><span class="kbd">⌘/Ctrl+Enter 运行 · ⌘/Ctrl+. 停止 · Esc 后 Tab 移出编辑器</span></span></div>` +
    `<div class="edwrap" id="code-editor"></div></div>`;

  html += `<div id="bar">` + stripHtml(count) +
    `<button class="btn go" id="run">跑测试</button>` +
    `<button class="btn" id="justrun">只运行</button>` +
    `<button class="btn" id="stop" disabled>停止</button>` +
    (state.mode === "exam" && state.stage > 0
      ? `<button class="btn ghost" id="carrymine">载入我上一阶段的代码</button>` +
        `<button class="btn ghost" id="carryref">载入上一阶段参考实现</button>`
      : "") +
    `<button class="btn ghost" id="clear">还原初始代码</button></div>`;

  html += `<div class="pane"><div class="pane-h"><span>输出</span>` +
    `<span class="right" id="verdict"></span></div>` +
    `<pre class="out" id="out"><span class="d">还没运行。⌘/Ctrl + Enter 跑一次。</span></pre></div>`;

  if (task.hints && task.hints.length) {
    html += `<details class="rev"><summary>卡住了 · 逐条提示（${task.hints.length}）</summary>` +
      `<div class="rev-body">` +
      task.hints.map((h, i) => `<div class="hintstep"><b>${i + 1}</b> · ${h}</div>`).join("") +
      `</div></details>`;
  }
  html += `<details class="rev" id="solwrap"><summary>参考答案 · 锁着</summary>` +
    `<div class="rev-body" id="solbody">` +
    `<div class="gate"><p>先自己写十分钟。看过答案的题会在目录里标成 ` +
    `<span style="color:var(--iris)">○</span>，明天会出现在"今日复习"里。</p>` +
    `<button class="btn" id="unlock">我确定，展开答案</button></div></div></details>`;

  html += `<hr class="rule"><p class="fine">进度和你写的代码存在这台机器的浏览器里，不上传任何地方。` +
    `记得偶尔"导出进度"留个备份。</p>`;

  main.innerHTML = html;
  wireMain(app, it, task, key, count);
}

function refreshStageChips(item, state) {
  document.querySelectorAll(".stg").forEach((b, i) => {
    const done = (allProgress()[slotKey("exam", item.id, i)] || {}).status === "pass";
    b.classList.toggle("cleared", done);
    b.textContent = (done ? "●" : "○") + " 阶段 " + (i + 1);
    b.setAttribute("aria-current", String(i === state.stage));
    b.setAttribute("aria-label", `阶段 ${i + 1}${done ? "，已通过" : ""}`);
  });
}

function wireMain(app, item, task, key, count) {
  const saved = slot(key).code != null ? slot(key).code : task.starter;
  const ed = createEditor({
    parent: document.getElementById("code-editor"),
    doc: saved,
    onRun: () => go(true),
    onRunOnly: () => go(false),
    onChange: (v) => saveSlot(key, { code: v }),
  });
  app.activeEditor = ed;

  async function go(withTests) {
    const rt = app.runtime;
    const outEl = document.getElementById("out");
    if (rt.state === "booting") {
      outEl.innerHTML = '<span class="d">Python 还在启动，稍等一下。</span>';
      return;
    }
    if (rt.state === "down") {
      outEl.innerHTML = '<span class="r">Python 运行时没有启动。</span>\n\n' +
        '<span class="d">请确认你是通过 serve.py 打开的：在 v2 目录里执行\n\n' +
        "    python3 serve.py\n\n" +
        '然后打开 http://127.0.0.1:8137/ 。</span>';
      return;
    }
    if (rt.state !== "ready") return;

    saveSlot(key, { code: ed.getValue() });
    ed.setErrorLine(null);
    paintStripRunning();
    outEl.textContent = "";
    document.getElementById("verdict").innerHTML = "";

    const res = await rt.run({
      prelude: app.content.prelude,
      code: ed.getValue(),
      tests: withTests ? task.tests : null,
      onOut: (text) => outEl.appendChild(document.createTextNode(text)),
    });

    renderOutput(res, withTests);
    if (res.errorLine) ed.setErrorLine(res.errorLine);

    if (res.interrupted) {
      paintStripIdle(count);
    } else if (withTests) {
      paintStripResults(res.results);
      const all = res.results.length;
      const passed = res.results.filter((r) => r.ok).length;
      noteRun(key, all > 0 && passed === all && !res.error);
      app.renderSide();
      if (app.state.mode === "exam") refreshStageChips(item, app.state);
    } else {
      paintStripIdle(count);
      noteTried(key);
    }
    app.syncRunButtons();
  }
  app.go = go;

  document.getElementById("run").addEventListener("click", () => go(true));
  document.getElementById("justrun").addEventListener("click", () => go(false));
  document.getElementById("stop").addEventListener("click", () => app.runtime.interrupt());
  document.getElementById("clear").addEventListener("click", () => {
    if (!confirm("还原成初始代码？你写的会丢掉。")) return;
    ed.setValue(task.starter);
    saveSlot(key, { code: task.starter });
  });

  const carryMine = document.getElementById("carrymine");
  if (carryMine) carryMine.addEventListener("click", () => {
    const prev = slot(slotKey("exam", item.id, app.state.stage - 1));
    if (prev.code == null) {
      alert("上一阶段还没有你写的代码。");
      return;
    }
    ed.setValue(prev.code + "\n");
    saveSlot(key, { code: ed.getValue() });
  });

  const carryRef = document.getElementById("carryref");
  if (carryRef) carryRef.addEventListener("click", () => {
    const prev = item.stages[app.state.stage - 1];
    ed.setValue("# ── 上一阶段的参考实现，在这上面继续加需求 ──\n" + prev.solution + "\n");
    saveSlot(key, { code: ed.getValue() });
  });

  const unlock = document.getElementById("unlock");
  if (unlock) unlock.addEventListener("click", () => {
    notePeek(key);
    document.getElementById("solbody").innerHTML =
      `<pre class="demo" style="padding:0">${esc(task.solution)}</pre>`;
    document.querySelector("#solwrap summary").textContent = "参考答案 · 已展开";
    app.renderSide();
  });
  if (slot(key).peeked) {
    document.querySelector("#solwrap summary").textContent = "参考答案 · 之前看过";
  }

  /* lesson demo editor */
  const demoParent = document.getElementById("demo-editor");
  if (demoParent) {
    const demoEd = createEditor({
      parent: demoParent,
      doc: item.demo,
      onRun: () => runDemo(),
    });
    async function runDemo() {
      const o = document.getElementById("demoout");
      if (app.runtime.state !== "ready") {
        o.innerHTML = '<span class="r">Python 还没就绪。</span>';
        return;
      }
      o.textContent = "";
      const res = await app.runtime.run({
        prelude: app.content.prelude,
        code: demoEd.getValue(),
        tests: null,
        onOut: (text) => o.appendChild(document.createTextNode(text)),
      });
      o.innerHTML = (res.stdout ? esc(res.stdout) : '<span class="d">（无输出）</span>') +
        (res.error ? '\n<span class="r">' + esc(res.error) + "</span>" : "");
      app.syncRunButtons();
    }
    document.getElementById("rundemo").addEventListener("click", runDemo);
    document.getElementById("resetdemo").addEventListener("click", () => demoEd.setValue(item.demo));
  }

  /* exam extras */
  document.querySelectorAll(".stg").forEach((b) =>
    b.addEventListener("click", () => {
      app.state.stage = Number(b.dataset.stage);
      app.persistLocation();
      renderMain(app);
      app.syncRunButtons();
      // the re-render replaced the chips — restore keyboard focus
      document.querySelector('.stg[aria-current="true"]')?.focus();
    })
  );
  const st = document.getElementById("starttimer");
  if (st) st.addEventListener("click", () => startTimer(item.minutes));
  const tipWrap = document.getElementById("tipwrap");
  if (tipWrap) tipWrap.addEventListener("toggle", (e) => {
    const box = document.getElementById("tipbox");
    if (box) box.hidden = !e.target.open;
  });
  if (timerActive()) paintClock();
}
