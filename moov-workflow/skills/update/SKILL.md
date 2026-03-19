---
name: update
description: Mid-day state pull — refreshes Open checkboxes from Linear and GitHub without doing a full sync. Use during the day when you want to check off resolved items or catch a newly assigned ticket.
---

# Mid-Day Update

> See [CONNECTORS.md](../../CONNECTORS.md) for available tools.
> Requires the **productivity** foundation plugin for task model conventions.

A lightweight pull of current tool state into today's note. Useful when you've been heads-down and want to quickly sync what's been resolved or newly assigned without running a full shutdown or sync.

## What it does

- Fetches current Linear issue status for all items in today's `## Open`
- Checks off any that are now Done or Canceled: `- [ ]` → `- [x]`
- Appends any newly assigned Linear issues not yet in `## Open`
- Checks off any PRs in `## Open` that have merged
- Appends any new `#inc-*` channels opened since morning sync

## What it does not do

- Does not touch `## Log`, `## Plan`, `## Capture`, or `## Summary`
- Does not gather Slack activity or Gmail
- Does not draft or update the standup
- Does not create tomorrow's note
- Does not regenerate AGENTS.md

## Usage

Safe to run at any point during the day. Idempotent — running it twice won't duplicate entries.

## Report

```
Update complete:
- 2 Linear issues checked off (INFRA-4366 done, INFRA-4418 done)
- 1 new issue added (INFRA-4421 assigned)
- 1 PR checked off (#41158 merged)
```
