# Физика с Кириллом — Physics Tutor Website

## Project Structure

This is a pnpm monorepo located at `kvant-site-dev/Import-Launch/`.

The main application is at `kvant-site-dev/Import-Launch/artifacts/kvant-site/`.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite (served via Express in dev)
- **Backend**: Express.js v5 + TypeScript (tsx)
- **Database**: PostgreSQL (Replit-managed), Drizzle ORM
- **Auth**: JWT access tokens + refresh tokens (httpOnly cookies), Passport.js
- **Styling**: Tailwind CSS v4

## Running the App

The workflow runs: `cd kvant-site-dev/Import-Launch/artifacts/kvant-site && pnpm run dev`

- Dev server listens on port 5000 (combined frontend + backend)
- Host: 0.0.0.0, allowedHosts: true (Replit proxy compatible)

## Deployment

- Build: `cd kvant-site-dev/Import-Launch/artifacts/kvant-site && pnpm run build`
- Run: `cd kvant-site-dev/Import-Launch/artifacts/kvant-site && pnpm run start`
- Target: autoscale

## Key Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `JWT_ACCESS_SECRET` — JWT access token secret
- `JWT_REFRESH_SECRET` — JWT refresh token secret
- `RESEND_API_KEY` — Resend email API key (optional)
- `FROM_EMAIL` — Sender email address
- `FRONTEND_URL` — Full app URL for email links

## Admin Panel

Access at `/admin`. Requires account with `role = 'admin'` in `accounts` table.
Set via SQL: `UPDATE accounts SET role='admin' WHERE email='your@email.com';`

## Legal Pages

- `/offer` — Публичная оферта
- `/privacy` — Политика конфиденциальности
- `/terms` — Пользовательское соглашение
- `/refund` — Условия возврата

## Collaboration Board (kvant-board)

A self-hosted Excalidraw collaboration whiteboard, lives in `kvant-board/`
(standalone project, not part of the pnpm workspace).

- Workflow `Excalidraw Board` runs `tsx server/index.ts` on port 8000.
  Express + Socket.IO (path `/board-ws`) + Vite dev middleware.
- Vite is configured with `base: "/board-app/"` so all asset URLs are
  prefixed and survive the site reverse-proxy.
- The site (`kvant-site`) reverse-proxies two prefixes to the board on
  port 8000 via `http-proxy-middleware`:
  - `/board-app/**` — board HTML/JS/CSS (HTTP + WS for Vite HMR)
  - `/board-ws/**` — Socket.IO collaboration channel
  Mounted with a `pathFilter` function (NOT Express mount path) so the
  full URL (including the prefix) is forwarded unchanged.
- Each booking row carries `room_id` (UUID, unique). Site issues this on
  `POST /api/cabinet/bookings`; bot does the same in `bot.ts`.
- Site route `/board/:roomId` (protected) renders `Board.tsx`, which embeds
  `/board-app/index.html?room=<id>&name=<displayName>` in an iframe.
- "Открыть доску" button on each booking row in the cabinet links there.
- Bot sends the board link in:
  - The 10:00 daily reminder for next-day bookings.
  - A new "30 minutes before" reminder driven by a `*/5 * * * *` cron in
    `kvant-bot/server/reminders.ts`. It uses `parseBookingDateTime` and a
    `soonRemindedIds` Set to send each booking's reminder at most once.
  - Board URL is built from `SITE_URL` or `FRONTEND_URL` env vars.
- In Replit dev, Socket.IO connects via long-polling fallback (WebSocket
  upgrade through the dev proxy is unreliable). Production deployments
  with a proper WS-aware reverse proxy can use full WebSocket transport.

Placeholders `[ФИО]` and `[ИНН]` in legal docs must be replaced with real data before going to production.

## Booking Calendar Architecture

Shared booking calendar logic was extracted to reduce duplication and improve maintainability:

- `client/src/lib/date-utils.ts` — `date-fns`-based wrappers (`startOfDay`, `startOfWeekMon`, `addDays`, `formatDateDDMMYYYY`, `formatWeekRange`, `getDayOfWeekMon`, `parseTimeHHMM`, `getBrowserTimezoneLabel`) and shared constants (`DAY_NAMES_SHORT/FULL`, `MONTHS_RU/SHORT`).
- `client/src/components/BookingCalendar.tsx` — week-view calendar used by `/cabinet`. Features:
  - `useMemo` for week days, slots-by-date, and user-bookings lookup
  - Minute-precise slot positioning via absolute layout (not hour-rounded grid rows)
  - Responsive view modes (1/3/7 days) via `matchMedia`
  - Accessibility: `role="grid"`, `role="columnheader"`, `role="row"`, `role="gridcell"`, `aria-label` on every interactive element, focus-visible rings
  - Timezone label from `Intl.DateTimeFormat().resolvedOptions().timeZone`
- `client/src/pages/Cabinet.tsx` — uses `useToast` (no `alert()`), consumes `<BookingCalendar>`.
- `client/src/pages/admin/Schedule.tsx` — month view; reuses shared date helpers.

## Legal / Compliance Features

- **Cookie banner** — slides in from bottom on first visit; stored in `localStorage("cookies_accepted")`
- **Consent checkbox** on `/register` page (required, validated via zod)
- **Consent checkbox** in PricingCards cart bar (required before adding plans or proceeding to checkout)
- **Footer** — includes реквизиты (`[ФИО] · ИНН [ИНН] · Самозанятый`) and links to all 4 legal pages
