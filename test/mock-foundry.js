// node test/mock-foundry.js  - an OpenAI-compatible stand-in on :8899 backed by the scripted fake model.
// Lets you test live mode without LLM Foundry:  set FOUNDRY_BASE=http://localhost:8899 and a dummy .foundry-token
const { chat } = require("./fake.js");
require("http").createServer((q, r) => { let b = ""; q.on("data", c => b += c); q.on("end", async () => {
  const j = JSON.parse(b); await new Promise(x => setTimeout(x, 40));
  const m = await chat(j.messages, { tools: j.tools, tool_choice: j.tool_choice, temperature: j.temperature });
  r.setHeader("content-type", "application/json"); r.end(JSON.stringify({ choices: [{ message: Object.assign({ role: "assistant" }, m) }], usage: { prompt_tokens: 500, completion_tokens: 40 } }));
}); }).listen(+process.env.MOCK_PORT || 8899, () => console.log("mock foundry on " + (process.env.MOCK_PORT || 8899)));
