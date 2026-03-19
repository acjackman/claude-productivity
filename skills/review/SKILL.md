---
name: review
description: Review stale efforts and cycles. Scans efforts/ for items past their review_after date and log/cycles/ for cycles due for retro. Interactive triage — invoke whenever you want to clean up your backlog.
user-invocable: true
---

# Review Command

> If you see unfamiliar placeholders or need to check which tools are connected, see [CONNECTORS.md](../../CONNECTORS.md).

Standalone review of efforts and cycles. Run this whenever you want to triage stale work — not tied to any particular day or cadence. The `review_interval` config key (default: 7 days) controls the default rebump interval.

## Usage

```bash
/productivity:review
```

## Instructions

### 1. Load Context

Read from the Obsidian vault via MCP:

1. **`memory/AGENTS.md`** — Workflow Config (especially `review_interval` if set), active efforts, and current cycle.
2. Today's daily note at `log/daily/YYYY-MM-DD.md` — to understand current work context.

### 2. Find Efforts Due for Review

Use `list_directory` on `efforts/` to get all effort files. Then use `get_notes_info` to batch-read frontmatter.

An effort is **due for review** if:
- `review_after` is set and `review_after <= today`
- OR `review_after` is missing and the fallback interval has elapsed since `created_at`:
  - `active`, `waiting`, `blocked` → 7 days (or `review_interval` from config)
  - `idea`, `planning` → 14 days
  - `paused` → 30 days

**Skip** efforts with `status: done` or `status: dropped`.

Sort due efforts by status priority: `blocked` > `waiting` > `active` > `planning` > `idea` > `paused`.

### 3. Find Cycles Due for Retro

Use `list_directory` on `log/cycles/` and `get_notes_info` to batch-read frontmatter.

A cycle is **due for retro** if:
- `review_after <= today` AND the `## Retro` section is empty or missing

### 4. Present Review Summary

Show the user what needs attention:

```
## Efforts due for review (N)

| # | Effort | Status | Last reviewed | Age |
|---|--------|--------|---------------|-----|
| 1 | Effort Title | active | 2026-03-12 | 14d |
| 2 | Another Effort | idea | never | 21d |

## Cycles due for retro (N)

| Cycle | Period | Review after |
|-------|--------|-------------|
| infra-123 | Mar 11–24 | 2026-03-24 |

Ready to triage? I'll go through each one.
```

If nothing is due, say so and exit.

### 5. Interactive Triage — Efforts

For each effort due for review, read the full note and present:

```
### [1/N] Effort Title
Status: active | Created: 2026-03-05 | Linear: TEAM-1234
Last reviewed: 2026-03-12

[Brief summary of the effort content — goal, current state, next steps if visible]

What would you like to do?
- **done** — mark complete
- **paused** — shelve it
- **dropped** — abandon it
- **+7 / +14 / +30** — bump review_after by N days (keep current status)
- **skip** — leave unchanged for now
- **[new status]** — change to any valid status (active, planning, waiting, blocked, idea)
```

Wait for user input. Apply the chosen action:

- **done / dropped**: Update `status` via `update_frontmatter`. Remove `review_after`.
- **paused**: Update `status` to `paused`. Set `review_after` to today + 30 days.
- **+7 / +14 / +30**: Set `review_after` to today + N days via `update_frontmatter`.
- **skip**: Move to the next effort without changes.
- **[new status]**: Update `status`. Set `review_after` to today + default interval for that status.

### 6. Interactive Triage — Cycles

For each cycle due for retro, read the full note and present:

```
### Cycle: infra-123 (Mar 11–24)

## Goals (from the note)
- Goal 1
- Goal 2

What went well? What didn't? I'll draft the retro section.
```

Collect the user's retro thoughts and write a `## Retro` section via `patch_note`. Set `last_reviewed` to today.

### 7. Summary

After all items are triaged:

```
Review complete:
- Efforts: X reviewed, Y status changes, Z bumped
- Cycles: X retros written
- Next review: [earliest review_after date across all efforts]
```

## Notes

- This skill is standalone — invoke it whenever you want, not on a schedule
- The `review_interval` config key (in Workflow Config) controls the default bump for active/waiting/blocked efforts. Default: 7 days.
- Efforts with `status: done` or `dropped` are never surfaced
- If a user says "review my efforts" or "triage" or "clean up backlog", this is the skill to use
