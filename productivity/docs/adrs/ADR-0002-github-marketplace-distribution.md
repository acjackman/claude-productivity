---
id: ADR-0002
title: GitHub marketplace distribution
status: accepted
created: 2026-03-19
---

# ADR-0002: GitHub marketplace distribution

## Context

The plugin is used in both Cowork (desktop app) and Claude Code (CLI). It needs a single source of truth that both environments can consume without manual packaging or sync steps.

Cowork supports registering a private GitHub repo as a marketplace source, which it syncs automatically on push.

## Decision

Distribute via a **private GitHub repo** registered as a Cowork marketplace. The deploy workflow is `git push`.

- **Cowork**: Marketplace source pointed at the repo. Syncs automatically.
- **Claude Code**: Install directly from the repo path.

## Consequences

- Single source of truth — both environments read from the same repo.
- No packaging step, no zip files, no manual uploads.
- The repo must be **private** — Cowork's GitHub marketplace sync requires private or internal repos.
- Cowork sync can take up to 30 minutes after push.
