---
name: effort-log
description: Log progress on an effort. Use when the user says "log this", "here's what I did", "update effort", or after completing meaningful work on a tracked effort. Writes to both the effort's ## Log and today's daily note ## Log.
user-invocable: true
---

# Effort Log

Records progress on a specific effort in two places: the effort file (permanent record) and today's daily note (daily context).

## Arguments

`$ARGUMENTS` describes the progress. May reference an effort by name, slug, or wikilink.

## Instructions

1. **Identify the effort:**
   - Parse `$ARGUMENTS` for effort references (wikilinks, slugs, titles)
   - If ambiguous, check `memory/AGENTS.md` active efforts
   - If still ambiguous, ask: "Which effort? I see: ..."
   - Read the effort file to understand current state

2. **Extract progress details:**
   - What was done (bullets)
   - Any decisions made
   - What's next (if mentioned)
   - Links (PRs, Slack threads, docs)

3. **Write to the effort's ## Log** via `patch_note`:
   ```markdown
   ### YYYY-MM-DD
   - What was accomplished
   - Decisions or findings
   - [Link to PR](url)
   ```
   Append after existing log entries. Create `## Log` section if it doesn't exist.

4. **Write to today's daily note ## Log** via `log_entry`:
   ```
   log_entry({
     description: "Progress on <Effort Title>",
     bullets: ["summary of what was done", "links"],
     date: "YYYY-MM-DD"
   })
   ```

5. **Update effort if appropriate:**
   - If progress suggests a status change (e.g., "finished" → `done`, "waiting on review" → `waiting`), suggest it but don't auto-change
   - If the user mentions next steps not already in the effort, suggest adding them

6. **Confirm:**
   > Logged progress on **Phoenix DB Migration**:
   > - Effort: added to ## Log (2026-03-22)
   > - Daily: logged at 14:30

## When called without arguments

If no arguments, ask:
> What effort did you make progress on? What did you do?
