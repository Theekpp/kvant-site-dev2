# Telegram Bot - Физика с Кириллом

## Overview
Telegram-бот для записи на занятия по физике с ментором Кириллом Анисимовым. Включает веб-панель администратора для управления расписанием, записями и абонементами.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI — Admin panel at `/`
- **Backend**: Express.js + PostgreSQL (Drizzle ORM)
- **Telegram Bot**: node-telegram-bot-api (polling mode)

## Key Files
- `shared/schema.ts` — Database models (users, bookings, group_schedule, subscriptions)
- `server/bot.ts` — Telegram bot logic with conversation flows
- `server/storage.ts` — DatabaseStorage implementing IStorage interface
- `server/routes.ts` — REST API for admin panel + bot initialization + student notifications
- `server/db.ts` — PostgreSQL connection
- `server/reminders.ts` — Daily lesson reminders via node-cron
- `client/src/pages/admin.tsx` — Admin dashboard

## Database Tables
- **users** — Telegram users with profile info (name, age, grade, goal, phone)
- **bookings** — Lesson bookings (individual/group) with status tracking
- **group_schedule** — Admin-managed lesson time slots with `slotType` ("individual"|"group") and optional `specificDate`
- **subscriptions** — Subscription plans with lesson count tracking

## Bot Features
- Welcome message with main menu keyboard (7 buttons including "Услуги и оплата")
- Individual lesson booking (from admin-managed individual slots, fallback to day+time selection)
- Group lesson booking (from available group schedule slots)
- User data collection (name, age, grade, goal, phone)
- Admin notifications on new bookings/subscriptions
- Student notifications on booking cancellation/completion
- Auto-decrement subscription lessons on booking completion
- "Услуги и оплата" menu with service descriptions and subscription purchase
- Deep links from website: `/start=about`, `/start=individual`, `/start=group`, `/start=sub4`, `/start=sub8`
- Ask question feature (forwarded to admin)
- My bookings & subscriptions view
- Daily lesson reminders at 10:00

## Admin Panel
- Stats cards (users, active bookings, total bookings, active subscriptions)
- Bookings tab with status management (confirm/complete/cancel)
- Schedule tab with classic calendar grid (month view, Пн-Вс headers), click day to see/add slots
  - Supports individual (1 час) and group (1.5 часа) slot types
  - Color indicators: blue = individual, green = group
  - Weekly summary panel "Все слоты по дням"
- Users tab with profile info
- Subscriptions tab with payment confirmation and lesson tracking

## Environment Secrets
- `TELEGRAM_BOT_TOKEN` — Bot token from @BotFather
- `ADMIN_CHAT_ID` — Admin's Telegram chat ID for notifications
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session secret
