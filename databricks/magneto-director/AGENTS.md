# Magneto agent development

Read AGENTKIT_CONTRACT.md before editing runtime integration. This is a stateless, single-node
LangGraph decision service, using full request snapshots and Agent Bricks custom-server deployment.
Run `uv run pytest` and validate real fixtures with `scripts/reasoning_cli.py` at the repo root.
Never override model decisions with outcome-specific rules or claim simulated hardware is connected.
