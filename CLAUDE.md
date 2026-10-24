# CLAUDE.md

@AGENTS.md

All guidance for AI assistants is in [AGENTS.md](AGENTS.md), so every tool reads the same rules. If the import didn't load, read AGENTS.md first.

## Claude Code specifics

- **Cloud sessions:** run browser checks with `CHROME_PATH=/opt/pw-browsers/chromium`; don't run `playwright install`. GitHub work goes through the GitHub MCP tools (no `gh`).
- **On a server,** run `npm run preflight` first. **If it says FloodWatch runs on this host, stop:** that is FloodWatch's production machine, the wrong server for this app (D-040). This project's Docker leftovers were removed from it on 24 Oct 2026; the owner deletes the checkout (OWNER_ACTIONS A11). Never touch the `floodwatch-*` containers.
- **On `autobahn-bot`** (the collector's host since 24 Oct 2026, beside BrainPlatform's production `deploy-*` containers: never touch them): Node 24, Chromium at `/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, no numpy (research makes a venv in the scratchpad and runs with `nice -n 19`). Don't print `.env` values: `node tools/env-check.mjs` shows states only.
- **Scratch work** (probes, downloads, screenshots) goes in the session scratchpad, never the repository root.
- **If a permission is denied,** don't look for another route to the same result; finish the rest and tell the owner what is needed.
