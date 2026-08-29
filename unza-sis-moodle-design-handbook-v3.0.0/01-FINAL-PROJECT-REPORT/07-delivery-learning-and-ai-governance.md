# Delivery, Learning and AI Governance

Development uses a protected `main` branch, short-lived issue branches, pull requests and peer review. Charles and Chitindu alternate feature leadership; the second developer adds negative/failure tests, checks traceability and explains the change during review. Both developers work across UI, backend, database, tests and documentation.

GitHub Actions will run formatting, type/static checks, unit/API tests, authorization checks, accessibility checks, contract tests, dependency/security review and builds. Staging/demo deployment follows a passing main branch; higher-risk release requires human approval and a rollback reference.

AI is an assistant, not the project memory or decision authority. Every AI task loads the project rules, a small task packet and linked design files. Agents may explain, plan, implement and test within scope, but may not invent roles, policy values, screens, status values or privileges. Every output is reviewed by a human who can explain it at institutional, architecture and code levels.
