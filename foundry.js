// foundry.js - the model connection (LLM Foundry, OpenAI-compatible). Used by server.js and record.js.
// Token: .foundry-token / .foundry-token.txt in this folder, or ../AIA-Gov/.foundry-token.txt (git-ignored).
const fs = require("fs"), path = require("path");
const BASE = process.env.FOUNDRY_BASE || "https://llmfoundry.straive.com", MODEL = process.env.MODEL || "gpt-4.1-mini";
function token() {
  const f = [".foundry-token", ".foundry-token.txt", "../AIA-Gov/.foundry-token.txt", "../AIA-Gov/.foundry-token"].map(x => path.join(__dirname, x)).find(x => fs.existsSync(x));
  if (!f) throw new Error("Missing .foundry-token next to server.js (or in ../AIA-Gov)");
  return fs.readFileSync(f, "utf8").trim();
}
// when the token expires (from inside the JWT), or null if it can't tell
function expiry(t) { try { const p = JSON.parse(Buffer.from(t.split(":")[0].split(".")[1], "base64url").toString()); return p.exp ? new Date(p.exp * 1000) : null; } catch (e) { return null; } }
const EXPIRED = "Your LLM Foundry token has expired. Get a new one from LLM Foundry, paste it into ..\\AIA-Gov\\.foundry-token.txt, then press Find violations again (no restart needed).";
const redact = s => s.replace(/(Bearer\s+)?eyJ[\w-]+\.[\w-]+(\.[\w-]*)?(:[\w-]+)?/g, "[token hidden]");
function makeChat(log = () => {}) {
  token(); const stats = { calls: 0, cost: 0 }; // re-read every call, so a new token works without a restart
  async function chat(messages, opts) {
    const model = opts.model || MODEL;
    const body = { model, messages, temperature: opts.temperature == null ? 0.2 : opts.temperature };
    if (opts.tools) { body.tools = opts.tools; body.parallel_tool_calls = false; }
    if (opts.tool_choice) body.tool_choice = opts.tool_choice;
    const TOKEN = token(), exp = expiry(TOKEN);
    if (exp && exp < new Date()) throw new Error(EXPIRED);
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(BASE + "/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN + ":policy-leaks" }, body: JSON.stringify(body) });
        if ((r.status === 400 || r.status === 404) && model !== MODEL) { log("  model " + model + " unavailable, using " + MODEL); return chat(messages, Object.assign({}, opts, { model: MODEL })); }
        if (r.status === 401) throw Object.assign(new Error(EXPIRED.replace("has expired", "was refused (expired or wrong)")), { fatal: true });
        if (!r.ok) throw new Error("HTTP " + r.status + " " + redact((await r.text()).slice(0, 160)));
        const out = await r.json(), u = out.usage || {};
        stats.calls++; const big = !/mini|nano/.test(model); stats.cost += ((u.prompt_tokens || 0) * (big ? 2 : 0.4) + (u.completion_tokens || 0) * (big ? 8 : 1.6)) / 1e6;
        return out.choices[0].message;
      } catch (e) { if (e.fatal) throw e; log("  LLM retry " + (i + 1) + "/4: " + redact(e.message)); await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
    }
    throw new Error("LLM unreachable");
  }
  return { chat, stats, MODEL };
}
function tokenStatus() { try { const e = expiry(token()); return e ? (e < new Date() ? "EXPIRED at " + e.toLocaleString() : "valid until " + e.toLocaleString()) : "found"; } catch (e) { return e.message; } }
module.exports = { makeChat, MODEL, tokenStatus };
