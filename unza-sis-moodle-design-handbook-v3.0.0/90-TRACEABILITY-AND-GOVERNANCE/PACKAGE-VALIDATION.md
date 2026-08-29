# Package Validation Contract

The published ZIP must pass all of these checks:

- Archive opens and lists successfully.
- Root contains README, START-HERE, MASTER-CONTENTS, PROJECT-STATUS and AGENTS.
- Exactly 70 recovered standalone design records are present in evidence families.
- Applicant, Student, Lecturer/Tutor, Adviser, Coordinator/HoD, Dean, administrative, finance, support, research, QA/governance and operations journey books are present.
- No old source attachment, Word document, PDF, image, application source, database or executable file is included.
- Only Markdown and the checksum text file are present.
- No absolute local workspace path appears in content.
- Markdown links resolve locally or are explicitly external.
- Source-boundary, supersession, readiness and coverage registers agree.
- ZIP checksum and internal SHA-256 manifest are recorded.

Validation results for the generated archive are recorded outside this file during packaging and summarized to the user.
