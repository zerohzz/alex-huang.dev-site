// Exam countdown. Low state (≤5 min) is signalled by text ("剩 mm:ss"), not
// colour alone, and announced once through the #clockannounce live region —
// never per tick, which would make a screen reader unusable.

const t = { handle: null, left: 0, announced: false };

export function timerActive() {
  return t.handle !== null;
}

function announce(text) {
  const el = document.getElementById("clockannounce");
  if (el) el.textContent = text;
}

export function paintClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  const m = Math.floor(Math.max(t.left, 0) / 60);
  const s = Math.max(t.left, 0) % 60;
  const mmss = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  const low = t.left <= 300;
  el.textContent = low && t.left > 0 ? "剩 " + mmss : mmss;
  el.className = low ? "low" : "";
  if (low && t.left > 0 && !t.announced) {
    t.announced = true;
    announce("剩不足 5 分钟");
  }
  if (t.left <= 0) el.textContent = "时间到";
}

export function stopTimer() {
  if (t.handle) clearInterval(t.handle);
  t.handle = null;
  t.left = 0;
  t.announced = false;
}

export function startTimer(minutes) {
  stopTimer();
  t.left = minutes * 60;
  paintClock();
  t.handle = setInterval(() => {
    t.left--;
    paintClock();
    if (t.left <= 0) {
      clearInterval(t.handle);
      t.handle = null;
      announce("时间到");
      const o = document.getElementById("out");
      if (o) {
        o.innerHTML = '<span class="d">时间到。真实面试里这时候该停手了——把你现在有的说清楚，' +
          "讲一遍还差什么、下一步会怎么做。然后再回来继续写。</span>";
      }
    }
  }, 1000);
}
