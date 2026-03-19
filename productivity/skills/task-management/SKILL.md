---
name: task-management
description: Bullet journal-style task management using daily log files in Obsidian. Reference this when the user asks about their tasks, wants to capture something, plan their day, review yesterday, or track an effort.
user-invocable: false
---

# Task Management

Tasks live in daily log files in the Obsidian vault. There is no separate TASKS.md — the daily log is the task system.

## Core Concepts

**Bullet journal migration:** Unfinished items don't persist automatically. At the start of each day, yesterday's unfinished items are reviewed and intentionally carried forward or dropped. The friction is the point — it forces prioritization.

**Daily log as primary surface:** Each day's `log/daily/YYYY-MM-DD.md` has:
- `## Plan` — intentional work for the day, including time-prefixed calendar events
- `## Capture` — incoming tasks, requests, ideas that arrive throughout the day

**Efforts for bigger work:** Multi-step initiatives get their own file in `efforts/`. Daily tasks link to efforts with `[[effort-slug]]`. Efforts are a personal scratchpad — once mature, work gets pushed to Linear or Notion for the team.

**Lightweight refinement funnel:** The vault is a capture and refinement space before sharing with the team:
- `+/` → raw inbox, unorganized
- `log/daily/` → daily planning + capture
- `efforts/` → personal tracking of multi-step work (shared with TaskNotes plugin)
- `comms/` → meeting notes, draft communications
- Linear/Notion → where things go when they're ready for the team

## Daily Log

All interactions with daily notes use the Obsidian MCP.

### Frontmatter

Daily notes include frontmatter fields managed by the Templater plugin, TaskNotes, and productivity skills:

| Field | Set by | Purpose |
|-------|--------|---------|
| `created_at` | TaskNotes | ISO timestamp of note creation (e.g. `2026-03-19T00:16:39-07:00`) |
| `modified_at` | TaskNotes | ISO timestamp — updated on every save |
| `modified_days` | TaskNotes | List of daily note wikilinks for each day the file was touched |
| `created_day` | TaskNotes | Wikilink to the daily note for the creation day |
| `up` | Templater | Link to the parent cycle note |
| `prev` / `next` | Templater | Navigation links between working days (skips weekends) |
| `tags` | Templater | Always `periodic/daily` |
| `weekday` | Templater | Day abbreviation (Mon, Tue, etc.) |
| `review_after` | Templater | Date when the note is eligible for review (defaults to the note's own date) |
| `last_reviewed` | workflow skills | Empty until a workflow skill processes the note; set to today's date after review |

The four TaskNotes date fields (`created_at`, `modified_at`, `modified_days`, `created_day`) are auto-managed across **all note types** in the vault — efforts, daily notes, cycle notes, and comms. Do not set them manually.

The `review_after` / `last_reviewed` pair drives the review lifecycle — workflow skills (configured per-vault) use these to decide which notes need attention.

### Structure

Sections follow the day's natural flow:

```markdown
## Open
- [ ] Linear issue title [TEAM-123](url)
- [ ] PR: Pull request title [#45](url) — review requested
- [ ] INC: Incident description [#inc-channel](slack-url)
- [ ] effort: [[20260318211939-effort-slug|Effort Title]]

## Plan
- [ ] **10:00:** [[comms/2026_03_19-standup|Standup]]
- [ ] **14:45:** [1:1 with Jeff](https://www.notion.so/...)
- [ ] Task I intend to do today
- [ ] Work on [[20260318211939-effort-slug]] — specific next step

## Capture
- [ ] Thing that came up during the day
- [ ] Request from someone in Slack
- Something worth noting but not a task

## Log
### HH:MM — description
- Concise bullets with links

## Summary
Flexible digest of the day's activity — structure determined by workflow skills.
```

- `## Open` — active Linear tickets, PRs waiting on review, open incidents, and active efforts. Populated by workflow skills.
- `## Plan` — written by the user. Calendar events are time-prefixed checkboxes.
- `## Capture` — incoming items throughout the day. Append-only.
- `## Log` — freeform working memory. Timestamped blocks: `### HH:MM — description`. Write whatever captures the work.
- `## Summary` — end-of-day digest. Structure is flexible — workflow skills fill this however makes sense for the vault.

### Key Interactions

**When user asks "what's on my plate" / "my tasks":**
- Read today's daily note via Obsidian MCP
- Summarize `## Open` (external items + active efforts), `## Plan` (intended work), and `## Capture` (incoming)
- Check for any unchecked items from yesterday's note too

**When user says "add a task" / "capture this" / "remind me to":**
- Append to `## Capture` in today's daily note
- If it relates to an effort, include a `[[effort-slug]]` link

**When user says "done with X" / "finished X":**
- Find the item in today's note and check it off: `- [x]`

**When user asks to "plan my day" or "what should I focus on":**
- Read today's `## Open` for external obligations and active efforts
- Read yesterday's note for unfinished items
- Read today's `## Capture` for things that came in
- Help the user write today's `## Plan`

**When user asks to "review" or "start my day":**
- Read yesterday's daily note for unfinished items across `## Open`, `## Plan`, and `## Capture`
- Present unfinished items for review — user decides what goes into today's `## Plan`
- This is the bullet journal review — the user drives prioritization

**When user asks "what am I waiting on":**
- Search recent daily notes for waiting/blocked items
- Check active efforts for blocked next steps

### Task Format

- `- [ ] Task description` — open task
- `- [x] Task description` — completed
- `- [-] Task description` — canceled or migrated
- `- [!] Task description` — important / flagged
- `- [ ] **HH:MM:** [[comms/note|Meeting Name]]` — calendar event with link
- `- [ ] Work on [[20260318211939-effort-slug]] — specific step` — task linked to effort
- Plain bullets without checkboxes for notes/observations
- `📝 YYYY-MM-DD` prefix on tasks carried forward from a previous day

## Comms Notes

Recurring meetings and communications live in `comms/` as dated notes: `comms/YYYY_MM_DD-slug.md`.

The mapping from calendar event titles to their comms notes or external links lives in `memory/meetings.md`. Workflow skills read this when building tomorrow's `## Plan`.

Other recurring meetings (1:1s, etc.) link to their Notion running-agenda pages rather than creating local notes.

## Efforts

Efforts track multi-step work that spans multiple days. They live in `efforts/` in the Obsidian vault. The TaskNotes plugin is also configured to create files in `efforts/`, so both systems share the same folder and frontmatter schema. See DEC-0013.

### Naming Convention

All effort files use the **datetime ID** format:

```
YYYYMMDDHHMMSS.md
```

14 all-digit characters (year, month, day, hour, minute, second). Example: `20260318211939.md`

Optional slug suffix for manually created efforts: `20260319001057-migrate-effort-id-format.md`

The filename contains no title — the `title` frontmatter field is the human-readable identifier and must always be set.

When creating an effort manually via Obsidian MCP, generate the ID from the current time:

```python
from datetime import datetime, timezone, timedelta
now = datetime.now(timezone(timedelta(hours=-7)))  # PDT
print(now.strftime("%Y%m%d%H%M%S"))
```

Or run: `python3 -c "from datetime import datetime,timezone,timedelta; print(datetime.now(timezone(timedelta(hours=-7))).strftime('%Y%m%d%H%M%S'))"` from Bash.

Older effort files using `YYYY_MM_DD-slug.md` naming are preserved as-is — wikilinks continue to resolve.

### Frontmatter

```yaml
---
title: "Effort Title"
type: effort            # required — how TaskNotes identifies effort files
status: idea            # idea | planning | waiting | blocked | active | paused | done | dropped
created_at: 2026-03-19T00:16:39-07:00   # ISO timestamp — set by TaskNotes on creation
modified_at: 2026-03-19T00:16:39-07:00  # ISO timestamp — updated by TaskNotes on every save
modified_days:                           # auto-managed by TaskNotes — list of days the file was touched
  - "[[log/daily/2026-03-19|2026-03-19]]"
created_day: "[[log/daily/2026-03-19|2026-03-19]]"  # wikilink to creation day — set by TaskNotes
review_after: YYYY-MM-DD  # when to resurface this effort — set by review skill after each triage
scheduled: YYYY-MM-DD   # optional: when to work on it next
due: YYYY-MM-DD         # optional: hard deadline
linear: https://linear.app/{linear_org}/issue/TEAM-1234/   # optional: Linear URL (no title slug)
tags:
  - effort
---
```

The four date fields (`created_at`, `modified_at`, `modified_days`, `created_day`) are **auto-managed by TaskNotes** — do not set them manually. `review_after` is the only date field that productivity skills write to.

**`type: effort` is required** — TaskNotes uses property-based file detection. Without it, the effort won't appear in kanban/calendar/agenda views.

**`title` is required** — filenames are opaque zettle IDs with no slug; the title field is the only human-readable identifier.

**Status values:** `idea`, `planning`, `waiting`, `blocked`, `active`, `paused`, `done`, `dropped`

Efforts with `status: active`, `planning`, `waiting`, or `blocked` are surfaced in `## Open` by workflow skills (see DEC-0014).

**`linear` field:** Linear URL without the title slug (e.g. `https://linear.app/{linear_org}/issue/TEAM-1234/`). Obsidian renders this as a clickable link. The trailing slash is kept, no title slug — stable if the ticket is renamed. Extract the ticket ID by splitting on `/` and taking the last non-empty segment.

**`review_after` field:** Date when the effort should next be surfaced for a status check. Set by the review skill (`/productivity:review`) after each triage. Default intervals by status:
- `active`, `waiting`, `blocked` → 7 days (or `review_interval` from Workflow Config)
- `idea`, `planning` → 14 days
- `paused` → 30 days

If missing, the review skill falls back to `created_at` + the status-appropriate interval.

**Optional fields** (add when relevant):
- `time_estimate` — estimated minutes
- `blocked_by` — wikilinks to blocking efforts
- `efforts` — wikilink to a parent effort (for sub-efforts)
- `completed_at` — set automatically by TaskNotes when status → `done` or `dropped`

### Template Philosophy

New efforts start **minimal** — frontmatter, title, and a `## Links` section. Add sections as the work warrants them:

```markdown
---
title: "Roll IBM MQ Command"
type: effort
status: active
created_at: 2026-03-18T14:23:15-07:00
modified_at: 2026-03-18T14:23:15-07:00
modified_days:
  - "[[log/daily/2026-03-18|2026-03-18]]"
created_day: "[[log/daily/2026-03-18|2026-03-18]]"
review_after: 2026-03-25
linear: https://linear.app/{linear_org}/issue/TEAM-1234/
tags:
  - effort
---

# Roll IBM MQ Command

## Links
- [Slack thread](url)
```

Add sections organically:
- `## Goal` / `## Why` / `## Approach` — when thinking needs structure
- `## Decisions` / `## Open Questions` — when evaluating options
- `## Next Steps` — when there's a clear sequence of work
- `## Reference` — supporting links, docs, commands
- `## Log` — dated progress entries when the effort spans multiple days

Full templates for more structured efforts are in `z/templates/`.

### Effort Lifecycle

```
Daily bullet
  ↓ (gets complex or spans days)
Effort file — status: idea or planning
  ↓ (work begins)
Effort file — status: active
  ↓ (optionally, when ready to share)
Linear ticket created → add linear: TEAM-NNNN to frontmatter
  ↓
status: done (or paused)
```

Not every daily bullet needs an effort. Not every effort needs a Linear ticket.

### Linear Companion Notes

When an effort has a `linear` field, it acts as a **personal companion** to the Linear ticket — holding approach notes, scratchpad thinking, Slack context, and working notes that don't belong in the ticket itself.

Efforts with a `linear` field are **not duplicated** in `## Open` — the Linear ticket line already covers them.

### Growing an Effort into a Folder

If an effort grows too large or needs supporting files, refactor it into a folder:

```
efforts/20260318211939-roll-ibm-mq-command.md
  ↓ refactors into
efforts/20260318211939-roll-ibm-mq-command/
  20260318211939-roll-ibm-mq-command.md   (main file, same name)
  architecture.md
  research-notes.md
```

The folder and main file keep the same name, so `[[20260318211939-roll-ibm-mq-command]]` wikilinks continue to work.

### Key Interactions

**When user asks to "start an effort" / "track an effort" / "create a task note":**
- Create via Obsidian MCP: write_note to `efforts/YYYY_MM_DD-slug`
- Use minimal template: frontmatter + title + `## Links`
- Add a task to today's `## Capture` linking to the new effort
- Ask if this relates to a Linear ticket — if so, add `linear:` to frontmatter

**When user asks about effort status:**
- Read the effort file, summarize status, next steps, open questions

**When user says to "log progress" on an effort:**
- Append an H3 date entry to the effort's `## Log` section via patch_note
- Optionally cross-reference today's daily note

**When an effort is ready for the team:**
- Help draft a Linear issue or Notion doc from the effort content
- Update effort frontmatter: add `linear: TEAM-NNNN` once the ticket exists
- Update `status` to reflect current state

**When user asks to "pause" or "close" an effort:**
- Update `status` to `paused` or `done` via update_frontmatter
- It will no longer appear in `## Open` after the next workflow refresh

## Cycle Notes

Each Linear sprint/cycle gets a personal note in `log/cycles/`. These are for personal reflection — goals for the cycle, retro notes, links to each day.

Template available at `z/templates/periodic-cycle.md`.

## Extracting Tasks

When summarizing meetings or conversations, offer to add extracted items:
- Commitments the user made ("I'll send that over")
- Action items assigned to them
- Follow-ups mentioned

Add to `## Capture` in today's daily note. If something is a bigger effort, suggest creating an effort file.

Ask before adding — don't auto-add without confirmation.
