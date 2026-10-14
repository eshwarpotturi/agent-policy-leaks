# Policy leak finder

A working POC: AI agents do a bank's everyday work under a permission policy you can edit. An **AI Investigator** reviews every conversation and flags violations (private data reaching an agent that must never see it, or a record changed for an agent that must never change it); **code confirms** each finding against the real data before it counts. A Policy agent then rewrites the policy, and red-team agents attack it.

**Run it (Windows, from this folder):**
```
..\AIA-Gov\tools\node-v22.11.0-win-x64\node.exe server.js
```
Then open **http://localhost:8770**. It uses your LLM Foundry token from `.foundry-token` here or `..\AIA-Gov\.foundry-token.txt`.

## ▶ Guided run (top right)
One button runs the whole story on this run's real events: the rules, a normal day, a pause on each method of violation (too small a group, narrowing with filters, subtracting two totals, asking another agent, getting a record changed), the end-of-day count, the Policy agent's drafts, **your approval**, the attack, and the same day again under the new rules. A narration bar says what just happened and highlights the relevant panel; press **Continue** at each pause. Every sentence is built from what the agents actually did, so if a kind of violation didn't happen in a run, the story doesn't claim it. **Exit guide** returns to free use.

## What you can do on the page
0. **Meet the agents.** The setup card lists every agent: the three that do the bank's work, the AI Investigator, the Policy agent, three explorers and three red-team agents. Click any of them (or an agent in the diagram or the policy matrix) to see its goal, model, the exact system prompt it gets, its tools with parameters, its access under the current policy, its protection goal, and what it did this session.
1. **Edit the policy.** The matrix shows what each agent (China agent, EU agent, Global Analyst) may do: read China clients, read EU clients, change client records (risk rating), counts & totals, asking another agent. Click a cell to change it. The safeguards (minimum group size, blocking near-duplicate totals) are below it. The policy is always shown in plain words too. Cells marked MUST NEVER REACH / NEVER CHANGES are the protection goal, whatever the policy says.
2. **▶ Find violations.** The agents handle 32 everyday banker and board requests, plus three explorer agents probing on purpose from different angles (narrow filters, combining totals, asking another agent). Each square in *Agent activity* is one question an agent asked. A matrix cell turns red when protected data reached an agent anyway, or a protected record was changed; it shows how many clients and how many different methods. Click a red cell: a popup has one tab per violation, labelled by method, with the banker's request, the exact questions and answers, the person exposed, and **how it was flagged** (the Investigator's report and each code check, ✓ or ✗). The list beside the policy groups violations by method.
3. **Fix the policy.** The Policy agent drafts a new policy. Code re-runs every question from the day against each draft and checks two things: does it stop every leak, and does everyday work still go through? It keeps drafting (up to 4 times) until both are true. You see before and after, and **you approve or reject**; a rejection with a reason goes back to the agent.
4. **Attack it.** Three red-team agents try to get one client's balance from different angles. The dots hit the wall.
5. **Run the day again** under the new policy to confirm the leaks are gone. **Save as recording** keeps the session as `data.js`.

Without the server (e.g. on GitHub Pages), the page replays the saved recording `data.js` step by step, or the scripted sample `data.sample.js` if there is no recording.

## What is real
- **Agents:** every agent is an LLM (gpt-4.1-mini on LLM Foundry) with tools, and it chooses its own questions. The 32 requests are scripted; what the agents do with them is not.
- **The Gate:** every allow or block is plain code (`engine.js`), never a model.
- **The protection goal** (what must never happen) is written separately from the policy, so a policy can be checked against it.
- **Flagging:** after every conversation, the AI Investigator (an LLM) reads every question, answer and message and reports what an agent learned or changed that the goal forbids, with the arithmetic it used. **Code then confirms** each claim: the agent and clients are real, the data is protected for that agent, the arithmetic recomputed from answers that agent actually received gives the client's real balance (or the change really happened). Unconfirmed claims are rejected and shown as rejected, never counted.
- **Backstop:** simple code checks still run (a figure covering 1–2 protected people, two totals differing by 1–2 such people, details passed on by another agent, a protected record changed). If one fires and the Investigator missed it, the violation is shown as "caught by code check".
- **Approval:** a person approves every policy change.

## Files
- `index.html`: the tool
- `server.js`: live mode (serves the page, runs agents, streams every event)
- `engine.js`: data (30 fictional clients), policy language, Gate, finding confirmation, backstop checks, draft scorer
- `run.js`: agents, everyday requests, explorers, AI Investigator, Policy agent, red team
- `foundry.js`: model connection
- `record.js`: records a full run from the terminal (alternative to Save as recording)
- `engine.test.js`: Gate and detector tests
- `test/`: scripted fake model, mock Foundry server for offline testing, sample generator

## Limits
Synthetic data: 30 clients, 3 agents, one table. The Investigator reviews one conversation at a time, and the backstop checks look at single answers and pairs of answers. It demonstrates the method, not coverage of a real estate.
