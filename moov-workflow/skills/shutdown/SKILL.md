---
name: shutdown
description: End-of-day shutdown routine (~4pm). Collects the day's activity from all company tools, enriches the Log, fills the Summary, creates tomorrow's daily note with Open pre-populated and a standup drafted in comms/. Run this when wrapping up for the day. Also handles a second shutdown if you worked into the evening.
---

# Shutdown Routine

> See [CONNECTORS.md](../../CONNECTORS.md) for available tools.
> Requires the **productivity** foundation plugin for task model and memory conventions.

The shutdown collects the day, enriches your notes with context from tools, and sets up tomorrow so you can hit the ground running. It's the end of the work *day* — not the end of the calendar day.

## Day Boundary

**Before running anything**, check the current time:

- **Before 5am** → treat this as the previous calendar day. Use yesterday's daily note as "today". Tomorrow's note is today's date.
- **5am or later** → normal. Today's note is today's date.

This means late-night work (e.g. finishing something at 1am) is captured in the note for the day it belongs to, not the next calendar day.

## Second Shutdown Detection

Read today's `## Log` and `## Summary`. If Log blocks already have links/context and Summary has data filled in, this is a **second shutdown** (you kept working after the first). In that case:

- Re-gather all data from tools (same as a first shutdown)
- For `## Log`: only touch blocks that are new since the first shutdown; don't re-enrich blocks that already have links and context
- For `## Summary`: update any sections that have changed (e.g. new completed Linear tickets, new Slack threads)
- Regenerate tomorrow's note and standup with the full day's picture

## Step 1: Load Context

Read `memory/AGENTS.md` and `memory/meetings.md` from the Obsidian vault. These drive memory decoding and calendar event linking throughout the rest of the routine.

If `memory/AGENTS.md` doesn't exist, the memory system needs bootstrapping — direct the user to run `/productivity:bootstrap` before continuing.

## Step 2: Gather Data (Run in Parallel)

Pull from all sources simultaneously to minimize wait time:

| Source | What to Fetch |
|--------|--------------|
| **Linear** | All issues assigned to me; filter to updated today or status changed today |
| **Gmail (GitHub notifications)** | GitHub notification emails from today — PR reviews requested, merges, approvals, comments |
| **Google Calendar** | All events for today |
| **Slack** | My messages today: `from:@me on:YYYY-MM-DD` — paginate to get all results |
| **Gmail (other)** | Non-GitHub emails today — filter out automated noise (ACH uploads, bot alerts) |

**GitHub PR strategy:** Use GitHub MCP tools if available (preferred). Query:
- My open PRs: filter by author, include draft status
- PRs I reviewed or commented on today

If GitHub MCP tools are not available, check the vault for `+/shutdown-collect-YYYY-MM-DD.md` (today's work date). The `moov-workflow/bin/shutdown-collect` script writes there automatically — if the file exists, read it for PR and session data. If neither GitHub MCP nor the collect file is available, fall back to Gmail GitHub notification emails:
- "requested your review" → PR I was asked to review
- "Merged #NNN" where I'm CC'd as reviewer or commenter → reviewed PR that merged
- CC'd as "Comment" → PR I commented on
- My name as author in a merge notification → my own PR merged

Note: Gmail reconstruction misses draft PRs entirely. If GitHub MCP and shutdown-collect output are both unavailable, flag this gap in the report.

**Session summary:** Prefer `shutdown-collect` output for session data over the Computer Session Overview the user fills in manually — it's more precise. If both are present, the script output takes precedence.

**Slack pagination:** Fetch all pages. Group messages by channel before moving on.

## Step 3: Review the Log

Read today's `## Log`. The Log captures mode shifts — blocks of time spent in a particular type of work. The user writes these throughout the day; the shutdown's job is to enrich and fill gaps.

### Propose missing blocks

Compare the existing Log blocks against the Slack and GitHub activity data. Look for significant chunks of activity (15+ minutes, or a coherent set of related actions) that don't have a corresponding Log block.

For each gap, show a **preview** of what the block would look like — header plus enriched bullets — then ask for approval before writing anything:

```
I think there's a missing block around 13:19 — here's what it would look like:

### 13:19 — Comms
- DM to Jeff: architecture meeting prep — gateway readiness checks per [[people/Morgan Hargrove|MorganH]] ([ISSU-1135](url)): readiness probes, K8s routing, multi-region leader elections
- [#org-security](url): FYI Apple background security restarts

Add this block? (yes / edit / skip)
```

Present all proposed blocks together so the user can approve in one pass, not one at a time.

### Enrich existing blocks

For blocks the user has already written, append links and context — do not rewrite their words:

- Slack permalinks for threads mentioned
- GitHub PR URLs for code reviews
- Linear ticket links for tasks
- `[[people/Name|Display]]` wikilinks for people referenced by first name

Keep additions to one link or brief clause per bullet. The Log is a navigation surface, not a transcript.

### Review Capture for duplicates

Read today's `## Capture`. For each item, check whether a matching effort already exists in `efforts/` — by title similarity, Linear ticket ID, or topic overlap. If a likely match is found, surface it:

```
Capture item: "Check kubernetes readiness probes from Sean Patterson"
Possible match: [[efforts/20260319100006-spicedb-kind|INFRA-4398]] — readiness probe discussion also in 1:1 Log block
→ Duplicate? Or separate?
```

Present all potential duplicates together in one pass for Adam to review — don't modify Capture or efforts automatically. The goal is to flag, not to act.

## Step 4: Fill the Summary

Find `## Summary` in today's note. The Computer Session Overview sub-section is filled manually by the user — if it's missing or empty, prompt them to add it, then continue. Fill all other sub-sections from the gathered data:

```markdown
## Summary

### Computer Session Overview
[Populated from `+/shutdown-collect-YYYY-MM-DD.md` session summary if available — covers 5am to now. Otherwise filled manually by user; prompt if missing.]

### Github
#### My Open PRs
[Prefer GitHub MCP tools; fall back to Gmail notifications. Draft PRs are not visible via Gmail — always require GitHub MCP or flag as unknown.]

**Draft** ← highest priority — work close to shipping
- [#NNN](url) Title (INFRA-NNN)

**Waiting on Review**
- [#NNN](url) Title (INFRA-NNN)

**Merged today** / **Closed today**
- [#NNN](url) Title

#### PRs I Reviewed
| PR | Repo | Author | Status |
|---|---|---|---|
| [#NNN](url) Title | repo | Name | Merged/Open |

### Linear Tickets
[For each ticket, link to its effort file — create one if missing. Never use the raw Linear URL as the link.]

#### Completed today
- [[efforts/file|INFRA-NNN]] Ticket title

#### Active
- [[efforts/file|INFRA-NNN]] Ticket title
[completedAt = today for completed; In Progress for active; Todo/Incoming for back-burner]

### Communications
#### New Meeting Invites
| Date/Time | Event | From | Accepted? |
|---|---|---|---|
| Fri Mar 20 10:30 AM | ISSU-1135 shazam gateway | Morgan Hargrove | ✓ |
[Calendar invite emails received today — two cases: (1) new meetings scheduled for a future date, (2) existing/recurring meetings rescheduled to a new time today. Skip routine recurring events that ran as-scheduled. Show acceptance status for each. Flag any not yet responded to so Adam can act before closing out the day.]

#### Slack Activity
| Channel | Topic | Key Detail |
|---|---|---|
| #channel | Brief topic | [permalink](url) |
| DM → Person | Topic | Key detail |

#### Email Highlights
| From | Subject | Key Detail |
|---|---|---|
[Human-written emails only — skip GitHub notifications, automated alerts, ACH uploads]

#### Conversations
[Notable bilateral exchanges where something was resolved, decided, or escalated. Can overlap with the Log — link up to the relevant block for detail. Use sub-bullets for key points.]
- **Person / #channel ↔ Other** → [↑](#log-block-anchor)
  - Key decision or outcome
  - Follow-up item if any
```

If a sub-section already has content (second shutdown or user pre-filled), update rather than replace — add new rows, check off completed items.

## Step 5: Create Tomorrow's Note

Determine tomorrow's working day (skip weekends — if today is Friday, tomorrow is Monday).

Create the daily note at `log/daily/YYYY-MM-DD.md` via Obsidian MCP if it doesn't exist yet. Use the vault template structure from the task-management skill. Pre-populate these sections:

### ## Open

Populate in three passes, in order:

**Pass 1 — Linear:** Add active Linear issues (In Progress status) and any open incidents (`#inc-*` channels from Slack). For each ticket, check whether an effort file exists in `efforts/` with a matching `linear` field. If one exists, link to the effort; if not, create a minimal effort file first, then link to it. Never link directly to the Linear URL. Use plain bullets — no task checkboxes.

```markdown
- [[efforts/20260319100006-spicedb-kind|INFRA-4398]] Create SpiceDB kind
- [[efforts/20260316164047-new-service-eventsorch|INFRA-4412]] New Service: eventsorch
- INC: Description [#inc-channel-name](slack-url)
```

**Pass 2 — Active efforts:** Read `efforts/` via Obsidian MCP. Scan frontmatter for files where `type` is `effort` and `status` is `active`, `planning`, `waiting`, or `blocked`. For each one:
- If the effort has a `linear` field, extract the ticket ID by splitting on `/` and taking the last non-empty segment. If that ticket ID is already listed in Pass 1, **skip it**.
- Otherwise, add a plain bullet linking directly to the effort — no prefix, no checkbox:

```markdown
- [[efforts/20260318211939-roll-ibm-mq-command|Roll IBM MQ Command]]
```

Use the `title` frontmatter field for the display name.

### ## Plan

Build from tomorrow's Google Calendar events. Read `memory/meetings.md` to match event titles to known links:

- **Match found with link** → use that link: `- [ ] **14:45:** [1:1 with Jeff](notion-url)`
- **Match found as "fresh comms note"** → create the comms note (Step 6) and wikilink: `- [ ] **10:00:** [[comms/2026_03_19-infra-standup|Infra Standup]]`
- **No match** → plain text: `- [ ] **11:00:** Architecture Review`

If no calendar data is available for tomorrow, leave `## Plan` empty.

### Remaining sections

Leave `## Capture`, `## Log`, and `## Summary` empty with just their headers.

## Step 6: Draft the Standup

Determine the standup date (same as tomorrow's note date). Create `comms/YYYY_MM_DD-infra-standup.md`:

```markdown
---
tags:
  - comms/standup
date: YYYY-MM-DD
---

# Infra Standup YYYY-MM-DD

### Yesterday
- [Completed Linear tickets framed as outcomes]
- [Notable PR reviews or merges]
- [Process/team work: onboarding, incidents, process changes]

### Today
- [Active Linear tickets that will get attention]
- [Carry-forward items]
- [Scheduled commitments from tomorrow's Plan]

### Blockers
- None
```

**Writing the standup:**
- Lead with ticket IDs for tracking (`INFRA-4398`, not "the SpiceDB thing")
- Group related sub-tickets under their parent outcome rather than listing each separately
- Include non-ticket work (PR reviews, onboarding, process changes, architecture discussions)
- "Yesterday" = today's completed + notable work; "Today" = tomorrow's active tickets + plan

After writing the standup to the comms note, present it in a markdown code fence for easy copy-paste to Slack.

## Step 7: Memory Maintenance

Scan all gathered data for memory gaps:

- Unknown people → ask, then create/update `people/{name}.md`
- Unknown terms or acronyms → ask, then add to `memory/glossary.md`
- Unknown project references → ask, then create/update `efforts/{name}.md`

Then regenerate `memory/AGENTS.md` from vault contents (see memory-management skill for format).

## Step 7.5: Friday Effort Review (Fridays only)

**Skip this step entirely if today is not Friday.**

Run `/productivity:review` to triage stale efforts. If the review skill is not available, fall back to inline review:

Scan `efforts/` via Obsidian MCP for stale efforts (see the review skill for staleness logic). Present them and prompt for decisions: done / paused / dropped / +7 / +14 / +30 / skip.

Include a one-line summary in the shutdown report.

## Step 8: Report

**Do not set `last_reviewed` during shutdown.** That field is stamped during a separate review pass — a deliberate look-back on a *following* day, once there's been time to fully process captures, convert open tasks into efforts, and confirm nothing was missed. Shutdown closes the day; review confirms it was fully digested.

Report what was done:

```
Shutdown complete:
- Log: 2 existing blocks enriched, 1 new block added (approved)
- Summary: New invites (2, 1 unaccepted), PRs reviewed (4), Linear (5 completed, 5 active), Slack (11 threads), Email (4 highlights)
- Tomorrow's note: created with 5 Open items (3 Linear, 1 incident, 2 efforts), 3 Plan entries
- Standup: drafted at comms/2026_03_19-infra-standup.md
- Memory: 1 new person, AGENTS.md regenerated
- Effort review: 3 reviewed — 1 done, 1 extended +7, 1 dropped  ← Fridays only
```

Then present the standup code fence.
