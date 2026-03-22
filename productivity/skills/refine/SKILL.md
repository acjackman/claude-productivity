---
name: refine
description: Discover and clarify the details of an effort through structured conversation. Use when an effort is vague, when the user says "flesh this out", "help me think through this", "what am I missing", or before decomposition when the goal isn't clear enough to break down.
user-invocable: true
---

# Refine

A structured interview that helps you think through an effort before committing to a plan. This is the "clarify" step — the bridge between a vague idea and something concrete enough to decompose and execute.

## Arguments

`$ARGUMENTS` identifies the effort to refine, or describes a new idea.

## Why this exists

Most efforts stall not because the work is hard, but because the *thinking* wasn't done up front. Common failure modes:

- **Scope creep** — no clear boundary, work expands indefinitely
- **False starts** — diving into implementation before understanding the problem
- **Blocked by ambiguity** — can't decide what to do because the goal isn't clear
- **Missing stakeholders** — someone who needs to know wasn't consulted

Refinement surfaces these issues *before* you start, when they're cheap to address.

## Refinement framework

The interview follows a structured but conversational flow. Don't dump all questions at once — ask 1-2 per round, listen, then go deeper based on answers.

### Phase 1: Outcome (what does done look like?)

Start here. Everything else follows from a clear outcome.

- "If this effort succeeds, what's different? What exists that doesn't exist now?"
- "How will you know it's done? What's the test?"
- "Is there a deadline, or is this open-ended?"
- "What's the appetite — how much time/effort is this worth?" (Shape Up concept: timebox the investment)

**Write to effort:** `## Goal` — 1-3 sentences capturing the outcome.

### Phase 2: Scope (what's in, what's out?)

Scope prevents the effort from growing unbounded.

- "What's explicitly *not* part of this?"
- "Is there a simpler version that would still be valuable?" (MVP thinking)
- "Are there related things you're tempted to include but shouldn't?"

**Write to effort:** `## Scope` — include both "in scope" and "out of scope" lists.

### Phase 3: Stakeholders (who's involved?)

- "Who needs to know about this?"
- "Who has context you need?"
- "Who could block this?"
- "Does this need approval or review from anyone?"

**Write to effort:** Add to `## Links` or `## Context` — people references as `[[people/name]]` wikilinks.

### Phase 4: Unknowns (what could change the plan?)

This is the most valuable phase. Unknowns that aren't surfaced become surprises later.

- "What's the biggest thing you're unsure about?"
- "Is there anything you need to learn before you can start?"
- "What could make this effort unnecessary?" (assumption check)
- "What's the riskiest part?"
- "Have you done something like this before? What went wrong last time?"

**Write to effort:** `## Open Questions` — each unknown as a bullet with context.

### Phase 5: Prior art (what exists already?)

- "Has anyone tried this before?"
- "Is there existing code, docs, or decisions that constrain the approach?"
- "Are there tools or patterns we should use or avoid?"

**Write to effort:** Add to `## Links` — references to prior art, decisions, relevant code.

## Instructions

1. **Read the effort** (if one exists) or create one via `/effort-create` if refining a new idea.

2. **Assess what's already clear** — skip phases that are already answered in the effort file.

3. **Run the interview** — go through phases conversationally. Capture answers in real time by patching the effort file after each phase.

4. **Summarize at the end:**
   > Here's where we landed on **<effort>**:
   > - **Goal:** <1 sentence>
   > - **Scope:** <in/out>
   > - **Unknowns:** <N open questions>
   > - **Next:** Ready to decompose, or still has open questions?

5. **Offer next steps:**
   - "Ready to break this down?" → `/effort-decompose`
   - "Want to start on it?" → suggest status `active`
   - "Want to hand part of it off?" → `/handoff`
   - "Still thinking?" → leave as `planning`, set `review_after`

## When to use refine vs decompose

| State | Use |
|---|---|
| "I have a vague idea" | `/refine` first, then `/effort-decompose` |
| "I know what to do but need to break it into steps" | `/effort-decompose` directly |
| "I'm not sure if this is one effort or three" | `/refine` — scope phase will reveal structure |
| "I started but I'm stuck" | `/refine` — unknowns phase surfaces what's blocking |

## Mapping to known practices

| Phase | GTD | Shape Up | Agile | Engineering |
|---|---|---|---|---|
| Outcome | "What's the desired outcome?" | "What's the appetite?" | "As a user, I want..." | Requirements |
| Scope | "What's the next action?" | "Fixed time, variable scope" | Story points / MVP | Design constraints |
| Stakeholders | "Waiting for" list | "Circuit breaker" (who can cancel) | Stakeholder mapping | RACI |
| Unknowns | N/A | "Rabbit holes" | Spike stories | Risk register |
| Prior art | Reference material | "Existing system" analysis | Tech debt review | Architecture review |

The framework is intentionally lightweight — it works for a 10-minute conversation, not a week-long planning process.
