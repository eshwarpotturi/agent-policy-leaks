// server.js - the POC, live.   node server.js   then open http://localhost:8770
// Serves the page and runs the real agents on LLM Foundry when you press Find leaks / Fix the policy / Attack it.
// Every event streams to the page as it happens. You approve or reject policy changes in the page.
const http = require("http"), fs = require("fs"), path = require("path");
const { createRun } = require("./run.js"), { makeChat, tokenStatus } = require("./foundry.js"), E = require("./engine.js");
const PORT = +process.env.PORT || 8770, DIR = __dirname;
const log = m => console.log("[" + new Date().toLocaleTimeString("en-GB") + "] " + m);
const clients = new Set(); let S, LLM, busy = null, lastError = null, T0 = Date.now();
const send = (res, ev) => res.write("data: " + JSON.stringify(ev) + "\n\n");
function fresh() {
  LLM = makeChat(log); T0 = Date.now();
  S = createRun({ chat: LLM.chat, model: LLM.MODEL, log, approve: null, onEvent: ev => { for (const c of clients) send(c, ev); } });
  S.setup();
}
fresh();
async function job(name, f) {
  if (busy) return [409, { error: "Busy: " + busy }];
  busy = name; lastError = null; broadcast({ kind: "busy", job: name });
  f().then(() => log(name + " done")).catch(e => { lastError = e.message; log(name + " failed: " + e.message); broadcast({ kind: "error", job: name, text: e.message }); })
    .finally(() => { busy = null; broadcast({ kind: "idle", job: name, calls: LLM.stats.calls, cost_inr: +(LLM.stats.cost * 100).toFixed(2) }); });
  return [202, { started: name }];
}
function broadcast(ev) { for (const c of clients) send(c, ev); }
function body(req) { return new Promise(r => { let b = ""; req.on("data", c => b += c); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch (e) { r({}); } }); }); }
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".css": "text/css" };

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost"), J = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (u.pathname === "/api/state") return J(200, { live: true, busy, error: lastError, policy: S.policy, pending: !!S.pending, model: LLM.MODEL, calls: LLM.stats.calls, cost_inr: +(LLM.stats.cost * 100).toFixed(2) });
  if (u.pathname === "/api/events") { res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }); S.EV.forEach(ev => send(res, ev)); clients.add(res); req.on("close", () => clients.delete(res)); return; }
  if (req.method === "POST") {
    const b = await body(req);
    if (u.pathname === "/api/find") { const [c, o] = await job("Find leaks", () => S.findLeaks(b.policy || null)); return J(c, o); }
    if (u.pathname === "/api/fix") { const [c, o] = await job("Fix the policy", () => S.proposeFix(b.feedback || null)); return J(c, o); }
    if (u.pathname === "/api/attack") { const [c, o] = await job("Attack it", () => S.attackPolicy()); return J(c, o); }
    if (u.pathname === "/api/decide") { if (busy) return J(409, { error: "Busy" }); try { const r = S.decide({ decision: b.decision === "approve" ? "approve" : "reject", by: (String(b.by || "").slice(0, 40) || "Reviewer") + " (human)", reason: String(b.reason || "").slice(0, 300) }); return J(200, r); } catch (e) { return J(400, { error: e.message }); } }
    if (u.pathname === "/api/reset") { if (busy) return J(409, { error: "Busy" }); fresh(); broadcast({ kind: "reset" }); S.EV.forEach(ev => broadcast(ev)); return J(200, { ok: true }); }
    if (u.pathname === "/api/save") { // keep this session as the recording the page replays when no server is running
      const data = { model: LLM.MODEL, recorded_at: new Date().toISOString(), sample: false, duration_s: Math.round((Date.now() - T0) / 1000), calls: LLM.stats.calls, cost_usd: +LLM.stats.cost.toFixed(4), cost_inr: +(LLM.stats.cost * 100).toFixed(2), events: S.EV, summary: S.summary() };
      fs.writeFileSync(path.join(DIR, "data.js"), "window.RUN = " + JSON.stringify(data) + ";\n"); log("saved data.js"); return J(200, { saved: "data.js" });
    }
    return J(404, { error: "unknown" });
  }
  let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^([\/\\])+/, ""); if (!p) p = "index.html";
  const f = path.join(DIR, p); if (!f.startsWith(DIR) || /foundry-token/.test(f) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
}).listen(PORT, "127.0.0.1", () => { log("Policy leak finder, live: http://localhost:" + PORT); log("LLM Foundry token: " + tokenStatus()); });
