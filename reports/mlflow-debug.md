# MLflow trace diagnosis — 2026-10-10

## Findings

The app's authenticated MLflow metadata calls succeed. Full span upload fails on the separate regional artifact host `us-east-2.storage.cloud.databricks.com`, with TCP connection refused. This is not a model quota error or an experiment CAN_EDIT denial.

MLflow 3.17.0 is already installed. Its artifact exporter uses signed storage URLs for this destination. The supported Unity Catalog trace exporter uses a different ingestion backend.

The original experiment `948045133158207` could not be converted: Databricks returned `BAD_REQUEST: Experiment ... already contains traces. A UC Trace Destination can only be linked to an Experiment that does not already contain any traces.` It remains intact.

Created replacement `/Shared/agentbricks_traces/magneto-director-uc`, ID `948045133158359`, bound to `workspace.magneto` with auto-prefix `948045133158359`. Creation succeeded in this workspace. Existing warehouse `a5e11b7fe2c6dbbc` was started for setup/readback (its existing 10-minute auto-stop remains).

MLflow's SQL helper initially picked up a different default auth profile even though the tracking URI named magneto. Setting `DATABRICKS_CONFIG_PROFILE=magneto` fixes the local SQL client selection. Shared tracing initialization now sets that local profile and validates the expected UC destination.

## Verified storage test

One synthetic diagnostic trace was exported and read back with complete inputs and outputs using the developer identity:

- Trace: `trace:/workspace.magneto.948045133158359/3160ef1e1e447235819c7e2479605c69`
- Span count: 1
- Inputs: synthetic=true, purpose=verify UC trace storage
- Outputs: diagnostic=storage transport only; no model or learner activity
- Readback completed within 60 seconds.

[Open verified diagnostic trace](https://dbc-129a8d44-1940.cloud.databricks.com/ml/experiments/948045133158359/traces/3160ef1e1e447235819c7e2479605c69)

## Applied repair and live verification

The user explicitly approved the new permissions after automatic review initially
blocked them. Applied to existing app service principal
`18d10b66-be29-40dc-aae3-9365189f5f4a`:

- CAN_EDIT on replacement experiment `948045133158359`.
- SELECT + MODIFY on `workspace.magneto.948045133158359_otel_spans`, `..._otel_logs`, `..._otel_metrics`, `..._otel_annotations`.

Deployment `01f1c5171770136a90738342a9173039` succeeded.
Live request `5a54f64d-f516-4edb-a7b3-ddd622fdab28` returned teach P at plum after an incorrect P response.
Readback verified all three spans, including exact root inputs/outputs and matching
model, request ID, and elapsed time. First search immediately after invocation returned
no result; delayed readback found the same request. UC numeric attributes deserialize
as strings, so the verifier compares elapsed time numerically.

[Open verified agent trace](https://dbc-129a8d44-1940.cloud.databricks.com/ml/experiments/948045133158359/traces/a1ae3997d1332a2daecb0e4517a3f432)

Evidence: `mlflow-agent-trace.json`. Repeatable command:
`databricks/magneto-director/.venv/bin/python scripts/verify_tracing.py`.
Use `--readback-only` to inspect the saved invocation without another model call.

15 platform tests and 37 reasoning tests passed; `npm run check` passed. No browser
UI or educational decision policy changed in this repair. No network protections,
reference volume write permissions, or learner data were changed. No imported books
were uploaded. The original failed traces remain in the old experiment; they were
not backfilled or represented as recovered.
