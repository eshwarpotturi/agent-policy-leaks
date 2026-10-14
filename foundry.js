// foundry.js - the model connection (LLM Foundry, OpenAI-compatible). Used by server.js and record.js.
// Token: .foundry-token / .foundry-token.txt in this folder, or ../AIA-Gov/.foundry-token.txt (git-ignored).
const fs = require("fs"), path = require("path");
const BASE = process.env.FOUNDRY_BASE || "https://llmfoundry.straive.com", MODEL = process.env.MODEL || "gpt-4.1-mini";
function token() {
  const f = [".foundry-token", ".foundry-token.txt", "../AIA-Gov/.foundry-token.txt", "../AIA-Gov/.foundry-token"].map(x => path.join(__dirname, x)).find(x => fs.existsSync(x));
  if (!f) throw new Error("Missing .foundry-token next to server.js (or in ../AIA-Gov)");
  return fs.readFileSync(f, "utf8").trim();
}
function makeChat(log = () => {}) {
  const TOKEN = token(), stats = { calls: 0, cost: 0 };
  async function chat(messages, opts) {
    const body = { model: MODEL, messages, temperature: opts.temperature == null ? 0.2 : opts.temperature };
    if (opts.tools) { body.tools = opts.tools; body.parallel_tool_calls = false; }
    if (opts.tool_choice) body.tool_choice = opts.tool_choice;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(BASE + "/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN + ":policy-leaks" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 160));
        const out = await r.json(), u = out.usage || {};
        stats.calls++; stats.cost += ((u.prompt_tokens || 0) * 0.4 + (u.completion_tokens || 0) * 1.6) / 1e6;
        return out.choices[0].message;
      } catch (e) { log("  LLM retry " + (i + 1) + "/4: " + e.message); await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
    }
    throw new Error("LLM unreachable");
  }
  return { chat, stats, MODEL };
}
module.exports = { makeChat, MODEL };
