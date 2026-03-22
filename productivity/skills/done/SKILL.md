---
name: done
description: Mark work as complete. Use when the user says "done with X", "finished X", "completed X", or checks something off. Checks off the item in the daily note and optionally logs completion.
user-invocable: true
---

# Done

Closes the loop on a task or effort. Checks it off in the daily note and optionally logs what was accomplished.

## Arguments

`$ARGUMENTS` describes what was completed. May be a task description, effort name, or substring match.

## Instructions

1. **Find the item** in today's daily note. Search in order:
   - `## Plan` — intentional work
   - `## Open` — external obligations
   - `## Capture` — incoming items

   Use the `check_off` MCP tool:
   ```
   check_off({
     section: "Plan",  // try Plan first, then Open, then Capture
     item_substring: "<search term from arguments>"
   })
   ```

   If no match in Plan, try Open, then Capture. If still no match, tell the user:
   > Couldn't find an unchecked item matching "<term>". Want me to search other sections, or add a completion log entry anyway?

2. **Ask about logging** (brief — don't make this heavy):
   > Checked off: **<item>**
   > Anything worth noting about how it went? (or just "no" to skip)

3. **If the user provides details**, log via `log_entry`:
   ```
   log_entry({
     description: "Completed: <item summary>",
     bullets: ["<what they said>"]
   })
   ```

4. **If the item links to an effort**, ask:
   > This is linked to **<effort>**. Is the effort itself done, or just this task?
   - If effort done → suggest `update_effort_status` to `done`
   - If just the task → no further action

## Quick mode

If the user just says `/done <thing>` with no elaboration, check it off and confirm in one line. Don't force a logging conversation.

> ✓ Checked off: "Finish rate limiting RFC draft" in ## Plan
