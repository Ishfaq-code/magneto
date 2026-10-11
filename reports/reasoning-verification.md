# Magneto connected reasoning verification

Verified 2026-10-10 with profile `magneto` and the existing native App `agent-bricks-magneto-director`.

## Shared platform connection

- Local `POST /api/decision` → isolated `scripts/platform_invoke.py` → source `databricks/platform/magneto_platform.Services.invoke_agent` → authenticated deployed `/api/invocations`.
- Deployed `agent.decision.model_completion` → packaged copy of the same `Services.complete` → configured Qwen endpoint.
- Shared `databricks/platform/services.toml` selects workspace, app, model, experiment, and reference volume. Deployment copy generated with `scripts/prepare_agent.py`.
- Existing `workspace.magneto.references` reused, left empty. Reference upload is explicit and not invoked by the story demo.
- Existing app identity and experiment reused; no second learner database or runtime store.

## Live results

The updated deployment succeeded (`01f1c5155e74107c844629010fd45cad`). Five synthetic fixtures were exercised six times each. All 30 warm requests succeeded with no behavior mismatches.

- Median complete local-adapter round trip: 3396 ms.
- p95 (nearest rank): 4094 ms.
- First measured request: 5099 ms, reported separately. This is not a controlled cold-start measurement.
- Includes local Python adapter startup, authenticated app lookup/invocation, and model time; excludes browser rendering.
- Other browser smoke requests ran during the measurement, so this is a hackathon usability sample, not an isolated capacity test.

Full measurements: `reasoning-benchmark.json`.

Browser verified at `http://127.0.0.1:8090/learn/#stories`:
- Familiar A → continue.
- Pear → teach P.
- Teacher Incorrect saved before plum → live teach P (4387 ms browser round trip).
- Restart, pear Correct → live continue at plum (3730 ms browser round trip).
- Navigation during a pending request discarded the late result; reopening showed explicit cancellation with Retry and Continue without activity.
- Original teacher passage summaries remain unchanged; simulated Braille and synthetic/test context labels are visible.

Screenshots: `live-plum-teach.png`, `live-plum-continue.png`.

## Automated checks

- 8 browser session unit tests: correct/incorrect/help event persistence, one pending call, cancellation, restart, timeout/skip, malformed output/retry, denied storage writes.
- 4 local bridge tests: authenticated helper boundaries, deadline, invalid response rejection, same-origin/JSON/HTTP errors.
- 25 agent/runtime tests: fixtures, output validation, no hidden policy override/retry, session/request IDs, shared model adapter, invocation shape, error privacy, timeout.
- 13 shared-platform tests passed.
- `npm run check` passed (static/CAD checks are not proof of mechanical reliability).

## Trace limitation at initial verification (resolved afterward)

The deployed app creates MLflow trace metadata, but complete trace data upload to `us-east-2.storage.cloud.databricks.com` fails with connection refused. Thus the full-MLflow-trace acceptance checkpoint remains incomplete. Existing trace-write permission alone does not solve this network/storage path. The browser developer panel and this report have the returned decision/model/timing, but are not a substitute for verified full MLflow traces.

The managed Runtime Store also failed the workspace-tier requirement for scale-to-zero. The working App uses Agent Bricks' supported custom-server deployment, not durable invocation storage. There is no automatic restart recovery/idempotency. Each request has a complete snapshot, so an explicit new request can retry safely in this simulated milestone.

No imported books uploaded. No physical device, camera, or ElevenLabs connection has been added to the decision loop.

Update: full live-agent tracing was repaired and verified using the replacement UC experiment. See `mlflow-debug.md` and `mlflow-agent-trace.json`. The stateless-runtime limitations above remain.
