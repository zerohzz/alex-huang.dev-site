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
  const [lessons, drills, exams, manifest, refHtml, prelude] = await Promise.all([
    getJson("content/lessons.json"),
    getJson("content/drills.json"),
    getJson("content/exams.json"),
    getJson("content/manifest.json"),
    getText("content/ref.html"),
    getText("content/prelude.py"),
  ]);

  // meta["learn:l01"] = {cases}, meta["exam:e1:0"] = {cases, deps}
  const meta = {};
  for (const row of manifest.exercises) {
    const mode = row.kind === "lesson" ? "learn" : row.kind;
    const key = row.stage == null ? `${mode}:${row.id}` : `${mode}:${row.id}:${row.stage}`;
    meta[key] = { cases: row.cases, deps: row.deps || [] };
  }

  return { lessons, drills, exams, refHtml, prelude, meta, manifest };
}
