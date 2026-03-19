---
id: ADR-0001
title: Foundation-only plugin architecture
status: accepted
created: 2026-03-19
---

# ADR-0001: Foundation-only plugin architecture

## Context

This plugin is a fork of [Anthropic's productivity plugin](https://github.com/anthropics/knowledge-work-plugins/tree/main/productivity), which provides task management (`TASKS.md`), two-tier workplace memory (`CLAUDE.md` + `memory/`), and a visual dashboard. It's designed as a general-purpose starting point.

Our fork replaces the flat-file model with an **Obsidian vault architecture**: structured daily notes (`log/daily/`), a multi-step effort model (`efforts/`) with status lifecycle and datetime IDs, cycle notes for sprint tracking (`log/cycles/`), and people/glossary files for rich workplace memory. The Obsidian MCP is the primary interface for all vault operations.

The plugin needs to work across multiple vaults (e.g. a work vault and a personal vault) with the same foundation but different workflow cadences.

## Decision

The plugin provides **foundation capabilities only**:

| Skill | Purpose |
|-------|---------|
| `task-management` | Bullet journal task model, daily note structure, effort schema |
| `memory-management` | Two-tier memory system — hot cache (`memory/AGENTS.md`) + full vault |
| `review` | On-demand triage of stale efforts and cycles |
| `bootstrap` | First-run setup — source scanning, config collection, vault verification |
| `start` | System orientation |

**Workflow skills** — the cadence-specific automation (morning sync, mid-day refresh, end-of-day shutdown) — are configured **per-vault**, not bundled in the plugin. Each vault defines its own workflow commands that build on the foundation's conventions.

## Consequences

- The plugin can be installed **globally** since it has no vault-specific or time-of-day assumptions. Vault selection happens at the environment level.
- Each vault can have its own shutdown cadence, standup format, and review schedule without plugin changes.
- Workflow Config is minimal: `linear_org`, `linear_team`, `team_channels`, `github_org`, and an optional `review_interval`.
- The README documents the "Writing workflow skills" pattern with examples for vault authors.
