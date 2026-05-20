# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup & Run

```bash
cp .env.local.example .env.local   # configure backend path
npm install
npm run dev                         # http://localhost:3000
npm run build                       # production build check
npm run lint
```

## Environment Variables (`.env.local`)

| Variable | Default | Description |
|---|---|---|
| `AGENT_BIN_PATH` | `/Users/wylee/WorkspacesV2/AgentFromScratch/bin/agent` | Path to `bin/agent` CLI |
| `AGENT_RUN_DIR` | `/tmp/afs-runs` | Run-dir for `agent ask` |
| `AGENT_AUDIT_LOG` | `/tmp/afs.jsonl` | Audit log for `agent ask` |
| `AGENT_WORKFLOW_RUN_DIR` | `/tmp/afs-wf` | Run-dir for `agent workflow` |
| `AGENT_WORKFLOW_AUDIT_LOG` | `/tmp/afs-wf.jsonl` | Audit log for `agent workflow` |

## Architecture

**Next.js 14 App Router** + TypeScript + Tailwind CSS + shadcn/ui. Dark terminal-aesthetic design.

```
app/
  page.tsx                  # Chat interface — agent ask
  status/page.tsx           # Run status monitor (live polling)
  audit/page.tsx            # Audit log viewer (JSONL table)
  workflow/page.tsx         # Workflow runner (patent asset workflow)
  schema/page.tsx           # Oracle ADW schema inspector
  layout.tsx                # Sidebar nav + global layout
  globals.css               # Tailwind base + dark theme tokens

  api/agent/
    ask/route.ts            # POST → spawns bin/agent ask subprocess
    status/route.ts         # GET  → reads latest run status JSON
    audit/route.ts          # GET  → reads + parses audit JSONL
    workflow/route.ts       # POST → spawns bin/agent workflow subprocess

components/                 # Shared UI components (shadcn/ui based)
lib/                        # Utilities (cn helper, etc.)
```

All API routes spawn the `bin/agent` CLI subprocess and return parsed JSON. No direct Python/DB connection from the UI layer.

## Change Log

| Date | Change |
|---|---|
| 2026-05-20 | Initial project setup — Next.js 14, all 5 pages and 4 API routes, dark UI theme |
| 2026-05-20 | Fix: backend `bin/agent` upgraded to Python 3.13 (workspace requires >=3.13); `pyproject.toml` updated accordingly |
| 2026-05-20 | Fix: chat page extracts `final_answer.content` correctly; error messages shown in readable `ErrorCard` instead of raw red bubble |
| 2026-05-20 | Feat: `postinstall` script auto-creates `.env.local` from `.env.local.example` on `npm install` |
| 2026-05-20 | Fix: API routes set `cwd=AGENT_PROJECT_DIR` and `UV_CACHE_DIR` so `uv` resolves the correct venv instead of `/Users/wylee/.venv` |
| 2026-05-20 | Fix: parse full stdout as JSON (not last line) — agent outputs pretty-printed multi-line JSON; last-line parse returned `}` causing raw fallback |
| 2026-05-20 | Improve: readability — muted-foreground brighter (0.55→0.70), message/answer text text-base, action reason text-sm, suggested buttons text-sm |
