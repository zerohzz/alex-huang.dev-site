// Main-thread client for the Python worker. Owns the worker lifecycle, boot
// timing, the single-flight run queue, and both interrupt paths:
//   - crossOriginIsolated: SharedArrayBuffer signal -> KeyboardInterrupt (instant)
//   - otherwise: worker.terminate() + fresh boot (slow path, still no reload)

const SIGINT = 2;

export class Runtime {
  constructor({ onStatus }) {
    this.onStatus = onStatus;      // (state, detail) => void
    this.worker = null;
    this.state = "down";           // down | booting | ready | running
    this.version = "";
    this.bootMs = null;            // worker spawn -> pyodide ready
    this.firstRunMs = null;        // ready -> probe round trip
    this.interruptBuffer = (typeof crossOriginIsolated !== "undefined" && crossOriginIsolated)
      ? new Uint8Array(new SharedArrayBuffer(1))
      : null;
    this.pending = null;           // {id, resolve, onOut}
    this.nextId = 1;
    this.readyPromise = null;
  }

  get canSignal() {
    return this.interruptBuffer !== null;
  }

  boot() {
    this.state = "booting";
    this.onStatus("booting");
    const t0 = performance.now();
    this.worker = new Worker("js/worker.js");
    const indexURL = new URL("vendor/pyodide/", document.baseURI).href;

    this.readyPromise = new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") {
          this.bootMs = performance.now() - t0;
          this.version = m.version;
          if (this.interruptBuffer) {
            this.worker.postMessage({ type: "interruptBuffer", buffer: this.interruptBuffer.buffer });
          }
          resolve();
        } else if (m.type === "bootError") {
          this.state = "down";
          this.onStatus("down", m.error);
          reject(new Error(m.error));
        } else if (m.type === "out") {
          if (this.pending && this.pending.onOut) this.pending.onOut(m.text);
        } else if (m.type === "result") {
          const p = this.pending;
          this.pending = null;
          this.state = "ready";
          this.onStatus("ready");
          if (p) p.resolve(m);
        }
      };
      this.worker.onerror = (e) => {
        this.state = "down";
        this.onStatus("down", String(e.message || e));
        reject(new Error(String(e.message || e)));
      };
    });

    this.worker.postMessage({ type: "boot", indexURL });

    return this.readyPromise.then(async () => {
      // Probe run: "boot" only counts once code actually round-trips.
      const t1 = performance.now();
      this.state = "ready";
      await this.run({ prelude: "pass", code: "pass", tests: null });
      this.firstRunMs = performance.now() - t1;
      this.onStatus("ready");
    });
  }

  totalBootMs() {
    if (this.bootMs === null) return null;
    return this.bootMs + (this.firstRunMs || 0);
  }

  run({ prelude, code, tests, onOut }) {
    if (this.state !== "ready") {
      return Promise.resolve({
        results: [], stdout: "", phase: "code", errorLine: null, interrupted: false,
        error: "运行时尚未就绪",
      });
    }
    if (this.interruptBuffer) this.interruptBuffer[0] = 0;
    this.state = "running";
    this.onStatus("running");
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending = { id, resolve, onOut };
      this.worker.postMessage({ type: "run", id, prelude, code, tests });
    });
  }

  // Returns "signal" (instant) or "reboot" (fallback). No-op when idle.
  interrupt() {
    if (this.state !== "running") return null;
    if (this.interruptBuffer) {
      this.interruptBuffer[0] = SIGINT;
      return "signal";
    }
    const p = this.pending;
    this.pending = null;
    this.worker.terminate();
    if (p) {
      p.resolve({
        results: [], stdout: "", phase: "code", errorLine: null,
        interrupted: true, rebooted: true,
        error: "KeyboardInterrupt: 已强制终止（运行时正在重启）",
      });
    }
    this.boot();
    return "reboot";
  }
}
