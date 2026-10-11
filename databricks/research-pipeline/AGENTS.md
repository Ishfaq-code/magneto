# Research pipeline scope

- Read README.md and docs/decisions.md first.
- This package owns research preparation, not live teaching or hardware execution.
- Do not edit the director or its generated deployment copies for research-only tasks.
- Reference existing platform resources; do not independently provision shared namespaces or grants.
- Data schemas, extraction targets, analytical methods and retrieval contracts are not defined. Do not invent them while scaffolding.
- No automatic source ingestion, learner-data uploads, schedules or model calls in smoke checks.
- Unimplemented stages must never report successful processing. Document them until their contracts exist.
- Keep credentials and real learner data out of configuration and test fixtures.
- Research MLflow configuration must not silently reuse or alter the director's experiment.
- Run the package tests and bundle validation when changing deployment configuration. Distinguish local checks from a deployed job run.
- Update verified status and decisions when responsibilities or implementation change.
