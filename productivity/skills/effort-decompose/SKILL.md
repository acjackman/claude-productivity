---
name: effort-decompose
description: Break an effort into concrete next steps. Use when the user says "break this down", "decompose", "plan this effort", or when an effort is in idea/planning status and needs structure before work begins.
user-invocable: true
---

# Effort Decompose

Transforms a vague or high-level effort into actionable work. This is the bridge between "I should do something about X" and "here are the specific things to do."

## Arguments

`$ARGUMENTS` identifies the effort — by name, slug, wikilink, or description.

## Philosophy

Decomposition follows the same pattern whether you're breaking down a software task, an operational project, or a personal initiative:

1. **Clarify the outcome** — what does "done" look like?
2. **Identify unknowns** — what do you need to learn before you can act?
3. **Find the first concrete step** — what can you do right now?
4. **Sequence the rest** — what depends on what?

This maps to standard practices:
- **GTD**: Clarify → identify next action → sequence project steps
- **Shape Up**: Define the appetite (how much time), then find the elements and risks
- **Agile**: Story → acceptance criteria → task breakdown
- **Engineering**: Spike unknowns first, then build in dependency order

The skill doesn't impose a framework — it follows the effort's natural grain.

## Instructions

1. **Read the effort** via `read_note`. Understand:
   - The **## Goal** (or infer from title + context)
   - Any existing **## Next Steps** or **## Approach**
   - The current status (`idea`, `planning`, `active`)
   - Any **## Open Questions** already captured
   - Links to Linear tickets, RFCs, or related efforts

2. **Assess readiness** — is this effort ready to decompose, or does it need refinement first?

   **Ready to decompose** (has a clear goal, scope is bounded):
   - Proceed to step 3

   **Needs refinement first** (vague goal, unclear scope, many unknowns):
   - Say: "This effort needs some clarification before I can break it down. Let me ask a few questions..."
   - Run the refinement interview (see Refinement section below)
   - Then proceed to step 3 with the answers

3. **Propose next steps.** Write a structured `## Next Steps` section:

   ```markdown
   ## Next Steps
   - [ ] **Spike: <unknown>** — research/investigate before committing to an approach
   - [ ] <concrete task 1> — <why this is needed>
   - [ ] <concrete task 2> — <depends on task 1>
   - [ ] <concrete task 3>
   - [ ] **Checkpoint:** <review point before continuing>
   ```

   Guidelines:
   - **Lead with spikes** — unknowns that could change the plan go first
   - **Include checkpoints** — natural review points where direction might change
   - **Right-size tasks** — each should be completable in a single working session (1-4 hours)
   - **Note dependencies** — if B depends on A, say so
   - **Don't over-decompose** — 5-10 steps is usually right. If you need more, the effort might need sub-efforts
   - **Mark the first action** — bold or call out what to do *right now*

4. **Present the plan for approval:**
   > Here's how I'd break down **<effort title>**:
   >
   > [proposed next steps]
   >
   > The first thing to do is: **<first step>**
   >
   > Want me to write this to the effort? Anything to change?

5. **On approval**, write to the effort via `patch_note`:
   - Add or replace `## Next Steps`
   - If unknowns surfaced, add `## Open Questions`
   - If status is `idea`, suggest moving to `planning` or `active`

6. **Offer follow-up:**
   - "Want to start on the first step now?"
   - "Should I create a Linear ticket for this?"
   - "Want to hand off any of these steps?" → `/handoff`

## Refinement (inline)

When the effort isn't clear enough to decompose, ask targeted questions. Don't dump all questions at once — go conversationally:

**Round 1 — Outcome:**
- "What does done look like for this effort?"
- "Is there a deadline or timebox?"

**Round 2 — Scope:**
- "What's explicitly out of scope?"
- "Who else is involved or needs to know?"

**Round 3 — Unknowns:**
- "What's the biggest thing you're unsure about?"
- "Is there anything you need to learn or decide before starting?"

Capture answers into the effort file as you go (## Goal, ## Scope, ## Open Questions).

## Sub-efforts

If decomposition reveals the effort is actually 2-3 distinct efforts:
- Suggest splitting: "This looks like two separate efforts: X and Y"
- Offer to create sub-efforts via `/effort-create` with `efforts` frontmatter linking to the parent
- Keep the parent as the coordination point

## Examples

**Well-scoped effort:**
```
/effort-decompose [[20260318211939|Phoenix DB Migration]]
```
→ Reads effort, sees clear goal ("migrate to PG 16 with zero downtime"), proposes: spike replication lag → test rollback → schedule window → execute → verify → close

**Vague effort:**
```
/effort-decompose "improve API performance"
```
→ "This is broad — let me ask a few questions. What's slow? Is there a target latency? Which endpoints?"
→ After refinement: profile top 5 endpoints → identify bottlenecks → fix top 3 → benchmark → ship
