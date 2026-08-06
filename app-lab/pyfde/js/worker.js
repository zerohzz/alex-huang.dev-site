// Pyodide lives here, off the main thread, so runaway user code can never
// freeze the page. Classic worker (importScripts) — Pyodide's loader is not
// an ES module.
//
// Protocol (main -> worker):
//   {type:"boot", indexURL}
//   {type:"interruptBuffer", buffer}          SharedArrayBuffer, once, optional
//   {type:"run", id, prelude, code, tests}    tests may be null ("只运行")
// Protocol (worker -> main):
//   {type:"ready", version}
//   {type:"bootError", error}
//   {type:"out", id, text}                    streamed stdout/stderr lines
//   {type:"result", id, results, stdout, error, phase, errorLine, interrupted}

"use strict";

let pyodide = null;
let currentRunId = null;
let stdoutParts = [];

// Executes a source string inside the run's namespace under a stable filename,
// so tracebacks can be mapped back to editor lines. Mirrors Pyodide's own
// top-level-await handling.
const DRIVER = `
import ast as _pyfde_ast, inspect as _pyfde_inspect
_pyfde_code = compile(_pyfde_src, _pyfde_file, "exec",
                      flags=_pyfde_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
_pyfde_r = eval(_pyfde_code)
if _pyfde_inspect.iscoroutine(_pyfde_r):
    await _pyfde_r
`;

function emit(text) {
  stdoutParts.push(text);
  self.postMessage({ type: "out", id: currentRunId, text });
}

async function boot(indexURL) {
  try {
    importScripts(indexURL + "pyodide.js");
    pyodide = await self.loadPyodide({ indexURL });
    // Batched handlers receive one line per call, newline stripped.
    pyodide.setStdout({ batched: (s) => emit(s + "\n") });
    pyodide.setStderr({ batched: (s) => emit(s + "\n") });
    const pythonVersion = pyodide.runPython(
      "import sys; '.'.join(map(str, sys.version_info[:3]))"
    );
    self.postMessage({ type: "ready", version: pythonVersion });
  } catch (err) {
    self.postMessage({ type: "bootError", error: String((err && err.message) || err) });
  }
}

async function execTagged(src, filename, ns) {
  ns.set("_pyfde_src", src);
  ns.set("_pyfde_file", filename);
  try {
    await pyodide.runPythonAsync(DRIVER, { globals: ns });
  } finally {
    for (const k of ["_pyfde_src", "_pyfde_file", "_pyfde_code", "_pyfde_r",
                     "_pyfde_ast", "_pyfde_inspect"]) {
      if (ns.has(k)) ns.delete(k);
    }
  }
}

function errorInfo(err, filename) {
  const message = String((err && err.message) || err);
  let line = null;
  const re = new RegExp('File "' + filename + '", line (\\d+)', "g");
  let m;
  while ((m = re.exec(message)) !== null) line = Number(m[1]);
  return { message, line, interrupted: message.includes("KeyboardInterrupt") };
}

async function run(m) {
  currentRunId = m.id;
  stdoutParts = [];
  const out = {
    type: "result", id: m.id, results: [], stdout: "",
    error: null, phase: null, errorLine: null, interrupted: false,
  };
  let ns = null;
  try {
    ns = pyodide.runPython("{}");
    await pyodide.runPythonAsync(m.prelude, { globals: ns });
    try {
      await execTagged(m.code, "<code>", ns);
    } catch (err) {
      const info = errorInfo(err, "<code>");
      out.phase = "code";
      out.error = info.message;
      out.errorLine = info.line;
      out.interrupted = info.interrupted;
      return;
    }
    if (m.tests) {
      try {
        await execTagged(m.tests, "<tests>", ns);
      } catch (err) {
        const info = errorInfo(err, "<code>"); // map only frames in user code
        out.phase = "tests";
        out.error = info.message;
        out.errorLine = info.line;
        out.interrupted = info.interrupted;
      }
    }
    const raw = ns.get("_RESULTS");
    if (raw) {
      out.results = raw.toJs({ dict_converter: Object.fromEntries });
      raw.destroy();
    }
  } catch (err) {
    // PRELUDE or namespace plumbing failed — not user code.
    const info = errorInfo(err, "<code>");
    out.phase = out.phase || "code";
    out.error = out.error || info.message;
    out.interrupted = out.interrupted || info.interrupted;
  } finally {
    out.stdout = stdoutParts.join("");
    if (ns) ns.destroy();
    currentRunId = null;
    self.postMessage(out);
  }
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === "boot") boot(m.indexURL);
  else if (m.type === "interruptBuffer") pyodide.setInterruptBuffer(new Uint8Array(m.buffer));
  else if (m.type === "run") run(m);
};
