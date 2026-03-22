---
name: capture
description: Quick capture to today's daily note. Use when the user says "capture this", "remind me to", "add a task", or mentions something they want to track. Appends to ## Capture with optional effort linking.
user-invocable: true
---

# Capture

Fast inbox for anything that comes up during the day. Zero friction — get it out of your head and into the vault.

## Arguments

`$ARGUMENTS` is the thing to capture. May be a task, a note, an idea, or a request.

## Instructions

1. Parse `$ARGUMENTS` for:
   - **The item itself** — what to capture
   - **Effort link** — if the item relates to a known effort, link it. Check `memory/AGENTS.md` active efforts first.
   - **Task vs note** — if it's actionable, use a checkbox (`- [ ]`). If it's an observation or reference, use a plain bullet (`-`).

2. Call the `capture` MCP tool:
   ```
   capture({
     text: "<the item>",
     effort_link: "<effort-slug if relevant>",
     is_task: true/false
   })
   ```

3. Confirm what was captured. One line, e.g.:
   > Captured: "Review Phoenix runbook" → linked to [[20260318211939|Phoenix DB Migration]]

## Examples

- `/capture ask Todd about Q2 budget` → `- [ ] Ask Todd about Q2 budget`
- `/capture interesting article on pglogical` → `- Interesting article on pglogical` (no checkbox — not actionable)
- `/capture benchmark Redis for rate limiting [[20260322010553]]` → `- [ ] Benchmark Redis for rate limiting [[20260322010553]]`

## When to suggest an effort

If the captured item sounds like multi-step work (not a quick task), suggest:
> This sounds like it could be an effort. Want me to create one with `/effort-create`?

Don't auto-create — let the user decide.
