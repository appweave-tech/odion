# Odion · Community Ops

Mobile-first web app for **Odion The Woods of East** (Bangalore gated villa community).
First module: **Garbage Tracker** — residents log days the BBMP van skipped their villa, RWA gets data evidence.

Built by [Appweave](https://appweave.tech) as a community-visibility play. PRD lives in the Obsidian vault:
`~/Appweave/obsidian-vault/30-Products/Odion-Garbage-Tracker/PRD.md`.

## Stack

- Next.js 14 (App Router) + React 18
- Postgres via [`postgres`](https://github.com/porsager/postgres) — direct queries, no PostgREST
- Supabase project: **appweave-ops** (shared across ops-suite + ai-delivery-hub)
- Schema: **`odion`** (isolated from other Appweave apps)
- Tailwind v3 + Radix primitives (no full shadcn install — slim hand-rolled)
- Vercel hosting + cron

Copy into `.env.local` for local dev. **Never commit.**

## Setup

```bash
npm install
npm run migrate    # creates schema odion + tables in appweave-ops
npm run seed       # imports 114 villas from scripts/villas_seed.csv
npm run dev        # http://localhost:3010
```

## URLs

| Path | Purpose |
| --- | --- |
| `/` | Odion landing — module index |
| `/garbage` | Pick villa / mark today skipped / past 7 days |
| `/garbage/today` | Today's skip list + copy-WhatsApp message |
| `/garbage/history` | 180-day heatmap + per-day skip feed |
| `/garbage/villa/[label]` | Per-villa history (e.g. `/garbage/villa/P1-35`) |
| `/garbage/settings` | Change villa, name, clear device |
| `/garbage/admin` | Admin login (passcode) |
| `/garbage/admin/villas` | Verify auto-created villas, delete |
| `/insights` | Public dashboard — auto-classified RWA-chat topics, live issues, heatmap |
| `/insights/admin` | Upload WhatsApp export (`.zip` or `_chat.txt`), see ingest history |
| `/about` | About + Appweave footer |
| `/api/eod` | Daily 20:00 IST cron — returns digest JSON |

## Architecture notes

- **Append-only `garbage_skip_events`**: edits/deletes never mutate; they insert a new row pointing at the old via `supersedes_event_id`. The view `garbage_skip_events_current` returns the live set. Full audit history comes for free.
- **No login**: device id in `localStorage`, claimed against a `devices` row. Audit trail uses `reported_by_device`.
- **Self-service villa add**: if a resident can't find their villa, the picker UI inserts a new row with `auto_created=true, verified=false`. Admin verifies later.
- **Complaint registry model**: silence ≠ collected. The app only logs skips. Reframe the system as evidence-gathering, not census.
- **Insights module**: manual-upload pipeline. Admin uploads the WhatsApp `_chat.txt` (zip or plain), `insights_messages` dedupes by `content_hash`, a rule-based classifier tags each message into one of 10 categories + complaint/question intent + phase mention. Public dashboard at `/insights` shows live-issue clusters, category trends, freshness chip. Re-uploading an overlapping export only adds the tail. One-shot CLI: `npx tsx scripts/ingest-chat.ts <file>`.

## Deployment

1. Point DNS `odion.appweave.tech` → Vercel deployment.
2. Set env vars in Vercel: `DATABASE_URL`, `DB_SCHEMA=odion`, `ADMIN_PASSCODE`, `CRON_SECRET`.
3. Run `npm run migrate` once against production DATABASE_URL.
4. Run `npm run seed` once.
5. Cron is wired via `vercel.json` (20:00 IST = 14:30 UTC daily).

## Roadmap

- **v1.1** — Twilio WhatsApp auto-post (swap into `/api/eod`).
- **v1.2** — Phone OTP if abuse appears.
- **v1.3** — Photo upload per skip event.
- **v2** — Multi-community SaaS; Odion as reference customer.
- New modules under `/maintenance`, `/dues`, `/events` — slot under the `odion` schema with their own table prefix.
