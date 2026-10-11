# Story Mode MCP scaffold

A local, teacher-supervised orchestrator for Peter Rabbit. It discovers real MCP tools, reads the
current controller snapshot, builds a compact decision context, and invokes one validated teaching
action through MCP stdio. At the activity limit, a deterministic rule recommends continuing.
Other choices use the existing Databricks model. A failed model call leaves the session unchanged
so the teacher can retry or continue; it never silently substitutes a teaching decision.

```mermaid
sequenceDiagram
    participant Teacher as Glass teacher panel
    participant Controller as Local session controller
    participant Agent as Story orchestrator
    participant MCP as Story Mode MCP
    participant Model as Existing Databricks model
    Teacher->>Controller: Set curated passage / request decision
    Controller->>Agent: session_id + revision
    Agent->>MCP: initialize, tools/list, get_story_context
    MCP->>Controller: Read authoritative state
    Agent->>Model: Context + discovered allowed tool schemas
    Model-->>Agent: Selected tool + arguments + brief reason
    Agent->>MCP: propose_activity or recommend_continue
    MCP->>Controller: Validate target, phase, budget and revision
    Controller-->>Teacher: Reviewable proposal + tool trace
    Teacher->>Controller: Approve → prepare preview → confirm tactile material
    Teacher->>Controller: Speak prompt / hint → record observation → continue
```

## Run

From the repository root:

```sh
python3 -m venv .venv-story
.venv-story/bin/python -m pip install -r story_mode/requirements.lock
python3 scripts/serve.py --port 8091
```

The lock records the dependency versions used for local verification. SDK documentation:
https://py.sdk.modelcontextprotocol.io/v1/ (the 1.x maintenance line is intentionally pinned).
Open `/learn/#stories`, open the included Peter Rabbit, and select **Teacher coach**.
On the introduction to the four rabbits, gate passage, or vegetables passage, select **Ask orchestrator**.
The browser sends only a curated passage ID and anonymous teacher observations, not the EPUB or recordings.
The local adapter uses the existing `magneto` Databricks profile/config in
`databricks/platform/services.toml`. No credentials are returned to the browser. A failed model request
shows an error; it never silently creates a mock teaching decision.

## Contracts

- `controller.py`: authoritative anonymous in-memory sessions, atomic transitions, revision checks,
  approved targets, six-activity session budget, deterministic lowercase UEB/uncontracted cell preview.
- `mcp_server.py`: official SDK stdio transport, tools/list + tools/call; forwards to the same viewer controller.
- `selection.py`: current opportunity plus at most four relevant teacher observations; deterministic
  activity-limit rule, eligible tool list, and strict argument validation.
- `orchestrator.py`: one bounded selected call per teacher request, using discovered MCP schemas.
  Only `propose_activity` and `recommend_continue` are available to this decision step.
- `scripts/story_bridge.py`: same-origin teacher endpoints and private MCP bridge protected by a per-process
  random key. Orchestrator subprocesses inherit that key; it is never exposed to the browser.
- `web/learn/story-coach.js`: glass panel, explicit speech buttons, observation buttons, visible tool trace.
  It does not announce teacher notes or model reasons to the learner.

The controller enforces:

`reading → proposed → awaiting_tactile → ready → waiting_response → complete → reading`

An optional unconfirmed transcript adds `awaiting_confirmation` before the teacher observation.
Only teacher endpoints can approve, confirm tactile material, record observations, or resume.
The model cannot score transcripts. A hint prevents an independent-recognition observation.
Changing the passage invalidates the prior revision and discards the activity. A stale model response
cannot start a new activity. The panel can be dismissed without advancing the lesson.

### MCP tool catalog

| Tool | Effect |
|---|---|
| `get_story_context` | Read passage, relevant targets, prior observations, policy, phase and revision |
| `propose_activity` | Propose introduce / identify / match for a letter or word; teacher review required |
| `recommend_continue` | Suggest continuing without interrupting the story |
| `prepare_braille` | Produce deterministic visual cells after approval; physical ready remains false |
| `speak_prompt` | Queue approved learner speech only after teacher confirms tactile material |
| `give_hint` | Queue approved support and mark assistance used |
| `submit_response` | Record an unconfirmed transcript; no grading |

All mutating tools require `session_id` and the current `revision`. MCP outputs supply the next revision.
The stdio server needs `MAGNETO_STORY_URL` and `MAGNETO_STORY_KEY`, supplied automatically by the local
orchestrator. It is intentionally not registered globally with any desktop agent.

## Initial responsive selection boundary

The controller remains the single owner of state. The selector sees only session/revision, phase,
approved opportunity, policy, activity count, and the last four teacher observations for the current
targets. It does not receive transcripts, device previews, execution traces or unrelated observations.
An omitted-observation count makes the partial history explicit. This is recent session evidence,
not a student mastery summary. Full observations remain in the controller.

The selector can propose an activity or recommend continuing. At the six-activity limit only
`recommend_continue` is eligible and the model is skipped. Selection cannot run during an active
activity. The plan is checked before calling MCP; the controller atomically checks the revision again
when applying it. Late results, invalid arguments and model failures cannot advance the session.
Teacher approval, speech buttons and tactile confirmation keep their existing execution behavior.
A proposal acknowledgement is not physical action or speech completion.

Background learning is a separate workstream. Its prepared student summary and methods still need
an adapter into this Rabbit selector. Do not add live lakehouse queries or research searches to this
path. Durable restart recovery and device completion acknowledgements are also outside this initial
change. Existing deployed v1 and learning v2/v3 payloads are unchanged.

### Latency diagnostics

The local response's existing `orchestrator` diagnostics now include `timings_ms` and
`selection_payload_bytes` (UTF-8 bytes, not tokens; excludes the system prompt). Timings separate
MCP startup/discovery/read, selection including validation, MCP application, total orchestration
including cleanup, and bridge total including the orchestrator subprocess. The browser continues
to consume `state`; these optional diagnostics do not change MCP tool arguments or the teaching state.

A local synthetic measurement on 2026-10-11 found five activity-limit decisions took **495–690 ms**
at the bridge. One live-model decision took **4,088 ms**, including **3,346 ms** for selection and
**2.46 ms** for MCP application. Its selection payload was **1,660 bytes**. These are small-sample
observations on this machine, not production percentiles or a latency guarantee. Browser rendering,
speech and hardware completion are excluded. No learner records were uploaded in these measurements.

The current implementation starts the orchestrator and MCP processes for every decision; even the
rule path pays that startup cost. Keeping MCP alive would be a later measured optimization. The
existing 18-second model read timeout and 35-second subprocess limit remain failure ceilings, not
responsiveness targets. The model call is the largest measured delay; do not put it on every low-level
speech or device transition.

## Scope and limitations

This is an executable scaffold, not a validated curriculum. Targets are curated for three Peter Rabbit
moments; the browser matches known passage text, not vision/OCR or autonomous curriculum extraction.
Activities and observations last for the current book-opening session and server process. Reading
bookmarks and existing imported ebooks keep their existing browser-local persistence.

The Story Mode orchestrator is local and uses the existing model endpoint directly through the shared
platform adapter. The deployed Caterpillar LangGraph agent and its approved narrow contract are unchanged.
The orchestrator displays a concise evidence summary and tool trace, never private chain-of-thought.

No microphone capture, speech recognition, hardware actuation, automatic mastery scoring, or durable
learner records are implemented. Braille is a visual preview; the teacher must supply tactile material.
Browser text-to-speech runs only after an explicit teacher action. It is not recorded narration.

## Verification

```sh
npm run check
npm run check:story
```

The MCP tests start an ephemeral localhost viewer and use an injected deterministic model fixture to
exercise the actual SDK handshake, discovery and tool execution. They test stale navigation and forbidden
teacher actions without calling a model. A separate manual browser run verifies live-model integration.

The current checks cover 10 controller/selection tests and 7 real-stdio MCP tests, including
context minimization, rule bypass, stale navigation, invalid arguments and model failure.
Earlier live verification: A live browser run at the
Peter Rabbit vegetables spread returned an orchestrator-selected `propose_activity` for `l`;
teacher approval produced the deterministic dots 1, 2, 3 preview while physical readiness remained false.
No child response or physical tactile-material confirmation was fabricated in that browser run.
