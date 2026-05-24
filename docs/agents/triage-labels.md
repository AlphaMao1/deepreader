# Triage Labels

The engineering workflow uses these canonical triage roles.

| Role | GitHub label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate the issue |
| `needs-info` | `needs-info` | Waiting on more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Needs human implementation or judgment |
| `wontfix` | `wontfix` | Will not be actioned |

Current implementation issues should normally use `ready-for-agent` unless they explicitly require a user decision.
