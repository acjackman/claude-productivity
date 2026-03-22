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

2. **Create the effort.** Three creation paths, tried in order:

   **Path A — TaskNotes via Obsidian (preferred when user is at their desk):**
   The TaskNotes plugin creates efforts with full frontmatter, proper datetime IDs,
   and the body template. Use when Obsidian is open and the user can interact with the UI.
   ```
   obsidian_command({ id: "tasknotes:create-new-task" })
   ```
   TaskNotes opens a modal for the title. After the user confirms, find the new file
   via `obsidian_read` or `query_notes` and patch in any extra fields (status, linear, etc.)
   via `update_frontmatter`.

   **Path B — Obsidian CLI (headless, Obsidian running):**
   When the agent is running without user interaction but Obsidian is available.
   The `create_effort` MCP tool handles this automatically — it creates a file in
   `efforts/`, Templater applies the folder template, then the tool patches in title
   and custom fields.
   ```
   create_effort({
     title: "...",
     status: "idea",
     slug: "optional-slug",
     linear: "https://linear.app/..."
   })
   ```

   **Path C — Direct creation (no Obsidian):**
   In tests, CI, Cowork, or when Obsidian isn't running. The `create_effort` tool
   falls back to creating the file directly with mcpvault, producing compatible
   frontmatter and body structure.

   The `create_effort` tool automatically selects Path B or C. Only use Path A
   when you know the user is actively at Obsidian and would benefit from the
   TaskNotes UI (e.g., they want to set a due date, use the calendar picker, etc.).

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
