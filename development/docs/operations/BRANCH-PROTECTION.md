# Branch protection — owner checklist (apply at v0.1.0, Phase 1 starts PR flow)

GitHub: repository Settings → Branches → Add rule for `main`. Handbook: 19.26.

- [ ] Require a pull request before merging (no direct pushes — closes deviation C2)
- [ ] Required approvals: 1 (2 for high-impact: results, admissions, finance, support, awards, regulatory, privileged access — 19.28)
- [ ] Require status checks to pass: `ci` workflow (this slice)
- [ ] Require branches to be up to date before merging
- [ ] Require conversation resolution before merging
- [ ] Do not allow bypassing (include administrators)
- [ ] Delete head branches automatically after merge (mirrors 19.26 rule 7)

Verify: open a trial PR from a `chore/…` branch, confirm merge is blocked
until CI is green + review given, then merge and confirm the branch is deleted.
Record the date + owner below when applied.

Applied on: _pending_ · Applied by: _pending (Lead Charles)_
