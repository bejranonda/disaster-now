# CLAUDE.md

@AGENTS.md

All guidance for AI assistants is in [AGENTS.md](AGENTS.md), so every tool reads the same rules. If the import didn't load, read AGENTS.md first.

## Claude Code specifics

- **Cloud sessions:** run browser checks with `CHROME_PATH=/opt/pw-browsers/chromium`; don't run `playwright install`. GitHub work goes through the GitHub MCP tools (no `gh`).
- **Scratch work** (probes, downloads, screenshots) goes in the session scratchpad, never the repository root.
- **If a permission is denied,** don't look for another route to the same result; finish the rest and tell the owner what is needed.
