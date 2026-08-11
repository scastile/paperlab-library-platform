# PaperLab Library Platform

Unified AI-powered toolkit for public libraries.

## Apps

| App | Port | URL | Description |
|-----|------|-----|-------------|
| **Library Launchpad** | 8200 | launchpad.paperlab.xyz | AI promotional campaigns & display themes |
| **LibPaper Landing** | 8202 | lib.paperlab.xyz | Homepage + all tools (same-origin) |
| **Escape Room Designer** | — | lib.paperlab.xyz/escape-room | Escape room concepts, puzzles, props |
| **Event Flyer Studio** | — | lib.paperlab.xyz/flyer-studio | AI-generated print-ready event flyers |
| **Event Planner** | — | lib.paperlab.xyz/event-planner | Library program planning & task checklists |

Escape Room, Flyer Studio, and Event Planner are **pages inside the landing SPA** at
`lib.paperlab.xyz` (their backends are separate containers proxied by the landing nginx).
Only Launchpad has its own subdomain.

## Quick Start

Requires Docker, Docker Compose, and the external `papercore` network:

```bash
docker network create papercore

cd /opt/projects/paperlab-library-platform
docker compose up -d --build
```

## Architecture

- **Auth**: PocketBase (self-hosted at `10.0.0.179:8070`, container `pocketbase`)
- **Credits**: Library Launchpad backend is the credit authority; other apps proxy to it
- **Network**: All backends attach to the external `papercore` Docker network for internal communication
- **AI**: OpenRouter (`google/gemini-2.5-flash-lite` / `google/gemini-2.5-flash-image`)

## Repo History

This monorepo consolidates four previously separate projects:
- `scastile/library-launchpad`
- `scastile/libpaper-landing`
- `escape-room-designer` (previously unversioned)
- `event-flyer-studio` (previously unversioned)
