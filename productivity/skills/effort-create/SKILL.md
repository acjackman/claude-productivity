---
name: effort-create
description: Create a new effort from a description or conversation. Use when the user says "start an effort", "track this", "create an effort for", or when work clearly spans multiple steps or days.
user-invocable: true
---

# Effort Create

Promotes an idea or task into a tracked effort with proper structure.

## Arguments

`$ARGUMENTS` is a description of the work. May be brief ("migrate to Postgres 16") or detailed.

## Instructions

1. **Extract from arguments or ask:**
   - **Title** (required) — concise, descriptive
   - **Status** — default `idea` unless the user is actively working on it (`active`)
   - **Linear link** — if they mention a ticket, extract the URL
   - **Slug** — derive from title if it's memorable, otherwise omit (just the timestamp ID)

2. **Create the effort** via MCP:
   ```
   create_effort({
     title: "...",
     status: "idea",
     slug: "optional-slug",
     linear: "https://linear.app/..."  // if mentioned
   })
   ```

3. **Add to today's daily note** — capture a reference to the new effort:
   ```
   capture({
     text: "[[<effort-path>|<title>]]",
     is_task: false
   })
   ```

4. **Report what was created:**
   > Created effort: **Migrate to Postgres 16** (`efforts/20260322010553-migrate-postgres.md`)
   > Status: idea · Review in 14 days
   > Added to today's ## Capture

5. **Offer next steps:**
   - "Want to break this down?" → `/effort-decompose`
   - "Want to flesh out the goal and approach?" → `/refine`
   - "Want to start working on it now?" → suggest changing status to `active`

## From conversation context

If the user has been discussing something complex and says "track this" or "make this an effort", synthesize the conversation into:
- A clear **title**
- A **## Goal** section summarizing the intent
- **## Links** with any URLs or references from the conversation
- **## Next Steps** if obvious actions were discussed

Write these to the effort file via `patch_note` after creation.
