# Magneto agent development

Read AGENTKIT_CONTRACT.md before editing runtime integration. This is a stateless, single-node
LangGraph decision service, using full request snapshots and Agent Bricks custom-server deployment.
Run `uv run pytest` and validate real fixtures with `scripts/reasoning_cli.py` at the repo root.
Never override model decisions with outcome-specific rules or claim simulated hardware is connected.

## Shared component contracts

- Read [../contracts/README.md](../contracts/README.md) before changing a cross-component interface. It is the authoritative v1 baseline; schemas/examples live beside it.
- Preserve the deployed demo wire format. Research/retrieval contracts are specified but not yet connected. Do not treat planned interfaces as implemented services.
- Run `npm run check:contracts` from the repository root for contract changes. Update producer, consumer, examples and migration notes together for a new version.
