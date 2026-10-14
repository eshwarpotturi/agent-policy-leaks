// Record a real run on LLM Foundry from your PC:   node record.js
//   You approve each policy in this terminal (that approval is recorded as yours).
//   node record.js --auto   approves automatically (labelled "auto-approved (test run)" on the page)
// Token: .foundry-token or .foundry-token.txt in this folder (git-ignored), or ../AIA-Gov/.foundry-token.txt
// Writes data.js (the replay) and run-log.txt.
const fs = require("fs"), path = require("path"), readline = require("readline");
const { createRun } = require("./run.js");
const { makeChat } = require("./foundry.js");
const AUTO = process.argv.includes("--auto"), NAME = (process.argv.find(a => a.startsWith("--name=")) || "").slice(7) || "Presenter";
const LOG = [], log = m => { const l = "[" + new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" }) + "] " + m; LOG.push(l); console.log(l); };
const LLM = makeChat(log), chat = LLM.chat, MODEL = LLM.MODEL;
function ask(q) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise(res => rl.question(q, a => { rl.close(); res(a); })); }
async function approve(p, s) {
  console.log("\n================ POLICY v" + p.version + " for approval ================");
  p.rules.forEach(r => console.log("  - " + r));
  console.log("  settings: counts " + JSON.stringify(p.aggregates) + ", min group " + p.min_group + ", overlap guard " + p.overlap_guard + ", asking other agents: " + p.relay);
  console.log("  tested by code: stops " + s.leaks_blocked + "/" + s.leaks_total + " leaks; routine queries still working " + (s.legit_total - s.legit_blocked) + "/" + s.legit_total);
  if (s.legit_blocked_list.length) console.log("  routine queries it would block: " + s.legit_blocked_list.join("; "));
  console.log("  rationale: " + p.rationale);
  if (AUTO) return { decision: "approve", by: "auto-approved (test run)", reason: "" };
  const a = (await ask("Approve? [y = approve / anything else = reject with that reason] ")).trim();
  return /^y(es)?$/i.test(a) ? { decision: "approve", by: NAME + " (human)", reason: "" } : { decision: "reject", by: NAME + " (human)", reason: a || "rejected" };
}

const R = createRun({ chat, approve, log });
const t0 = Date.now();
R.run().then(sum => {
  const data = { model: MODEL, recorded_at: new Date().toISOString(), sample: false, duration_s: Math.round((Date.now() - t0) / 1000), calls: LLM.stats.calls, cost_usd: +LLM.stats.cost.toFixed(4), cost_inr: +(LLM.stats.cost * 100).toFixed(2), events: R.EV, summary: sum };
  fs.writeFileSync(path.join(__dirname, "data.js"), "window.RUN = " + JSON.stringify(data) + ";\n");
  fs.writeFileSync(path.join(__dirname, "run-log.txt"), LOG.join("\n") + "\n");
  console.log("\nDone in " + data.duration_s + " s, " + data.calls + " calls, about Rs " + data.cost_inr);
  console.log("Chapter 1: " + sum.ch1_leaks + " leaks (" + sum.ch1_routine_leaks + " from ordinary tasks), " + sum.people_exposed + " people exposed, " + sum.ch1_queries + " queries");
  console.log("Chapter 2: policy v" + sum.final_version + " after " + sum.drafts + " draft(s); red team " + sum.attack_attempts + " attempts, " + sum.attack_blocked + " blocked, leaks in the final round: " + sum.final_round_leaks);
  console.log("Routine queries still working under the final policy: " + sum.routine_still_working + "/" + sum.routine_total);
  console.log("\ndata.js written. Open index.html.");
}).catch(e => {
  console.error("\nRun failed: " + e.message);
  fs.writeFileSync(path.join(__dirname, "data.failed.js"), "window.RUN = " + JSON.stringify({ failed: e.message, events: R.EV }) + ";\n");
  fs.writeFileSync(path.join(__dirname, "run-log.txt"), LOG.join("\n") + "\nFAILED: " + e.message + "\n");
  process.exit(1);
});
