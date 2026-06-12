# ChupiRoom — Web Companion

A small **read-only** Next.js companion to the ChupiRoom mobile app, for streamer
viewers. Viewers join a room from the browser, watch the live card, and vote in
Votaciones; streamers add an OBS overlay. It connects to the **same Supabase
backend** as mobile and never acts as host.

This app lives in `/web` inside the mobile repo. **It does not touch the Expo
app** — Vercel deploys only this folder (Root Directory = `web`).

## Local setup

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev                  # http://localhost:3000
```

### Required env vars

Public, client-safe only. Use the **same** Supabase project as the mobile app.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Never put the service-role key or any private secret here.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev` | Local development |
| `npm run build` | `next build` | Production build (Vercel runs this) |
| `npm run start` | `next start` | Serve a production build locally |
| `npm run lint` | `eslint` | Lint |
| `npm run typecheck` | `tsc --noEmit` | Type-check |

## Deploy to Vercel

1. Import the repo into Vercel.
2. **Set Root Directory = `web`** (Settings → General → Root Directory). This is
   required so Vercel builds only the companion, not the Expo app.
3. Framework preset: **Next.js** (auto-detected). Build command `next build` and
   install `npm install` are the defaults — no overrides needed.
4. Add the env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   for Production (and Preview if used).
5. Deploy.

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing |
| `/join` | Join a room (name + code) → redirects to `/r/[code]` |
| `/r/[code]` | Web player view: live card, players, vote in Votaciones, leave |
| `/overlay/[code]` | OBS stream overlay (large card, QR to join) |
| `/overlay/[code]?compact=1` | Smaller lower-third overlay |
| `/overlay/[code]?transparent=1` | Transparent background for compositing |

The overlay query params combine, e.g. `/overlay/ABC12?compact=1&transparent=1`.

## OBS usage

1. In OBS: **Sources → + → Browser**.
2. URL: `https://<your-domain>/overlay/<ROOM_CODE>` (append `?compact=1` and/or
   `?transparent=1` as desired).
3. Suggested size: `1280×720` (full) or a shorter height for `?compact=1`.
4. Use `?transparent=1` to let the overlay composite over your scene (the page
   background becomes transparent; OBS browser sources are transparent by
   default).
5. The overlay updates in real time as the host advances/reveals; if Realtime
   drops it falls back to polling and shows a subtle "Reconectando…" indicator.

## Production checklist

Before beta testing, confirm on the **Supabase** project shared with mobile:

- [ ] **Anonymous sign-ins enabled** (Authentication → Providers → Anonymous).
      Web viewers read/vote via an anonymous session, so reads return empty
      without this.
- [ ] **Realtime publication includes `room_state` and `room_votes`** (added by
      mobile migrations `0003`/`0004`). Without it the overlay/player view only
      updates via fallback polling.
- [ ] **Vercel env vars set** (`NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for the deployed environment.
- [ ] **Tested with a real room code**: start a match on mobile, open
      `/r/<code>` (join + vote in a Votaciones card) and
      `/overlay/<code>` (card + QR + live vote counts update on host actions).

## Notes

- Read-only: the web app cannot create rooms, advance/reveal/end a match, or act
  as host. Viewers can only join as a guest, watch, vote once per Votaciones
  card, and leave (removing only their own player row).
- No private keys are used or stored; all Supabase access is the public anon key
  under the existing Row Level Security policies.
