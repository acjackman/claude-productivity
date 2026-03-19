---
name: bootstrap
description: First-run setup for the productivity system. Scans Slack, Gmail, Linear, Calendar, and existing Obsidian notes to build the memory system from scratch — decoding workplace shorthand, mapping people, and populating the vault.
---

# Bootstrap Command

> If you see unfamiliar placeholders or need to check which tools are connected, see [CONNECTORS.md](../../CONNECTORS.md).

First-run initialization of the productivity system. This is a comprehensive, interactive process that verifies the vault structure, scans all connected sources, and builds a rich understanding of the user's workplace — people, terms, projects, and conventions.

Run this once. After that, workflow skills (configured per-vault) keep everything current.

### Workflow Config

The first thing bootstrap does after verifying vault structure is collect the user's team-specific configuration. These values drive all skills:

| Key | Description | Example |
|-----|-------------|---------|
| `linear_org` | Linear organization slug (from URL) | `moov` |
| `linear_team` | Linear team prefix for ticket IDs | `INFRA` |
| `team_channels` | Slack channels to monitor | `#team-infra, #org-infra` |
| `github_org` | GitHub organization | `moovfinancial` |
| `review_interval` | Days between effort reviews (optional, default: 7) | `7` |

Prompt the user for each value and write them to `memory/AGENTS.md` under a `## Workflow Config` heading:

```markdown
## Workflow Config
- linear_org: moov
- linear_team: INFRA
- team_channels: #team-infra, #org-infra
- github_org: moovfinancial
- review_interval: 7
```

## Usage

```bash
/productivity:bootstrap
```

## Instructions

### 1. Create Today's Daily Note

Before anything else, ensure today's daily note exists in `log/daily/` via Obsidian MCP. This note is where verification tasks and bootstrap findings will be captured. Use the template structure from the task-management skill if creating from scratch.

### 2. Verify Vault Structure

Check that the expected folders exist in the Obsidian vault via MCP (`list_directory` or `read_note` probes). Create any that are missing:

| Folder | Purpose |
|--------|---------|
| `memory/` | Agent memory files |
| `memory/context/` | Company context |
| `people/` | People profiles |
| `efforts/` | Multi-step effort tracking |
| `decisions/` | Architecture Decision Records |
| `log/daily/` | Daily notes |
| `log/cycles/` | Linear cycle notes |
| `comms/` | Meeting notes, draft communications |
| `+/` | Inbox / unorganized notes |
| `z/templates/` | Obsidian templates |

### 3. Verify Templates

Check that the required templates exist in `z/templates/`:

| Template | File | Target folder |
|----------|------|---------------|
| Daily note | `z/templates/periodic-daily.md` | `log/daily/` |
| Cycle note | `z/templates/periodic-cycle.md` | `log/cycles/` |
| Effort | `z/templates/effort.md` | `efforts/` |
| Decision | `z/templates/decision.md` | `decisions/` |

If any are missing, warn the user — these templates need to be created before the system works properly.

**Templater bindings cannot be verified programmatically** (`.obsidian/` is inaccessible via MCP). Add a verification task to today's daily note `## Capture` section:

```markdown
- [ ] Verify Templater folder template bindings in Obsidian settings:
    - `log/daily/` → `z/templates/periodic-daily.md`
    - `log/cycles/` → `z/templates/periodic-cycle.md`
    - `efforts/` → `z/templates/effort.md`
    - `decisions/` → `z/templates/decision.md`
```

### 4. Check MCP Connections

Before scanning, verify which sources are actually reachable. Try a lightweight call to each:

| Source | Test call | Required? |
|--------|-----------|-----------|
| Obsidian | `get_vault_stats` | Yes — core to the system |
| Linear | List assigned issues | Recommended |
| Slack | Search channels | Recommended |
| GitHub | List PRs | Optional |
| Gmail | Get profile | Optional |
| Google Calendar | List calendars | Optional |
| Notion | Search docs | Optional |

Report what's connected and what's not. Skip unavailable sources gracefully — the system works with whatever is connected, and more sources can be added later.

### 5. Check Existing Memory Content

Read from the Obsidian vault via MCP:
- `memory/AGENTS.md` — compiled hot cache
- `memory/glossary.md` — decoder ring
- `memory/context/company.md` — company context
- `people/` — people profiles
- `efforts/` — effort tracking

If all of these exist and are populated, this has already been run. Confirm with the user:
```
It looks like the memory system is already set up:
- X people in people/
- X terms in memory/glossary.md
- X active efforts

Want me to re-scan everything anyway, or is this good?
```

### 6. Scan All Connected Sources

Gather data from every available MCP source. Cast a wide net:

**Linear:**
- Assigned issues (open and recently closed)
- Team members and assignments
- Project documents
- Cycle information

**Slack:**
- Recent messages in active channels
- DMs (recent, for people and context)
- Active incident channels (#inc- prefix)
- Channel names and purposes

**GitHub:**
- Open PRs authored by or assigned to user (from `github_org` in Workflow Config)
- Recent PR reviewers and collaborators

**Gmail:**
- Recent sent messages (for people and commitments)
- Recent received messages (for context)

**Google Calendar:**
- Recent and upcoming events (for people, meetings, cadences)
- Recurring meetings (for team processes)

**Notion:**
- Recently touched long-term docs
- Team wikis and documentation

**Obsidian vault:**
- Existing daily notes in `log/daily/`
- Existing efforts in `efforts/`
- Existing people in `people/`
- Any existing glossary content

### 7. Extract and Categorize

From all sources, build lists of:

**People** — anyone mentioned, messaged, or met with:
- Full name, nickname(s), role, team
- Communication style notes (if observable)
- Frequency of interaction

**Terms** — shorthand, acronyms, jargon:
- Acronyms and what they expand to
- Internal terms and their meanings
- Project codenames
- Process names

**Efforts/Projects** — active work:
- Project names and descriptions
- Key people involved
- Current status

**Processes** — recurring patterns:
- Meeting cadences
- Review processes
- Team rituals

### 8. Decode Interactively

Present findings grouped by confidence and ask the user to confirm or correct:

```
## People I Found (23 total)

High confidence — adding these directly:
| Name | Role | Source |
|------|------|--------|
| Mark Alexander | Engineering | Linear, Slack, Calendar |
| Morgan Hargrove | Engineering | Linear, Slack |

Need clarification:
1. **"Steve"** — appears in Slack DMs, 8 mentions. Who is Steve? (full name, role)
2. **"MJ"** — mentioned in Linear comments. Is this a person or abbreviation?

## Terms I Found (15 total)

High confidence:
| Term | Meaning | Source |
|------|---------|--------|
| P0 | Drop everything priority | Linear labels |

Need clarification:
1. **"the migration"** — referenced 12 times in Slack. What project is this?
2. **"ACH"** — is this the standard term or something company-specific?

## Projects/Efforts (8 total)

| Name | Description | Key People |
|------|-------------|------------|
| App migration | Referenced across Linear and Slack | ? |

What am I missing? What did I get wrong?
```

Work through each category, confirming high-confidence items and asking about unknowns. Skip terms already decoded in earlier rounds.

### 9. Write Memory Files

From everything gathered, write to the Obsidian vault via MCP:

**memory/glossary.md** — the full decoder ring:
```markdown
# Glossary

Workplace shorthand, acronyms, and internal language.

## Acronyms
| Term | Meaning | Context |
|------|---------|---------|

## Internal Terms
| Term | Meaning |
|------|---------|

## Nicknames → Full Names
| Nickname | Person |
|----------|--------|

## Project Codenames
| Codename | Project |
|----------|---------|
```

**memory/context/company.md** — tools, teams, processes (use the template from memory-management skill, populated with discovered information).

**people/{name}.md** — one file per person. Check existing files first — merge new info via `patch_note`, don't overwrite.

**efforts/{name}.md** — for active efforts not already tracked. Use the effort naming convention: `YYYYMMDDHHMMSS.md`, with frontmatter `type: effort`, `status`, `title`, `tags: [effort]`. See task-management skill for the full schema.

### 10. Generate memory/AGENTS.md

Compile the hot cache from everything gathered. This is the file agents read first for quick context. See memory-management skill for the exact format.

```markdown
# Agent Context

> Auto-generated by /productivity:bootstrap. Do not edit manually.
> Source of truth: the rest of this Obsidian vault.
> Last updated: YYYY-MM-DD

## Me
[Name], [Role] on [Team].

## People
(top ~30 by interaction frequency)

## Terms
(~30 most common)

## Active Efforts
(status: active only)

## Preferences
...
```

### 11. Report and Establish Working Agreement

```
Bootstrap complete:
- Vault: structure verified, X folders created
- Templates: all present (Templater binding verification task added)
- Connections: X/7 sources connected
- People: X profiles written (Y new, Z updated)
- Terms: X entries in glossary
- Efforts: X tracked
- AGENTS.md: compiled (X lines)
- Today's note: ready at log/daily/YYYY-MM-DD
```

Then explain how the system works going forward:

```
Here's how we'll work together:

**Foundation skills (always available):**
- /productivity:review — triage stale efforts and cycles
- /productivity:bootstrap — re-scan sources and rebuild memory (already done)
- /productivity:start — orient to the system

**Always-on capabilities:**
- Task management — capture, plan, review via daily notes
- Memory — I decode your shorthand, remember your people and projects
- Effort tracking — multi-step work in efforts/ with status lifecycle

**Workflow skills (per-vault):**
Workflow skills like shutdown, sync, and update are configured per-vault to match
your cadence. Check your vault's commands or CLAUDE.md for what's available here.

**What I maintain automatically:**
- memory/AGENTS.md (compiled from vault contents)
- Effort staleness detection (via /productivity:review)

**What you maintain:**
- ## Plan (your intentional work — I never touch this)
- ## Capture (your inbox during the day)
- ## Log (working memory blocks as you work)
- Reviewing and accepting decisions in decisions/
- Templater bindings in Obsidian settings

**Teaching me new things:**
- Say "remember X means Y" anytime
- Correct me when I get something wrong — I'll update the vault
- I'll ask when I hit terms I don't recognize

**Where things live:**
- Daily notes: log/daily/YYYY-MM-DD.md
- Efforts: efforts/YYYYMMDDHHMMSS.md
- Decisions: decisions/DEC-NNNN-slug.md
- People: people/full-name.md
- Memory: memory/AGENTS.md (hot cache), memory/glossary.md (full)
```

## Notes

- Always check existing vault content before writing — merge, don't overwrite
- Present findings for user confirmation before committing to the vault
- High-confidence items can be added directly; uncertain ones must be asked about
- The user's corrections are the most valuable data — pay close attention
- If a source isn't available (MCP not connected), skip it and note the gap
- This is meant to be run once — workflow skills handle ongoing maintenance
- The daily note must exist before adding verification tasks to it (Step 1 handles this)
