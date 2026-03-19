# Connectors

## Supported Tools

This plugin works with common workplace tools via MCP servers. The `.mcp.json` pre-configures connections for each category.

## Connectors

| Category | Tool | MCP Server | Required? |
|----------|------|------------|-----------|
| Chat | Slack | slack | Recommended |
| Email | Gmail | gmail | Optional |
| Calendar | Google Calendar | google-calendar | Optional |
| Long-term docs / wiki | Notion | notion | Optional |
| Project tracker + project docs | Linear | linear | Recommended |
| Source control | GitHub | github | Optional |
| Personal notes / deep memory | Obsidian | obsidian | Required |

The plugin works with whatever is connected — more sources give richer context but none (except Obsidian) are strictly required. Run `/productivity:bootstrap` to verify which connections are active.
