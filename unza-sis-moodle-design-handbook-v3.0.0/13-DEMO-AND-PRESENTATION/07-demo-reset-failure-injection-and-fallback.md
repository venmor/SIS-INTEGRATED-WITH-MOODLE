# Demo Reset, Failure Injection and Fallback

The future demo environment uses one versioned fictional institution and deterministic seed/reset process. Accounts are role-labelled and contain no real person data.

Provide controlled toggles or test-adapter states for delayed payment, duplicate callback, Moodle outage, bad mapping, notification failure and stale metric. Failure injection must never be enabled in production.

Before presentation:

1. Reset and verify the dataset.
2. Run the critical test suite.
3. Confirm accounts, roles, clocks/timezone and provider simulators.
4. Rehearse each story and recovery.
5. Prepare screenshots/video and a narrated architecture walkthrough if the network/laptop fails.
6. Keep a clean second browser/profile for role switching.

The fallback still demonstrates evidence and design; it does not hide a failed build.
