---
name: sync
description: Morning sync routine (8–9am before standup). Catches up overnight activity, updates today's Open section and standup draft, and flags if last night's shutdown was missed. Run this before the daily standup.
---

# Morning Sync

> See [CONNECTORS.md](../../CONNECTORS.md) for available tools.
> Requires the **productivity** foundation plugin for task model and memory conventions.

The morning sync is a quick catch-up before standup. It looks at what happened overnight, updates your Open items and standup draft, and makes sure yesterday was properly closed out. It should feel fast — most mornings nothing significant happened overnight and it's a quick stamp.

## Step 1: Load Context

Read `memory/AGENTS.md` from the Obsidian vault. If it doesn't exist, direct the user to run `/productivity:bootstrap`.

## Step 2: Check Yesterday's Shutdown

Read yesterday's daily note. Check whether `last_reviewed` is set in the frontmatter.

**If `last_reviewed` is missing or empty on yesterday's note:**

Yesterday's shutdown didn't run. Flag this clearly:

```
Yesterday's shutdown wasn't run — Open, Summary, and tomorrow's standup may be incomplete.

Options:
1. Run shutdown for yesterday now (recommended if you have 5 minutes)
2. Skip and continue with this morning's sync only
```

If the user chooses to run shutdown for yesterday, do so before continuing with the sync.

**If `last_reviewed` is set:** Continue normally.

## Step 3: Check Today's Note Exists

Today's note should have been created by last night's shutdown. If it doesn't exist, create it now using the vault template structure (see task-management skill), then pre-populate `## Open` with active Linear issues and active efforts as a fallback (same logic as shutdown Step 5).

## Step 4: Gather Overnight Activity (Run in Parallel)

Define "overnight" as: since yesterday's `last_reviewed` timestamp (or since yesterday 5pm if timestamp isn't precise).

| Source | What to Fetch |
|--------|--------------|
| **Linear** | Issues updated overnight — status changes, new assignments, new comments |
| **Gmail (GitHub)** | GitHub notification emails since last reviewed — new review requests, merges, CI failures |
| **Slack** | Messages in #team-infra, #org-infra, and any `#inc-*` channels since yesterday EOD |
| **Google Calendar** | Today's events (confirm what's on the schedule) |

Keep this focused — overnight is usually quiet. Don't do a full day's data pull.

## Step 5: Sync Open

Update today's `## Open` section based on overnight activity:

**Linear and incident updates:**

| Event | Action |
|-------|--------|
| New Linear issue assigned overnight | Append `- [ ] [TEAM-NNN](url) Title` |
| Existing issue completed overnight | Check off `- [x]` |
| New `#inc-*` channel opened | Append `- [ ] INC: Description [#inc-channel](url)` |
| Incident resolved overnight | Check off existing INC item |
| New PR review requested overnight | Append `- [ ] PR: Title [#NNN](url) — review requested` |

**Effort check:**

Scan `efforts/` for files where `type` is `effort` and `status` is `active`, `planning`, `waiting`, or `blocked`. For each one:
- If it already appears in `## Open` (added by shutdown), leave it alone.
- If it's missing — e.g. status changed after last night's shutdown — append it.

Skip efforts whose `linear` URL resolves to a ticket already in `## Open`.

Append only — never remove or reorder existing items.

If nothing changed overnight and efforts are already present, note that and move on.

## Step 6: Update the Standup Draft

Read today's standup comms note: `comms/YYYY_MM_DD-infra-standup.md`.

If the file doesn't exist (shutdown didn't run), create it now using the shutdown skill's standup format and continue.

Assess the weight of overnight activity:

**Light overnight** (a few Linear status changes, no incidents, quiet Slack):
Append any new items to the relevant section. Don't restructure.

**Significant overnight** (incident opened or resolved, major PR activity, something that changes the story):
Offer a full rewrite with a preview:

```
There was significant overnight activity (vault-backups incident resolved, 2 new PRs merged).
Here's a revised standup draft — want me to replace the current one?

### Yesterday
[revised content]

### Today
[revised content]

### Blockers
- None

Replace / Keep current / Merge manually
```

After updating, present the final standup in a markdown code fence for easy copy-paste to Slack.

## Step 7: Memory Check

Quick scan of overnight activity for any new names, terms, or project references not in AGENTS.md. If gaps found, ask and update.

Regenerate `memory/AGENTS.md` if any memory gaps were filled. Otherwise leave it as-is.

## Step 7.5: Wednesday Cycle Review (Wednesdays only)

**Skip this step entirely if today is not Wednesday.**

Scan `log/cycles/` via Obsidian MCP for cycle notes where `review_after` ≤ today and either `last_reviewed` is not set or `last_reviewed` < `review_after`. These are cycles that have closed and haven't been retro'd yet.

If no cycles are due, note "no cycles due for retro" and move on.

If a cycle is due:

```
Cycle INFRA-123 closed 2026-03-16 — retro not yet written.

## Goals
[existing goals from cycle note]

## Retro
[empty]

Want me to draft the retro from this cycle's daily notes + Linear completions? (yes / skip)
```

**If yes:** Pull the cycle's daily notes and Linear issues completed during that cycle. Draft a short retro — 3–5 bullets on what shipped, what was blocked, anything to carry forward. Offer the draft for review before writing it.

**If skip:** Set `review_after` forward by 7 days on the cycle note.

After writing a retro: set `last_reviewed` to today on the cycle note.

## Step 8: Stamp and Report

Set `last_reviewed` to today's date on today's daily note.

Keep the report brief — this is a morning routine:

```
Sync complete:
- Overnight: 2 Linear updates, 1 new PR review request, quiet Slack
- Open: 1 item added (new review request), 2 efforts already present
- Standup: 1 item appended to Yesterday
- Cycle retro: INFRA-123 drafted  ← Wednesdays only, if applicable
```

Then present the standup code fence.
