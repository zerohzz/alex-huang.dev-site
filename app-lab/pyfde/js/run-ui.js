// The instrument strip and the output pane. Cells carry glyphs (· running ✓ ✕)
// so state never rides on colour alone; after a run each cell is labelled with
// its assertion name.

import { esc } from "./util.js";

export function stripHtml(count) {
  let cells = "";
  for (let i = 0; i < count; i++) {
    cells += `<span class="cell" role="img" aria-label="第 ${i + 1} 项：待测">·</span>`;
  }
  return `<div class="strip" id="strip" role="group" aria-label="测试读数">${cells}` +
         `<span class="cap" id="cap" aria-live="polite">${count} 项待测</span></div>`;
}

function ensureCellCount(strip, cap, n) {
  let cells = strip.querySelectorAll(".cell");
  if (cells.length !== n) {
    cells.forEach((c) => c.remove());
    let frag = "";
    for (let i = 0; i < n; i++) frag += `<span class="cell" role="img">·</span>`;
    cap.insertAdjacentHTML("beforebegin", frag);
    cells = strip.querySelectorAll(".cell");
  }
  return cells;
}

export function paintStripRunning() {
  const strip = document.getElementById("strip");
  const cap = document.getElementById("cap");
  if (!strip) return;
  strip.querySelectorAll(".cell").forEach((c, i) => {
    c.className = "cell run";
    c.textContent = "·";
    c.setAttribute("aria-label", `第 ${i + 1} 项：运行中`);
  });
  cap.className = "cap";
  cap.textContent = "运行中";
}

export function paintStripIdle(count) {
  const strip = document.getElementById("strip");
  const cap = document.getElementById("cap");
  if (!strip) return;
  const cells = ensureCellCount(strip, cap, count);
  cells.forEach((c, i) => {
    c.className = "cell";
    c.textContent = "·";
    c.setAttribute("aria-label", `第 ${i + 1} 项：待测`);
  });
  cap.className = "cap";
  cap.textContent = `${count} 项待测`;
}

export function paintStripResults(results) {
  const strip = document.getElementById("strip");
  const cap = document.getElementById("cap");
  if (!strip) return;
  const cells = ensureCellCount(strip, cap, results.length);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  results.forEach((r, i) => {
    const paint = () => {
      cells[i].className = "cell " + (r.ok ? "pass" : "fail");
      cells[i].textContent = r.ok ? "✓" : "✕";
      cells[i].setAttribute("aria-label", `${r.name}：${r.ok ? "通过" : "未过"}`);
      cells[i].title = `${r.name} — ${r.ok ? "通过" : "未过"}`;
    };
    reduce ? paint() : setTimeout(paint, i * 45);
  });
  const passed = results.filter((r) => r.ok).length;
  cap.className = "cap " + (passed === results.length && results.length > 0 ? "ok" : "no");
  cap.textContent = `${passed}/${results.length}` + (passed === results.length ? " 全过" : " 通过");
}

export function renderOutput(res, withTests) {
  const out = document.getElementById("out");
  const verdict = document.getElementById("verdict");
  if (!out) return;
  let html = "";

  if (res.stdout) {
    html += '<span class="d">— 输出 —</span>\n' + esc(res.stdout).replace(/\n$/, "") + "\n\n";
  }

  if (res.interrupted) {
    html += '<span class="r">已中断（KeyboardInterrupt）。</span>\n' +
      (res.rebooted
        ? '<span class="d">已强制终止，运行时正在重启——状态栏变绿后可直接再跑。</span>'
        : '<span class="d">运行时还在，改完代码直接再跑。</span>');
    verdict.innerHTML = '<span style="color:var(--rust)">已中断</span>';
    out.innerHTML = html;
    return;
  }

  if (res.error && res.phase === "code") {
    html += '<span class="r">你的代码报错了：</span>\n' + esc(res.error);
    verdict.innerHTML = '<span style="color:var(--rust)">代码异常</span>';
    out.innerHTML = html;
    return;
  }

  if (withTests) {
    if (res.results.length === 0 && res.error) {
      html += '<span class="r">测试没能跑起来（通常是你的函数名或签名对不上）：</span>\n' + esc(res.error);
      verdict.innerHTML = '<span style="color:var(--rust)">测试未运行</span>';
    } else {
      res.results.forEach((r) => {
        html += r.ok
          ? '<span class="g">  PASS</span>  ' + esc(r.name) + "\n"
          : '<span class="r">  FAIL</span>  ' + esc(r.name) + '\n        <span class="d">' + esc(r.msg) + "</span>\n";
      });
      if (res.error) html += '\n<span class="r">测试中途中断：</span>\n' + esc(res.error);
      const passed = res.results.filter((r) => r.ok).length;
      const all = res.results.length;
      html += "\n" + (passed === all && all > 0
        ? '<span class="g">全部 ' + all + " 项通过。</span>"
        : '<span class="d">' + passed + " / " + all + " 通过。</span>");
      verdict.innerHTML = passed === all && all > 0
        ? '<span style="color:var(--mint)">通过</span>'
        : '<span style="color:var(--rust)">' + (all - passed) + " 项未过</span>";
    }
  } else if (!res.stdout) {
    html += '<span class="d">跑完了，没有任何输出。加几个 print 看看中间值。</span>';
  } else {
    verdict.innerHTML = "";
  }

  out.innerHTML = html || '<span class="d">（空）</span>';
}
