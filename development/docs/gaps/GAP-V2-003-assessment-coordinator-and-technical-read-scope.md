# Assessment coordinator and technical read scope

Status: open authority/data-mapping dependency. This is not closed by the reference UI redesign.

The assessment reader now enforces exact offering scope for lecturers and moderators, and exact academic-period scope for examinations officers before filtering or limiting records. Direct plan, mapping and batch reads use the same predicates and neutral unavailable responses. Technical roles cannot draft plans or stage marks; API authority remains decisive.

Two older reader contracts remain broader: coordinator school appointments lack a reliable published school-to-offering relationship in this assessment model, and Moodle administrator field visibility is not yet separated from academic record views. Existing behaviour is preserved by this bounded change, rather than inventing course-code prefix rules or new approval authority. These roles are not certified for institution-wide deployment by this slice.

Closure requires a source-owned effective-dated school/programme/offering relationship, explicit technical-role field projections, and allow/deny tests for cross-school records, stale appointments and direct known IDs. Configure and demonstrate these relationships through the academic setup workflow before certifying institutional scope. The completion sequence keeps academic setup first.
