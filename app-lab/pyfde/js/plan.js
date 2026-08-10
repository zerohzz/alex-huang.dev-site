// 14 天学习计划的数据与日期推算。视图在 render-main.js 的 plan 分支。
// 结构对应 notes/study-plan.md —— 改计划先改那份文档，再改这里。

export const PLAN = [
  { day: 1, phase: "地基", title: "骨架、类型与集合",
    note: "目标：不查文档写出 list/dict/set 的增删改查。",
    blocks: [
      { mode: "learn", id: "b01" }, { mode: "learn", id: "b02" }, { mode: "learn", id: "b03" },
    ] },
  { day: 2, phase: "地基", title: "循环、函数、字符串",
    note: "今天的坑：Python 没有方法重载、没有 ++。",
    blocks: [
      { mode: "learn", id: "b04" }, { mode: "learn", id: "b05" }, { mode: "learn", id: "b06" },
      { mode: "drill", id: "f01" }, { mode: "drill", id: "f02" }, { mode: "drill", id: "f03" },
      { mode: "drill", id: "f04" }, { mode: "drill", id: "f05" }, { mode: "drill", id: "f06" },
    ] },
  { day: 3, phase: "地基", title: "类、异常、导入、SOQL 思维",
    note: "地基封顶。B10 的推导式映射是你独有的优势，练熟。",
    blocks: [
      { mode: "learn", id: "b07" }, { mode: "learn", id: "b08" },
      { mode: "learn", id: "b09" }, { mode: "learn", id: "b10" },
      { mode: "drill", id: "f07" }, { mode: "drill", id: "f08" }, { mode: "drill", id: "f09" },
      { mode: "drill", id: "f10" }, { mode: "drill", id: "f11" }, { mode: "drill", id: "f12" },
      { mode: "drill", id: "f13" },
    ] },
  { day: 4, phase: "进阶语法", title: "dict、set、推导与排序",
    note: "桥接课讲过的概念，这里练到不假思索。",
    blocks: [
      { mode: "learn", id: "l03" }, { mode: "learn", id: "l04" }, { mode: "learn", id: "l05" },
      { mode: "drill", id: "d01" }, { mode: "drill", id: "d03" },
    ] },
  { day: 5, phase: "进阶语法", title: "函数进阶、collections、类",
    note: "l06 的可变默认值是必问题。",
    blocks: [
      { mode: "learn", id: "l06" }, { mode: "learn", id: "l07" }, { mode: "learn", id: "l08" },
      { mode: "drill", id: "d04" }, { mode: "drill", id: "d05" },
    ] },
  { day: 6, phase: "进阶语法", title: "异常与 JSON",
    note: "d07 脏数据清洗是 FDE 送分题型。",
    blocks: [
      { mode: "learn", id: "l09" }, { mode: "learn", id: "l10" },
      { mode: "drill", id: "d07" },
    ] },
  { day: 7, phase: "自测", title: "周中自测",
    note: "限时 25 分钟做 d10 手写 LRU。做不出来就是信号：明天先重做。",
    blocks: [
      { mode: "drill", id: "d02" }, { mode: "drill", id: "d06" }, { mode: "drill", id: "d08" },
      { mode: "drill", id: "d10", label: "手写 LRU 缓存（限时 25 分钟）" },
    ] },
  { day: 8, phase: "LLM 工程", title: "生成器与分块",
    blocks: [
      { mode: "learn", id: "l11" },
      { mode: "drill", id: "d12" }, { mode: "drill", id: "d13" },
    ] },
  { day: 9, phase: "LLM 工程", title: "async 与重试",
    blocks: [
      { mode: "learn", id: "l12" },
      { mode: "drill", id: "d15" }, { mode: "drill", id: "d16" },
    ] },
  { day: 10, phase: "真题", title: "缓存四阶段",
    note: "先计时 45 分钟真打一遍，再复盘补洞。考的是阶段 1 的代码能不能扛住阶段 4。",
    blocks: [{ mode: "exam", id: "e1" }] },
  { day: 11, phase: "真题", title: "文件去重 + 调用栈",
    blocks: [{ mode: "exam", id: "e3" }, { mode: "exam", id: "e2" }] },
  { day: 12, phase: "真题", title: "Eval Harness",
    note: "最贴近 FDE 日常的一道，值得整晚。",
    blocks: [{ mode: "exam", id: "e4" }] },
  { day: 13, phase: "真题", title: "流式解析 + 二刷",
    note: "重做 E1，对比第一次：阶段 1 的设计是不是变好了。",
    blocks: [
      { mode: "exam", id: "e5" },
      { mode: "exam", id: "e1", label: "缓存四阶段（二刷）" },
    ] },
  { day: 14, phase: "模拟", title: "全真模拟",
    note: "速查页过一遍，然后任选一道真题：计时、不看提示、全程口播。",
    blocks: [{ mode: "ref", label: "速查页过一遍" }] },
];

function localDateStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayPlanDay(planStart) {
  if (!planStart) return null;
  const start = new Date(planStart + "T00:00:00");
  const now = new Date(localDateStr(new Date()) + "T00:00:00");
  const diff = Math.round((now - start) / 86400000) + 1;
  if (diff < 1) return null;
  return Math.min(diff, PLAN.length);
}

export function startToday() {
  return localDateStr(new Date());
}
