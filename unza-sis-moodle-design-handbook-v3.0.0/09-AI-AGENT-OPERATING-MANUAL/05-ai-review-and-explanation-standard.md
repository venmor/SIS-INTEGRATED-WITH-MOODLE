# AI Review and Explanation Standard

An AI-generated change is reviewable only when it explains:

1. **Institutional level:** which user problem and rule it serves.
2. **Journey level:** where the user starts, acts, receives feedback and recovers.
3. **Architecture level:** owning module, state transition, command/event and integrations.
4. **Data level:** records read/written, constraints, migration and versioning.
5. **Security level:** authentication, permission dimensions, sensitive data and audit.
6. **Code level:** main files/classes/functions and why the pattern was chosen.
7. **Test level:** what proves normal, denial, failure and recovery behaviour.

Charles or Chitindu should be able to restate each level in their own words. If neither can, the change remains unmerged while the agent teaches, simplifies or revises it.
