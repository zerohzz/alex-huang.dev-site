// 计划视图：14 天路径，每天一张卡，块的完成状态直接读进度存储。
// 数据在 js/plan.js；文字版在 notes/study-plan.md。

import { esc } from "./util.js";
import { getSetting, setSetting } from "./store.js";
import { PLAN, todayPlanDay, startToday } from "./plan.js";
import { itemGlyph, itemTitle } from "./status.js";

const MODE_LABEL = { learn: "教程", drill: "练习", exam: "真题", ref: "速查" };

function blockHtml(b, content) {
  const title = b.label || itemTitle(b.mode, b.id, content);
  const [g, cls] = b.id ? itemGlyph(b.mode, b.id, content) : ["·", ""];
  return `<button class="plan-block" data-mode="${b.mode}"` +
    (b.id ? ` data-id="${b.id}"` : "") +
    ` aria-label="${esc(title)}（${MODE_LABEL[b.mode]}）">` +
    `<span class="gl ${cls}" aria-hidden="true">${g}</span>` +
    `<span class="tx">${esc(title)}</span>` +
    `<span class="num" aria-hidden="true">${MODE_LABEL[b.mode]}</span></button>`;
}

function dayDone(day, content) {
  const withId = day.blocks.filter((b) => b.id);
  const done = withId.filter((b) => itemGlyph(b.mode, b.id, content)[0] === "●").length;
  return { done, total: withId.length };
}

export function renderPlan(app) {
  const main = document.getElementById("main");
  const { content } = app;
  const planStart = getSetting("planStart");
  const today = todayPlanDay(planStart);

  let html = `<div class="eyebrow"><span class="tag">14 天</span><span>从 Apex 到面试水平，从易到难</span></div>` +
    `<h1>学习计划</h1>` +
    `<p class="lead">每天固定开场：先清"今日复习"，再做当天的块。时间不够就只做复习队列加当天第一块。</p>`;

  if (!planStart) {
    html += `<div class="note"><b>还没开始</b> · 点下面的按钮把今天定为第 1 天。日期只存在这台机器的浏览器里。</div>` +
      `<p><button class="btn go" id="planstart">从今天开始计划</button></p>`;
  } else if (today === null) {
    html += `<p class="fine">计划从 ${esc(planStart)} 开始，还没到第 1 天。</p>` +
      `<p><button class="btn ghost" id="planreset">重设开始日期</button></p>`;
  } else {
    html += `<p class="fine">开始于 ${esc(planStart)} · 今天是第 ${today} 天` +
      ` · <button class="btn ghost" id="planreset" style="padding:4px 9px">重设</button></p>`;
  }

  PLAN.forEach((day) => {
    const { done, total } = dayDone(day, content);
    const isToday = today === day.day;
    html += `<div class="pane plan-day${isToday ? " today" : ""}"${isToday ? ' id="plan-today"' : ""}>` +
      `<div class="pane-h"><span>D${day.day} · ${esc(day.phase)} · ${esc(day.title)}</span>` +
      `<span class="right">${isToday ? '<span class="tag hot" style="border-width:1px">今天</span>' : ""}` +
      `<span>${done}/${total}</span></span></div>` +
      `<div class="plan-blocks">` +
      day.blocks.map((b) => blockHtml(b, content)).join("") +
      (day.note ? `<p class="fine" style="margin:6px 10px 4px">${esc(day.note)}</p>` : "") +
      `</div></div>`;
  });

  html += `<p class="fine">降级规则：只剩 60 分钟就做复习队列加当天标注的那一道；只剩 30 分钟只清复习队列。` +
    `连续两天降级就把后面顺延，砍真题以外的内容。</p>`;

  main.innerHTML = html;

  main.querySelectorAll(".plan-block").forEach((b) =>
    b.addEventListener("click", () => {
      app.navigate(b.dataset.mode, b.dataset.id || null, 0);
      window.scrollTo({ top: 0 });
    })
  );
  const startBtn = document.getElementById("planstart");
  if (startBtn) startBtn.addEventListener("click", () => {
    setSetting("planStart", startToday());
    renderPlan(app);
  });
  const resetBtn = document.getElementById("planreset");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (confirm("重设开始日期？进度不受影响，只是第几天从头算。")) {
      setSetting("planStart", null);
      renderPlan(app);
    }
  });

  const todayCard = document.getElementById("plan-today");
  if (todayCard) todayCard.scrollIntoView({ block: "center" });
}
