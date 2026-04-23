# Library Launchpad

AI-powered marketing generator for libraries. Enter a topic, get a full promotional campaign — displays, shelf talkers, escape rooms, social media posts, signage, and program ideas.

## Features

- **Topic Search** — enter any topic (book, movie, game, theme, event)
- **Media Lookup** — finds relevant books, movies, and media via Open Library
- **AI Card Generation** — 6-8 promotion ideas per topic across multiple formats
- **Pin & Reroll** — lock favorites, regenerate the rest individually or in bulk
- **Save Campaigns** — persist entire card sets, reload anytime
- **Save Esacpe Room Plans** - persist after purchase, reload anytime
- **Image Generation** — optional AI-generated display mockup images
- **Export** — download campaigns as PDF for print-ready use

## Card Types

| Type | Description |
|------|-------------|
| Display Theme | Layout idea, title, materials list |
| Shelf Talker | Punchy 2-3 sentence shelf card copy |
| Escape Room | Concept, puzzle flow, difficulty, time |
| Social Media | Platform-specific posts (IG, FB, TikTok) |
| Signage/Flyer | Headline, subtext, call-to-action |
| Program Idea | Event concept, audience, duration, supplies |

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: SQLite (upgradeable to Postgres)
- **AI**: Claude via OpenRouter for text, FLUX for images
- **Book Data**: Open Library API (free)
- **Deploy**: Docker + Cloudflare Tunnel

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## License

MIT
