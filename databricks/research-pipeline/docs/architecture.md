# Responsibilities and integration boundaries

## Intended processing paths (not implemented)

```text
Source documents -> parsing -> evidence extraction --+
                                                    +-> knowledge publication -> AI Search
Source datasets  -> validation -> analysis ----------+                               |
                                                                                    v
                                                                         Agent Bricks director
```

Lakehouse storage contains source and derived assets. Unity Catalog governs their names and access. MLflow will record processing/evaluation where explicitly configured. The research pipeline produces knowledge; the director consumes it. Live learner state and device execution belong outside this package.

| Stage | Responsibility | Required decision before implementation |
| --- | --- | --- |
| Intake | Explicit source acquisition and provenance | Allowed sources, formats, ownership and update policy |
| Document processing | Parse and extract source-grounded information | Extraction fields, handling uncertainty, review requirements |
| Dataset analysis | Validate and analyze structured data | Dataset semantics, analytical questions and valid methods |
| Publication | Produce versioned knowledge suitable for consumption | Output schemas, acceptance criteria and versioning |
| Retrieval | Find relevant published knowledge | Chunking, embedding/index configuration, filtering and response contract |
| Evaluation | Assess extraction, analysis and retrieval quality | Fixtures, metrics and acceptance thresholds |

No universal document/dataset schema or educational strategy is implied by this diagram. Do not create empty successful tasks for these stages.

## Tool use

Current smoke code performs SDK metadata reads for configured resources. It never invokes the director, queries an index, processes a source or runs model inference. Research AI Functions and optional agent tools can be added after stage contracts are agreed. Beta capabilities are acceptable when their benefit, tested behavior and recovery path are documented.

## Ownership

- Platform retains shared resource provisioning and existing director wiring.
- Research owns its package, manual smoke job and deployment artifacts only.
- Director owns its runtime, decision contract and generated platform deployment copy.
- AI Search retrieval interface ownership is unresolved until the consumer contract is defined; do not duplicate retrieval logic between packages.

## Configuration

Research references existing assets independently of the director. Standard Databricks SDK authentication is reused; the platform's director-specific configuration is not copied. MLflow and search configuration is optional. Authentication failures are failures, not evidence that resources should be created.
