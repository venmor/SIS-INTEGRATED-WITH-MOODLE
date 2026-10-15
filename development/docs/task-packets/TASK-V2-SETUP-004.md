# Academic offering governance — next dependency

Status: specified, not implemented. Lead Charles Hangoma; reviewer Chitindu Milimbo. Approved v2 operating specification and owner-authorised synthetic rules provide demonstration scope; no institutional approval is inferred.

The current Programme.school is text, curriculum programme links lack a Programme relation, and assessment offeringRef is an independent coordinate. Delivery unit is not programme ownership or assessment authority. Coordinator scope Computing cannot be matched to a DEMO-* unit by label or course prefix.

The next Academic Delivery owner workflow creates an immutable typed offering manifest with explicit programme, course owner, delivery unit, assessment governing unit, period, source setup activation, effective dates and exact assessment offering reference. A reviewed explicit school appointment reference association is necessary when retaining legacy appointments. Separate new synthetic academic-delivery propose/publish capabilities are required; institution-setup and approve-assessment capabilities do not silently gain these rights. Independent person publication, version/digest/base checks, audit/outbox lineage, idempotency and source-change recovery follow the governed setup precedent.

Exact sources: DS1 domain architecture/ownership; DS4 curriculum/programmes/academic delivery; Role5 Part1 (028) sections2/5.2/12; Role5 Part2 (029) sections3.3/6/9; SETUP-003 and synthetic setup policy. Read the complete task-linked records before implementation.

Closure requires configured manifest → independent publication → coordinator same-school access/decision allow → foreign/absent/expired/unpublished binding denial on both lists and known IDs. Cover stale/revoked appointment, same-person aliases, invalid sources, stale source activation, exact retry and concurrent publication. Preserve assessment and registration history. Technical Moodle field projection remains separately tracked in GAP-V2-003.
