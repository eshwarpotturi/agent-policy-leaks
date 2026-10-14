// node test/sample.js - runs the whole pipeline with the SCRIPTED fake model (test/fake.js, no network) and writes data.sample.js.
// The page labels it "Sample run (scripted)". It is not evidence of anything an LLM did.
const fs = require("fs"), path = require("path");
const { createRun } = require("../run.js"), { chat } = require("./fake.js");
const R = createRun({ chat, approve: async (p, s) => ({ decision: "approve", by: "auto-approved (sample)", reason: "" }), log: m => console.log(m), concurrency: 1 });
R.run().then(sum => {
  const data = { model: "scripted sample (no LLM)", recorded_at: new Date().toISOString(), sample: true, calls: 0, cost_inr: 0, events: R.EV, summary: sum };
  fs.writeFileSync(path.join(__dirname, "..", "data.sample.js"), "window.RUN = " + JSON.stringify(data) + ";\n");
  const s = Object.assign({}, sum); delete s.final_policy; console.log(JSON.stringify(s, null, 1));
}).catch(e => { console.error(e); process.exit(1); });
