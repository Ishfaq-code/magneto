# Decision register

| Decision | Status | Consequence |
| --- | --- | --- |
| Separate research package and deployment | Confirmed | Do not alter the live director for research-only changes |
| Reuse existing catalog/schema/reference volume | Confirmed | Research bundle does not provision shared containers |
| Separate document extraction and dataset analysis | Confirmed | Do not force all inputs through document processing |
| Smoke checks are read-only metadata checks | Implemented | No ingestion, inference, trace writes or index queries |
| Manual research job definition | Implemented, not cloud-executed | No schedule; deploy/run verification remains separate |
| Source selection and update policy | Undefined | No automatic internet ingestion |
| Data schemas and extraction targets | Undefined | No tables or extraction implementations |
| Analytical questions and methods | Undefined | No dataset analysis logic |
| Research experiment and evaluation contract | Undefined | Optional reference only; no director experiment reuse |
| AI Search publication/retrieval contract | Undefined | Optional reference only; no index provisioning |
| Research-to-director context contract | Undefined | No live-agent integration |

Update this register when a decision is supplied or behavior is verified. A configuration example, successful local test or SDK metadata response does not establish successful cloud processing.
