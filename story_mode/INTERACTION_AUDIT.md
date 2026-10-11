# Interaction audio audit and look-ahead

## Tool-by-tool mapping

| Call | Accepted-state requirement | Audio wiring | Continuation behavior |
| --- | --- | --- | --- |
| `get_story_context` (MCP) | Existing session | None; read-only | None |
| `propose_activity` (MCP) | Approved current target, reading/proposed/continue phase, activity budget, current revision | No immediate audio. Look-ahead generates and caches prompt + hint from the validated proposal. | Educator reviews proposal. |
| `recommend_continue` (MCP) | Decision phase and current revision | No immediate audio; a prepared recommendation has one Continue story button. | One Continue story click resumes. |
| `prepare_braille` (MCP and educator adapter) | Approved activity, awaiting tactile material | None: visual preview does not establish physical readiness. | Single Start activity click confirms tactile readiness and runs the gated sequence. |
| `speak_prompt` (MCP and educator adapter) | Ready or waiting response | Educator adapter plays cached exercise `prompt`; browser speech fallback if unavailable. | Stay in exercise. |
| `give_hint` (MCP and educator adapter) | Waiting response | Educator adapter plays cached exercise `hint`, not a generic hint substitution. | Stay; controller marks subsequent outcome assisted. |
| `submit_response` (MCP) | Waiting response | None: unconfirmed transcript is not correctness. | Await educator confirmation. |
| `approve_activity` (educator only) | Proposed | None; deterministic Braille preparation follows. | Await tactile material. |
| `confirm_tactile` (educator only) | Awaiting tactile, prepared preview | The single Start activity sequence invokes Speak prompt automatically. | Prompt plays; wait for response. |
| `record_observation(independent)` (educator only) | Waiting/confirmation, no hint used | `success-independent`, only after accepted response. | Play feedback, then advance to the next story page automatically. |
| `record_observation(with_help)` (educator only) | Waiting/confirmation | `success-assisted`, only after acceptance. | Play feedback, then advance to the next story page automatically. |
| `record_observation(try_later)` (educator only) | Waiting/confirmation | `skip`, never `retry`. | Play feedback, then advance to the next story page automatically. |
| `resume_story` (educator only) | Current revision | `return-to-story` for continuation, or `skip` for an abandoned activity; close panel. | After feedback finishes, advance one page and autoplay that page narration. Interruption cancels auto-advance. |
| `set_context` (reader adapter) | Current revision | Stop interaction speech, clear exercise audio association. | Recompute current + next two spread window. |

Speech side effects are in the educator browser adapter. An arbitrary external MCP call updates
controller state but does not push speech to an already-open browser: a general event subscriber
is not implemented. No microphone scoring, physical device commands, mastery inference, or
lakehouse writes are introduced.

Unused pack clips: `retry` needs an explicit confirmed-incorrect-attempt event (not currently
supported); `offer-help` is redundant with the actual generated hint; `invite` is redundant with
the generated in-story prompt; `patient-wait` has no explicit encouragement control. None is
triggered by elapsed time or silence. Invalid/rejected actions play no feedback.

## Two-page look-ahead

The reader supplies the current spread plus the next two spreads (across chapter boundaries).
The first curated opportunity is selected, with the current page taking priority. At most one
pending exercise per session is retained. There is no arbitrary future story generation.

1. `POST /api/story/lookahead` accepts `{session_id, revision, target}` and returns
   `{preparation_id, target, status}` immediately. Only curated target passage IDs are accepted.
2. A background worker reads real session context over MCP, projects the curated opportunity
   without moving the live page, and asks for one validated propose/continue plan. Only four
   relevant teacher observations reach the model, as before.
3. A proposed exercise generates prompt and hint WAVs using the local ElevenLabs settings.
   Content/voice/settings hashes reuse existing audio. Continue decisions generate no speech.
   Missing credentials or synthesis failure leaves the text decision usable with browser speech.
4. `POST /api/story/lookahead-status` polls the session-bound handle. Browser polling is bounded
   to four minutes and stops on navigation outside the candidate window or disposal. An already
   running provider request may finish; it never plays audio by itself.
5. At the target page, **Start activity · tactile ready** (or **Continue story**) calls `POST /api/story/apply-lookahead` with
   `{session_id, revision, preparation_id}`. The server checks exact current revision, target,
   reading phase, observations, activity count, policy and interaction revision. Plain page
   movement may rebase the plan; any intervening activity/educator action invalidates it.
6. The validated plan executes once through the shared controller. Its `interaction_audio`
   maps prompt/hint to immutable local files. The Start button explicitly confirms tactile material is ready, then sequences approval, Braille preparation, tactile confirmation and prompt playback through their existing gates. Outcomes play feedback and resume automatically.

Reading never waits for this worker and there is no automatic interruption. Starting a prepared exercise needs one click; recording an outcome needs one click, with no separate resume step. If an educator asks
before preparation completes, the existing current-page preparation path remains available;
it may perform a fresh model call and use browser speech. Preparation can fail explicitly;
there is no invented fallback teaching decision.

The local additions do not change deployed Databricks v1 decision or v3 telemetry contracts.
Saved learner knowledge, scheduled repetition, MLflow linking and retrieval remain separate
integration work. The existing proposal reason is displayed directly in the educator panel.

## Validation

Unit coverage checks rebase on arrival, wrong target, stale revision, changed evidence,
intervening educator action, single-use handles, one in-flight job and late results. MCP tests
check future context projection without mutating the real page. Feedback mapping tests ensure
transcripts cannot trigger success and try-later cannot trigger incorrect feedback. Live browser
verification exercised cached prompt, hint and assisted-success playback on the gate opportunity.
