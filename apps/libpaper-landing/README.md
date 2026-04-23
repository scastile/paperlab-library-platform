# LibPaper Landing

Landing page for [lib.paperlab.xyz](https://lib.paperlab.xyz) — AI tools built for libraries.

## Products

1. **Library Launchpad** — AI-powered promotional campaigns (live at [launchpad.paperlab.xyz](https://launchpad.paperlab.xyz))
2. **Escape Room Designer** — Complete escape room concepts with puzzles, props, and game master sheets
3. **Event Flyer Studio** — Print-ready flyers from a description, powered by AI image generation
4. **LibPDF** — 50+ PDF tools (merge, split, OCR, convert, sign) hosted for libraries

## Setup

Static HTML — no build step. Served with Python's HTTP server on port 8202 behind a Cloudflare tunnel.

```bash
# Local dev
python3 -m http.server 8202

# Production (systemd)
systemctl start libpaper-landing
```

## Design

Matches the Library Launchpad design system:
- Inter font, purple (#6366f1) accent
- Dark mode toggle (light default)
- Card-lift hover style
- PaperLab branded footer

## Infrastructure

- **Server:** localhost:8202
- **DNS:** lib.paperlab.xyz → Cloudflare tunnel → localhost:8202
- **Tunnel:** cloudflared (config at `~/.cloudflared/config.yml`)
