# v2.0 workspace shell

The shell establishes the positions of future SIS functions without claiming they are operational. It follows the approved task-first navigation model and the desktop/mobile split in Section 19. The same labels and placement should be retained as modules mature; institutional terminology and academic-period configuration remain governed data, not hard-coded policy.

| Region | Staff workspace | Student and applicant portals | Later integration |
|---|---|---|---|
| Identity | SIS mark, active workspace name | Portal name | Configured institution mark and approved language |
| Context | Active role and scope, always visible | Current portal identity | Source-owned academic period and role switcher |
| Primary navigation | Persistent left rail grouped by task | Focused top navigation, compact menu on mobile | Route manifest activated only with working, authorized journeys |
| Top bar | Page-area frame with workspace switch, account name and help | Portal-level actions | Permission-aware search, notifications and profile controls |
| Main | One task-focused page, existing record and queue routes | Guided tasks and records | New screen families reuse this region |
| Secondary | Help/account at stable edge | Help/account at stable edge | Contextual help, never private previews in global chrome |

The navigation slots are **Home**, **My tasks**, **Records and services**, **Notifications**, **Help**, and **Workspace/account**. Only live, role-relevant routes are links. Planned work such as quality analytics, confidential counselling, AI, global search and notifications remains in this map until its own permissions, data source, state and recovery contract are implemented. Hiding a link does not replace server authorization.

The staff workspace keeps a left rail on desktop. The top bar presents the active workspace and a deliberate route back to the workspace chooser. On narrow screens the rail becomes an explicit menu before the main task; no essential action depends on hover. Portal navigation remains shorter and at the top, as required by Section 19. The main content owns its page title and status; the shell must not add a second competing title or decorative dashboard metrics.

Implementation review should check keyboard focus/skip links, current-page semantics, readable scope, 390px overflow, deep-route context, and a failed or missing session. A future route is added to the live manifest only after its task packet establishes authorization and an actual destination.
