---
name: handoff
description: Create an effort designed for another agent to pick up. Use when the user says "hand this off", "create a task for an agent", "spawn this", or wants to delegate work to a parallel Claude session or future conversation.
user-invocable: true
---

# Handoff

Creates an effort that's structured for another agent to execute independently. The key difference from `/effort-create` is that handoff efforts are written for an *agent audience* — they include enough context, clear success criteria, and explicit instructions so the receiving agent doesn't need to ask questions.

## Arguments

`$ARGUMENTS` describes what to hand off. May come from conversation context.

## Instructions

1. **Gather from arguments and conversation context:**
   - **What** needs to be done (the task)
   - **Why** it matters (context the receiving agent needs)
   - **Where** the work happens (repo, vault paths, systems)
   - **Done when** — explicit success criteria
   - **Constraints** — things to avoid, scope limits

2. **Create the effort** with status `active`:
   ```
   create_effort({
     title: "<clear action-oriented title>",
     status: "active",
     slug: "<descriptive-slug>"
   })
   ```

3. **Write the handoff body** via `patch_note`. Structure for agent consumption:

   ```markdown
   ## Goal
   <One paragraph: what to accomplish and why>

   ## Context
   <Background the receiving agent needs. Include:>
   - Relevant file paths or repos
   - Related efforts or decisions
   - Key constraints or gotchas
   - People involved (if relevant)

   ## Tasks
   - [ ] <Step 1 — concrete and verifiable>
   - [ ] <Step 2>
   - [ ] <Step 3>

   ## Done when
   - <Explicit success criterion 1>
   - <Explicit success criterion 2>

   ## Links
   - <Relevant URLs, vault links, docs>
   ```

4. **Add to today's ## Capture:**
   ```
   capture({
     text: "Handed off: [[<effort-path>|<title>]]",
     is_task: false
   })
   ```

5. **Report and offer next steps:**
   > Created handoff: **<title>** (`<path>`)
   >
   > An agent can pick this up by reading the effort file. Want me to:
   > - Spawn a worktree agent to start on it now?
   > - Log this in today's daily note?

## Writing for agents

Good handoff efforts follow the same principles as good ticket writing:
- **Self-contained** — the agent shouldn't need to ask "what did you mean by X?"
- **Verifiable** — "done when" criteria are concrete, not subjective
- **Scoped** — clear boundaries on what's in and out
- **Linked** — references to source material, not summaries of it

Bad: "Fix the auth issue"
Good: "Session tokens expire after 5 minutes instead of 24 hours. Find the timeout config in `src/auth/session.ts` and extend it. Done when: login sessions persist for 24h in staging."

## From conversation context

If the user has been working on something and says "hand this off", synthesize the conversation into the handoff structure. Include:
- Decisions already made (so the agent doesn't re-explore them)
- What was tried and didn't work (if relevant)
- The specific remaining work
