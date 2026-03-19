---
name: start
description: Initialize the productivity system and orient the user. Use when setting up the plugin for the first time, or when the user wants an overview of the available skills and capabilities.
---

# Start Command

> If you see unfamiliar placeholders or need to check which tools are connected, see [CONNECTORS.md](../../CONNECTORS.md).

Initialize the task and memory systems and orient the user.

## Instructions

### 1. Check What Exists

Check the Obsidian vault (via Obsidian MCP) for:
- `memory/AGENTS.md` — compiled hot cache (the key indicator that memory is set up)
- `log/daily/` — daily notes
- `people/` — people profiles
- `efforts/` — effort tracking

### 2. Orient the User

**If memory is already set up** (AGENTS.md exists):

```
Your tasks and memory are loaded.

**Foundation skills:**
- /productivity:review — triage stale efforts and cycles
- /productivity:bootstrap — re-scan sources and rebuild memory

**Always-on capabilities:**
- Task management — "what's on my plate", "capture this", "plan my day"
- Memory — I decode your shorthand, remember your people and projects
- Effort tracking — "start an effort", "log progress", "pause X"

**Workflow skills** (shutdown, sync, update) are configured per-vault.
Check your vault's commands or CLAUDE.md for what's available here.
```

**If memory is not set up** (AGENTS.md missing):

```
The productivity system needs to be set up before it's useful.

Run /productivity:bootstrap — it will scan your Linear, Slack, Gmail, Calendar,
and Obsidian vault to build your memory system from scratch.

This only needs to be done once.
```

## Notes

- If memory is already initialized, this just orients the user
- The detailed memory setup lives in `/productivity:bootstrap` — don't duplicate it here
- `memory/AGENTS.md` is the canonical indicator that bootstrap has been run
