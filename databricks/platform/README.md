# Magneto platform wiring

Schema-independent service setup, kept separate from the agent implementation in
`../magneto-director`. This module does not edit or deploy that application.

## Resources

`services.toml` is the source of non-secret service addresses:

| Resource | Role |
| --- | --- |
| Existing `workspace` catalog | Reused governance container |
| `workspace.magneto` schema | Namespace for research and learning data plus MLflow trace tables |
| `workspace.magneto.references` managed volume | Explicit source-file uploads; no automatic research/book ingestion |
| Existing `databricks-qwen3-next-80b-a3b-instruct` endpoint | Model access; no new serving compute |
| `/Shared/agentbricks_traces/magneto-director-uc` MLflow experiment | Shared with the native agent |
| `agent-bricks-magneto-director` app | Owned by the agent implementation; looked up when available |

Dedicated Lakebase learner tables, vector search, and ingestion jobs are deferred.
The existing Serverless Starter Warehouse is used for MLflow trace setup/readback. Any Agent Bricks runtime storage remains owned by the agent deployment.
This is infrastructure wiring, not a learning-data schema or a replacement for the
agent's decision contract.

## CLI

From the repository root, with the existing project-local SDK environment:

```bash
PYTHONPATH=databricks/platform .venv-agent/bin/python -m magneto_platform status
PYTHONPATH=databricks/platform .venv-agent/bin/python -m magneto_platform provision
PYTHONPATH=databricks/platform .venv-agent/bin/python -m magneto_platform wire-app
```

`status` is read-only and does not perform model inference. `provision` creates missing
containers only and can be repeated. It tolerates another setup process creating a
resource concurrently. Permission errors stop provisioning rather than being mistaken
for missing resources. Existing contents, ownership and ACLs are not replaced.

`wire-app` requires the native app to exist. It adds USE CATALOG, USE SCHEMA,
READ VOLUME and experiment CAN EDIT to its service principal. When a trace table prefix
is configured it also adds SELECT and MODIFY on the four associated OTEL tables. For custom serving
endpoints with an ACL ID it also adds CAN QUERY. System pay-per-token endpoints
(including the configured Qwen endpoint) have no endpoint ACL ID: their existing
workspace/model-governance policy is retained and reported explicitly. This command
does not change account-wide foundation-model policy or claim a successful model call.
Reference write access is intentionally kept with the developer performing uploads.
It never changes the app's source, configuration, resources or deployment.

For another environment, install this package with `pip install ./databricks/platform`
and pass `--config /absolute/path/to/services.toml`. Authentication uses profile `magneto`
locally and injected app credentials when `DATABRICKS_APP_NAME` is set. No tokens are
stored in configuration or returned by the CLI. The authenticated workspace must match
the configured workspace.

## Python wiring layer

```python
from magneto_platform import ServiceConfig, Services

services = Services(ServiceConfig.load('databricks/platform/services.toml'))
print(services.status())

# Application owns messages, response format and response validation.
raw_model_response = services.complete(messages, response_format=response_format)

# Application owns the opaque input payload. Keep the same request ID on a retry.
raw_invocation = services.invoke_agent(
    payload, session_id=session_id, request_id=request_id
)

# Explicit uploads only; files cannot escape the volume or overwrite existing files.
services.upload_reference('source-note.txt', b'Teacher-approved reference notes')
references = services.list_references()
```

`complete` and `invoke_agent` return the upstream JSON unchanged, with no automatic
retries or educational decisions. HTTP redirects are not followed. Timeout exceptions
propagate to the caller; the application owns its total deadline, cancellation, fallback
and stale-response handling. Do not expose these authenticated adapters directly to
untrusted browser inputs; use the application's bounded local backend.

`configure_tracing()` is an explicit opt-in for consumers outside Agent Bricks. The
native agent calls this shared setup before enabling LangGraph autologging. It verifies
the configured UC destination rather than silently falling back to artifact storage. Importing the module does not change global MLflow configuration.

The local bridge and deployed agent use these adapters for actual invocations and model calls. `status` reports
resource reachability; it does not establish full learner-to-hardware operation.

## Verification

```bash
PYTHONPATH=databricks/platform .venv-agent/bin/python -m unittest discover -s databricks/platform/tests -v
```

Tests cover resource reuse, creation races, permission failures, workspace isolation,
path traversal, non-overwriting uploads, invocation IDs, one-call model transport,
credential-safe errors and additive app grants. Live `status` verifies the configured
resources separately. No live model call or research-file upload is required for setup.

## Trace-storage repair

The original experiment `948045133158207` is preserved. Its artifact upload host was
unreachable from the App. Databricks refused to bind UC storage because it already
contained traces. Replacement experiment `948045133158359` was created with its
automatic table prefix in `workspace.magneto`. The user approved the new app table grants; they were applied and the app was
redeployed. Full live-agent trace readback succeeded with three spans. See
`../../reports/mlflow-debug.md` for the diagnosis and verified trace link.
