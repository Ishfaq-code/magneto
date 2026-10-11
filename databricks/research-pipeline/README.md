# Magneto research pipeline scaffold

This package prepares a home for research processing and dataset analysis. It currently implements configuration, read-only metadata checks and a manual job definition. It does not ingest sources, call models, create tables/indexes, or implement teaching logic.

Read [the base contracts](../contracts/README.md) for the agreed guidance and retrieval interfaces, `docs/architecture.md` for stage responsibilities, and `docs/decisions.md` for remaining decisions. Shared assets remain owned by `../platform`; live Agent Bricks code remains in `../magneto-director`.

## Local checks

From the repository root, using the existing SDK environment:

```bash
PYTHONPATH=databricks/research-pipeline/src .venv-agent/bin/python -m unittest discover -s databricks/research-pipeline/tests -v
PYTHONPATH=databricks/research-pipeline/src .venv-agent/bin/python -m magneto_research.smoke --config databricks/research-pipeline/config/development.example.toml --profile magneto
```

Alternatively install this package into a Python 3.11+ virtual environment. `magneto-research-smoke` is the installed entry point. Optional local overrides belong in ignored `config/local.toml`; never put credentials in either file. The example uses existing resource names, not new data schemas.

Results are `reachable`, `not_configured`, or `failed`. A missing optional configuration is expected; an explicitly configured resource that cannot be read is a failure. The process exits nonzero for failures. Metadata visibility does not prove volume file-read access, index query readiness, model access, trace-write permission, or a functioning processing pipeline. No MLflow global configuration is changed.

## Deployment definition

From this directory:

```bash
databricks bundle validate -t dev --profile magneto
```

The following are mutating operational commands, not prerequisites for local tests:

```bash
databricks bundle deploy -t dev --profile magneto
databricks bundle run -t dev --profile magneto research_smoke
```

Deployment builds the package wheel and uploads bundle files. Running starts serverless compute for one metadata-only task, using the job identity's credentials, without a local profile. Serverless availability and job-identity permissions must be verified in that environment. There is no schedule, automatic retry or processing task. The bundle does not own shared namespaces, permissions, the director, or its experiment.

Only a development target is defined. For another environment, explicitly align workspace configuration and resource references before adding a target. Research MLflow and AI Search references are optional and unset; setting a reference does not provision a resource.

## Verification boundary

Tests check configuration validation, workspace isolation, read-only adapter behavior and failure reporting. Bundle validation checks configuration; it does not prove remote execution. This scaffold has not been deployed or run as a cloud job as part of the repository cleanup.

Cleanup verification: 10 research tests, 15 existing platform tests and repository `npm run check` passed. Bundle validation was attempted but blocked by missing cached credentials for profile `magneto`. Wheel build verification was blocked by unavailable build dependencies and package-index DNS access. Re-run both in an authenticated environment with build dependencies available before deployment. No browser views were changed.
