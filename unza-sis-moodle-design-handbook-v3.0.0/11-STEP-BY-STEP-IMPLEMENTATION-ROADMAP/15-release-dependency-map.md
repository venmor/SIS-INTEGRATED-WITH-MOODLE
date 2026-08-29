# Release Dependency Map

| Release | Depends on | Enables |
|---|---|---|
| Design gate | Approved handbook and decisions | All implementation |
| v0.1 Foundation | Design gate | Every coding task |
| v0.2 Identity | Foundation | All role-specific slices |
| v0.3 Applicant | Identity | Admissions |
| v0.4 Admissions | Applicant | Student conversion |
| v0.5 Registration | Admissions + identity | Finance/Moodle/results |
| v0.6 Finance | Registration data model | Clearance in connected demo |
| v0.7 Moodle | Registration + course offering | Grade staging and recovery story |
| v0.8 Results | Moodle staging + roles | Full academic-control story |
| v0.9 Hardening | All MVP slices | Presentation release |
| v1.0 Presentation | Passing hardening gate | Controlled expansion |

Support, QA and other expansion work may begin earlier as isolated learning prototypes only if it does not change shared contracts or distract from the connected MVP. It is not merged into the release baseline until its dependencies and gates are satisfied.
