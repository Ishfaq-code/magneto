# Research pipeline scope

- Read README.md and docs/decisions.md first.
- This package owns research preparation, not live teaching or hardware execution.
- Do not edit the director or its generated deployment copies for research-only tasks.
- Reference existing platform resources; do not independently provision shared namespaces or grants.
- Shared guidance and retrieval contracts are defined in ../contracts/README.md. Internal extraction targets and analytical methods remain open; do not invent them while scaffolding.
- No automatic source ingestion, learner-data uploads, schedules or model calls in smoke checks.
- Unimplemented stages must never report successful processing. Document them until their contracts exist.
- Keep credentials and real learner data out of configuration and test fixtures.
- Research MLflow configuration must not silently reuse or alter the director's experiment.
- Run the package tests and bundle validation when changing deployment configuration. Distinguish local checks from a deployed job run.
- Update verified status and decisions when responsibilities or implementation change.

## Shared component contracts

- Read [../contracts/README.md](../contracts/README.md) before changing a cross-component interface. It is the authoritative v1 baseline; schemas/examples live beside it.
- Preserve the deployed demo wire format. Research/retrieval contracts are specified but not yet connected. Do not treat planned interfaces as implemented services.
- Run `npm run check:contracts` from the repository root for contract changes. Update producer, consumer, examples and migration notes together for a new version.
