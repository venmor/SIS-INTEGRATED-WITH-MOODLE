# GAP-V2-RESULTS-UI-001 — Assessment result grouping and filters

18 October 2026. The user requested results grouped by year of study and semester, with configurable test, quiz, assignment, project and exam views. The currently authorized `/assessment/me/results` projection exposes released official course outcomes, `periodCode`, course details, mark/outcome, version and review history. It does not expose year of study, semester or assessment component kind.

A UI-only filter would misclassify an official course outcome. Moodle activity marks are provisional learning feedback until the approved assessment and examination workflow releases them; the existing student projection must not relabel them as official exam or course results.

Required design decision: identify authoritative year/semester and assessment component sources, ownership and visibility rules, publication/review states, policy for mark suppression, academic attempt context, and the distinction between learning feedback, approved CA and final examinations. Then extend the own-student contract and test unauthorized, unreleased, amended and absent component states before enabling the requested filters. Lead Charles Hangoma; reviewer Chitindu Milimbo. Institutional approval and implementation remain open.
