# Productivity Foundation Plugin

A foundation plugin for [Claude Code](https://claude.ai/code) and [Cowork](https://claude.com/product/cowork). Task management, workplace memory, effort tracking, and review — backed by an Obsidian vault. Claude learns your people, projects, and terminology so it can act like a colleague, not a chatbot.

**This is a foundation plugin.** It provides the core vault conventions, memory system, and effort model. Workflow skills (shutdown, sync, update) that dictate *when* and *how often* things happen are configured per-vault, not bundled here — different vaults can have different cadences.

## Installation

### Cowork (desktop app)

Add the GitHub repo as a private marketplace: Cowork → Customize → "+" → "Add marketplace from GitHub" → `acjackman/claude-productivity`. The repo must be private. Cowork syncs automatically on push.

**Note:** Slack MCP is currently only available in Cowork. Use Cowork when you need Slack-sourced data.

### Claude Code (CLI)

```bash
claude plugin install --path /path/to/this-repo
```

The plugin uses Obsidian MCP for vault access, so it works regardless of your current working directory.

### MCP server setup

The plugin ships with a local MCP server (`productivity-mcp`) that extends [mcpvault](https://github.com/bitbonsai/mcpvault) with domain-specific tools for daily notes, efforts, and memory. Install it the same way you'd install mcpvault:

```bash
# From the repo root
mise run install
```

This builds the TypeScript and installs the `productivity-mcp` binary globally under mise's Node, creating a shim at `~/.local/share/mise/shims/productivity-mcp`.

Set your vault path so the plugin can find it:

```bash
# Add to your shell profile (~/.zshrc, ~/.bashrc, etc.)
export OBSIDIAN_VAULT="$HOME/path/to/your/vault"
```

The plugin's `.mcp.json` is already configured to use `productivity-mcp` with `$OBSIDIAN_VAULT`. After install, verify it works:

```bash
~/.local/share/mise/shims/productivity-mcp --version
```

If Claude Code can't resolve `productivity-mcp` from PATH, add a user-level MCP override in `~/.claude.json` with the full shim path (same pattern as mcpvault):

```bash
claude mcp add --scope user obsidian \
  ~/.local/share/mise/shims/productivity-mcp ~/path/to/vault
```

To update after pulling changes:

```bash
mise run install
```

### Local development

```bash
# Run the MCP server in dev mode (tsx, no build step)
mise run dev

# Run tests
mise run test

# Launch the MCP Inspector against the test vault
mise run inspect

# Start a Claude Code session with the test vault
claude --mcp-config test/mcp-config.json
```

## What It Does

This plugin gives Claude a persistent understanding of your work:

- **Task management** — Bullet journal-style daily logs in Obsidian. Active Linear tickets, efforts, and incidents surface in your daily note's `## Open` section.
- **Workplace memory** — A two-tier memory system that teaches Claude your shorthand, people, projects, and terminology. Say "ask todd to do the PSR for oracle" and Claude knows exactly who, what, and which deal.
- **Effort tracking** — Multi-step work items tracked in `efforts/` with status lifecycle, stale detection, and on-demand review.
- **Review** — Interactive triage of stale efforts and cycles. Run whenever you want to clean up your backlog.

## Skills

| Skill | Invocable | What it does |
|-------|-----------|--------------|
| `bootstrap` | Yes | First-run setup — scans all connected sources, builds memory, collects config |
| `start` | Yes | Orient user to the system and available capabilities |
| `review` | Yes | Triage stale efforts and cycles — interactive status updates |
| `memory-management` | No | Two-tier memory system — hot cache + full vault |
| `task-management` | No | Bullet journal task model in Obsidian daily logs |

## Setup

1. **Run bootstrap:** `/productivity:bootstrap`
2. Bootstrap verifies your vault structure, checks MCP connections, and prompts for your **Workflow Config**:

| Key | Description | Example |
|-----|-------------|---------|
| `linear_org` | Linear organization slug | `moov` |
| `linear_team` | Linear team prefix for ticket IDs | `INFRA` |
| `team_channels` | Slack channels to monitor | `#team-infra, #org-infra` |
| `github_org` | GitHub organization | `moovfinancial` |
| `review_interval` | Days between effort reviews (optional) | `7` |

These values are stored in `memory/AGENTS.md` under `## Workflow Config` and referenced by all skills at runtime.

## Data Sources

Connect your communication and project management tools via MCP for the best experience. See [CONNECTORS.md](CONNECTORS.md) for the full list.

**Supported:** Slack, Gmail, Google Calendar, Notion, Linear, GitHub, Obsidian.

The plugin works with whatever is connected — Obsidian is required, everything else enhances the experience. Run bootstrap to verify your connections.

## Writing Workflow Skills

The foundation plugin handles *what* gets tracked. Workflow skills handle *when* things happen — morning sync, mid-day refresh, end-of-day shutdown. These live per-vault because different contexts have different cadences.

### Where to put them

Workflow skills are vault-level Claude Code commands:

```
<vault>/.claude/commands/shutdown.md
<vault>/.claude/commands/sync.md
<vault>/.claude/commands/update.md
```

Or as Cowork skills in a vault-specific plugin.

### What they typically do

**Shutdown** (end of day):
- Collect activity from Linear, Slack, GitHub, Gmail, Calendar
- Fill `## Summary` in today's daily note
- Create tomorrow's daily note with `## Open` pre-populated
- Set `last_reviewed` on today's note

**Sync** (morning):
- Catch overnight activity (new PRs, Slack messages, Linear updates)
- Update `## Open` in today's daily note
- Draft standup or other recurring comms

**Update** (mid-day):
- Quick refresh of `## Open` checkboxes from Linear/GitHub
- Regenerate `memory/AGENTS.md` from vault contents

### What they can reference

Workflow skills build on the foundation's conventions:
- **Task format** and daily note structure from `task-management`
- **Memory system** from `memory-management` (AGENTS.md, glossary, people/)
- **Effort model** — status lifecycle, `review_after`, frontmatter schema
- **Workflow Config** values in `memory/AGENTS.md`
- **Review** — workflow skills can invoke `/productivity:review` or implement their own review cadence

### Example: minimal shutdown

```markdown
# Shutdown

End-of-day wrap-up.

## Instructions

1. Read today's daily note from `log/daily/YYYY-MM-DD.md` via Obsidian MCP
2. Collect activity from connected sources (Linear, Slack, GitHub)
3. Fill `## Summary` with a digest of the day
4. Create tomorrow's daily note with `## Open` pre-populated from:
   - Active Linear issues assigned to me
   - Open PRs needing review
   - Active efforts (status: active/planning/waiting/blocked)
5. Set `last_reviewed` to today on the current daily note
```

## Contributing

### Skill file conventions

Each skill lives at `skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: One sentence. Include trigger keywords so the skill auto-activates correctly.
user-invocable: true   # omit or false for skills only called by other skills
---
```

Write skills as instructions to the agent, not as documentation for humans. Use imperative language ("Read X", "Scan Y for Z", "If not found, ask"). Be explicit about which MCP tools to use.

### Deploying

Push to `main`. Cowork syncs the repo automatically (can take up to 30 minutes). For Claude Code, reinstall from the local path.

### Version bumping

Bump the version in `.claude-plugin/plugin.json` when making meaningful changes:
- Patch (x.y.**Z**) — bug fixes, wording improvements
- Minor (x.**Y**.0) — new behavior, new skill, schema additions
- Major (**X**.0.0) — breaking changes to the effort model or conventions

### ADR pattern

Design decisions live in the vault at `decisions/DEC-NNNN-slug.md`. Check existing ADRs before making structural changes. Include Context, Decision, and Consequences sections.

## License

MIT
