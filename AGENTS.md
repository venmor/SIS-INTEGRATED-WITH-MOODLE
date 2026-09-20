# SIS–Moodle repository instructions

## Find the current work

Application code is in [development/](development/README.md). The sibling [handbook](unza-sis-moodle-design-handbook-v3.0.0/START-HERE.md) is the controlling design, not runnable code. Read [development/AGENTS.md](development/AGENTS.md), [DESIGN-INDEX.md](development/DESIGN-INDEX.md) and the task packet before editing code.

## Source authority

Follow the handbook supersession and readiness registers. The individual records in [15-APPROVED-DESIGN-EVIDENCE](unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/README.md) are active requirements. Read the task-linked exact role/cross-blueprint/security/UI records completely. Do not ignore them as historical archives, silently narrow them to a summary, or rewrite original approval text.

Later approved decisions and security/privacy/official-record rules take precedence over exact evidence, curated summaries and templates. Explicitly demo-only configuration is not institutional approval. Record missing authority/policy in a gap and preserve fail-closed behavior.

## Review and learning

Current review: [Phase 2 slices 2–5](development/docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md), [earlier-slice findings](development/docs/learning/PRIOR-PHASE-REVIEW.md), [verification](development/docs/learning/VERIFICATION.md). Verify Git branch/status and current evidence when resuming; do not infer completion from an old conversation.

Keep requested changes reviewable in the existing worktree. Do not commit, merge, push, reset shared databases, or invent human signoff without the user's authorization. Follow the locked stack and module boundaries. Explain user behavior, UI/API/data/audit flow, tests and remaining gaps so both Charles and Chitindu can present the work.
