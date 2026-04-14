# Физика с Кириллом — Physics Tutor Website

## Overview
A full-stack website for a physics tutor ("Физика с Кириллом"). Includes a landing page, user registration/login, personal cabinet for managing lessons and subscriptions, and an admin panel for the tutor.

## Architecture

- **Frontend**: React + TypeScript + Vite (served via Express in dev mode)
- **Backend**: Express.js (TypeScript, tsx)
- **Database**: PostgreSQL (Replit-managed), accessed via Drizzle ORM
- **Auth**: JWT access tokens (in-memory) + refresh tokens (httpOnly cookies)
- **Styling**: Tailwind CSS v4

## Key Files

- `server/index.ts` — Express entry point, listens on port 5000
- `server/routes.ts` — All API routes
- `server/auth.ts` — Auth routes + JWT middleware (requireAuth, requireAdmin)
- `server/admin.ts` — Admin API routes (protected by requireAuth + requireAdmin)
- `server/db.ts` — Drizzle ORM database client
- `shared/schema.ts` — Drizzle ORM table definitions and types
- `client/src/` — React frontend
  - `pages/` — HomeBlueAccent, Login, Register, Cabinet, ForgotPassword, ResetPassword, VerifyEmail
  - `pages/admin/` — Admin panel pages (Dashboard, Bookings, Students, Subscriptions, Schedule, Payments, AdminApp)
  - `components/admin/` — AdminApp layout components (AppLayout, AppSidebar)
  - `lib/api.ts` — Axios client (relative URLs, access token + refresh interceptors)
  - `lib/auth.ts` — Auth helpers (login, logout, tryRefreshToken, getAccessToken)
  - `lib/admin-api.ts` — Admin API react-query hooks

## Database Tables

- `users` — Student profiles (telegramId, firstName, lastName, age, grade, goal, phone, telegramUsername)
- `accounts` — Website accounts (email, password_hash, first_name, phone, is_email_verified, role, userId→users)
- `refresh_tokens` — JWT refresh tokens with expiry
- `email_tokens` — Verification and password reset tokens
- `bookings` — Lesson bookings (userId→users, date, time, status, isPaid, type)
- `subscriptions` — Lesson subscriptions/passes (userId→users, totalLessons, remainingLessons, isPaid, type)
- `schedule_slots` — Weekly schedule slots (dayOfWeek, time, title, maxStudents, slotType, specificDate)

## API Routes

### Auth
- `POST /api/auth/register` — Create account, generate verify email token
- `POST /api/auth/login` — Return access token + set refresh cookie
- `POST /api/auth/logout` — Clear refresh cookie
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Get current user (requires auth)
- `GET /api/auth/verify-email?token=...` — Verify email
- `POST /api/auth/forgot-password` — Generate password reset token (link logged in dev)
- `POST /api/auth/reset-password` — Reset password with token

### Cabinet (all require auth)
- `GET /api/cabinet/me` — Get profile
- `PATCH /api/cabinet/me` — Update name/phone
- `GET /api/cabinet/bookings` — Get bookings
- `DELETE /api/cabinet/bookings/:id` — Cancel booking
- `GET /api/cabinet/subscriptions` — Get subscriptions

### Admin (all require auth + role=admin)
- `GET/POST /api/admin/users` — List / create students
- `GET/POST /api/admin/bookings` — List / create bookings
- `PATCH /api/admin/bookings/:id` — Update booking status or isPaid
- `POST /api/admin/notify` — Send notification to user
- `GET/POST /api/admin/subscriptions` — List / create subscriptions
- `PATCH /api/admin/subscriptions/:id/paid` — Mark subscription as paid
- `GET/POST /api/admin/schedule` — List / create schedule slots
- `DELETE /api/admin/schedule/:id` — Delete schedule slot

## Admin Panel

Accessible at `/admin` (requires account with `role = 'admin'` in the `accounts` table).
Set admin role by running SQL: `UPDATE accounts SET role='admin' WHERE email='your@email.com';`

## Dev Notes

- In development, email links (verify, reset password) are logged to the server console
- JWT secrets default to dev values — set in production via env vars
- Runs on port 5000 (combined frontend + backend)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `JWT_ACCESS_SECRET` — Secret for signing access tokens
- `JWT_REFRESH_SECRET` — Secret for signing refresh tokens
- `RESEND_API_KEY` — API key for Resend email service (optional; if not set, links are logged to console in dev)
- `FROM_EMAIL` — Sender address for emails (default: `onboarding@resend.dev`)
- `FRONTEND_URL` — Full URL of the app for email links

## Scripts

- `npm run dev` — Start full-stack dev server
- `npm run build` — Build for production
- `npm run start` — Run production build
- `npm run db:push` — Sync Drizzle schema to database
