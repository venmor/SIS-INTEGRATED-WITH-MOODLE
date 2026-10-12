# Fictional university setup walkthrough

Current local review: **http://127.0.0.1:3154/sign-in**, setup **http://127.0.0.1:3154/admin/setup/university**, API health **http://127.0.0.1:3155/health**. These addresses refer to the retained isolated review database, not the primary application database. Local processes must be running.

| Purpose | Username | Fictional password |
|---|---|---|
| Prepare structure/calendar drafts | `nalumino.setup` | `Seed-2026-Setup` |
| Independently review and activate | `chileshe.policy` | `Seed-2026-Policy` |

These appointments are limited to `SYSTEM:DEMO-UNIVERSITY` and end on 2027-01-01. They do not grant finance, results, admissions or Moodle administration. Use separate browser profiles/private windows, or sign in again to switch accounts.

1. Sign in as Nalumino, open **University structure**, and change the name, unit label or a calendar date. Expand structure/calendar sections as needed. Entries are paged; advanced review information is expandable.
2. Enter a short reason and **Save new draft**. The saved version is immutable; saving does not activate it. Verify the selected version's complete profile and changes.
3. Sign in as Chileshe, select the saved version, inspect its changes and pending domain handoffs. Check both review/purpose confirmations, enter Chileshe's password and **Approve and activate**.
4. Inspect the active version and version history. Create a successor to change it again. **Older versions / Newer versions** browse server history while retaining unsaved entries.
5. Try a child period outside its parent dates or approval using the proposing person. The server must refuse with a specific correction. If a response is uncertain, retain the request reference and use **Check history** or same-reference retry; avoid creating another proposal/approval to guess the outcome.

Activation installs fictional structure and calendar source versions and records approval, audit and a durable pending owner handoff. It does not approve curricula, rewrite registrations/fees/results, publish timetable sessions or create Moodle courses. See [policy](../policies/SYNTHETIC-UNIVERSITY-SETUP-POLICY.md) and [implementation evidence](../learning/NOTE-V2-SETUP-003.md).

For a separately configured loopback review/test database, enable `DEMO_MODE=true` and `SIS_ENABLE_INSTITUTION_DEMO_SETUP=true`, apply additive migrations and run `node scripts/with-env.mjs node scripts/university-setup-demo-accounts.mjs` from `development/`. The account script adds only these two actors, validates existing credentials/appointments and never resets student journeys or automatically activates a profile. Set `API_INTERNAL_URL` to the API's actual bound address when starting web. Keep Moodle mode explicitly `simulator` until its own live run/manifest/claim gates are implemented.
