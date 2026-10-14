# Policy leak finder

A working POC: AI agents do a bank's everyday work under a permission policy you can edit. Plain code catches every violation: private data reaching an agent that must never see it, or a record changed for an agent that must never change it. A Policy agent then rewrites the policy, and red-team agents attack it.

**Run it (Windows, from this folder):**
```
..\AIA-Gov\tools\node-v22.11.0-win-x64\node.exe server.js
```
Then open **http://localhost:8770**. It uses your LLM Foundry token from `.foundry-token` here or `..\AIA-Gov\.foundry-token.txt`.

## ▶ Guided run (top right)
One button runs the whole story on this run's real events: the rules, a normal day, a pause on each kind of violation (a total over one person, subtracting two totals, asking another agent, getting a record changed), the end-of-day count, the Policy agent's drafts, **your approval**, the attack, and the same day again under the new rules. A narration bar says what just happened and highlights the relevant panel; press **Continue** at each pause. Every sentence is built from what the agents actually did, so if a kind of violation didn't happen in a run, the story doesn't claim it. **Exit guide** returns to free use.

## What you can do on the page
1. **Edit the policy.** The matrix shows what each agent (China agent, EU agent, Global Analyst) may do: read China clients, read EU clients, change client records (risk rating), counts & totals, asking another agent. Click a cell to change it. The safeguards (minimum group size, blocking near-duplicate totals) are below it. The policy is always shown in plain words too. Cells marked MUST NEVER REACH / NEVER CHANGES are the protection goal, whatever the policy says.
2. **▶ Find leaks.** The agents handle 32 everyday banker and board requests, plus one explorer agent probing on purpose. Each square in *Agent activity* is one question an agent asked. A matrix cell turns red when protected data reached an agent anyway, or a protected record was changed. Click a red cell or a red square to see the evidence: the banker's request, the exact question, the answer, and the person exposed.
3. **Fix the policy.** The Policy agent drafts a new policy. Code re-runs every question from the day against each draft and checks two things: does it stop every leak, and does everyday work still go through? It keeps drafting (up to 4 times) until both are true. You see before and after, and **you approve or reject**; a rejection with a reason goes back to the agent.
4. **Attack it.** Three red-team agents try to get one client's balance from different angles. The dots hit the wall.
5. **Run the day again** under the new policy to confirm the leaks are gone. **Save as recording** keeps the session as `data.js`.

Without the server (e.g. on GitHub Pages), the page replays the saved recording `data.js` step by step, or the scripted sample `data.sample.js` if there is no recording.

## What is real
- **Agents:** every agent is an LLM (gpt-4.1-mini on LLM Foundry) with tools, and it chooses its own questions. The 32 requests are scripted; what the agents do with them is not.
- **The Gate:** every allow or block is plain code (`engine.js`), never a model.
- **Leaks:** detected by plain code against the protection goal, independently of the policy. A figure covering 1 or 2 people the agent must not know counts as a leak, as do two totals that differ by 1 or 2 such people, an agent passing another region's client details on in its reply, and a record changed for an agent that may never change that region's records (directly or by asking another agent).
- **Approval:** a person approves every policy change.

## Files
- `index.html`: the tool
- `server.js`: live mode (serves the page, runs agents, streams every event)
- `engine.js`: data (30 fictional clients), policy language, Gate, leak detector, draft scorer
- `run.js`: agents, everyday requests, explorer, Policy agent, red team
- `foundry.js`: model connection
- `record.js`: records a full run from the terminal (alternative to Save as recording)
- `engine.test.js`: Gate and detector tests
- `test/`: scripted fake model, mock Foundry server for offline testing, sample generator

## Limits
Synthetic data: 30 clients, 3 agents, one table. The leak detector checks single answers and pairs of answers, not combinations of three or more. It demonstrates the method, not coverage of a real estate.
