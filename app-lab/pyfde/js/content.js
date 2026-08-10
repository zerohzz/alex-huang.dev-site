// Loads the content files extracted from the baseline plus the manifest.
// The manifest carries what the baseline only guessed at: the verified
// assertion count per exercise (no regex heuristic) and the machine-checked
// stage dependency map.

async function getJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

async function getText(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.text();
}

export async function loadContent() {
  const [baseLessons, baseDrills, exams, manifest, refHtml, prelude,
         bridgeLessons, l0Drills] = await Promise.all([
    getJson("content/lessons.json"),
    getJson("content/drills.json"),
    getJson("content/exams.json"),
    getJson("content/manifest.json"),
    getText("content/ref.html"),
    getText("content/prelude.py"),
    getJson("content/foundation-lessons.json"),
    getJson("content/foundation-drills.json"),
  ]);

  // 版图从易到难：地基（桥接课 + L0）排在进阶内容前面。
  const lessons = [
    ...bridgeLessons.map((l) => ({ ...l, tier: "地基" })),
    ...baseLessons.map((l) => ({ ...l, tier: "进阶" })),
  ];
  const drills = [...l0Drills, ...baseDrills];

  // meta["learn:l01"] = {cases}, meta["exam:e1:0"] = {cases, deps}
  const meta = {};
  const rows = [...manifest.exercises, ...(manifest.foundation?.exercises || [])];
  for (const row of rows) {
    const mode = row.kind === "lesson" ? "learn" : row.kind;
    const key = row.stage == null ? `${mode}:${row.id}` : `${mode}:${row.id}:${row.stage}`;
    meta[key] = { cases: row.cases, deps: row.deps || [] };
  }

  return { lessons, drills, exams, refHtml, prelude, meta, manifest };
}
