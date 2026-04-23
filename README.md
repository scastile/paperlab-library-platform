# PaperLab Library Platform

Unified AI-powered toolkit for public libraries.

## Apps

| App | Port | URL | Description |
|-----|------|-----|-------------|
| **Library Launchpad** | 8200 | launchpad.paperlab.xyz | AI promotional campaigns & display themes |
| **Escape Room Designer** | 8203 | escape.paperlab.xyz | Escape room concepts, puzzles, props |
| **Event Flyer Studio** | 8204 | flyer.paperlab.xyz | AI-generated print-ready event flyers |
| **LibPaper Landing** | 8202 | lib.paperlab.xyz | Unified product landing page |

## Quick Start

Requires Docker, Docker Compose, and the external `papercore` network:

```bash
docker network create papercore

cd /opt/projects/paperlab-library-platform
docker compose up -d --build
```

## Architecture

- **Auth**: Supabase (self-hosted at `10.0.0.179:8001`)
- **Credits**: Library Launchpad backend is the credit authority; other apps proxy to it
- **Network**: All backends attach to the external `papercore` Docker network for internal communication
- **AI**: OpenRouter (`google/gemini-2.5-flash-lite` / `google/gemini-2.5-flash-image`)

## Repo History

This monorepo consolidates four previously separate projects:
- `scastile/library-launchpad`
- `scastile/libpaper-landing`
- `escape-room-designer` (previously unversioned)
- `event-flyer-studio` (previously unversioned)
