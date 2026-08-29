# Shared Kernel and Module-Boundary Rules

The shared kernel contains only stable cross-domain concepts: identifiers, organization/scope, academic period, role assignment reference, policy version reference, money/currency, document classification/reference, audit/event envelopes, idempotency, approval/delegation references and institutional time utilities.

It must not contain Admissions, Finance, Results, Support or Moodle business rules. A “shared everything” package would couple modules and make AI-generated changes spread unpredictably.

## Cross-module rules

- A module owns its tables, invariants and commands.
- Another module requests behaviour through a published service/command or reads an approved view/query.
- No module imports another module’s internal repository implementation.
- Events contain a minimal safe payload and classification.
- A consumer tolerates duplicate delivery and declared schema versions.
- Cross-module workflows use correlation/causation IDs and observable status.
- A new dependency direction requires an ADR and architecture review.
