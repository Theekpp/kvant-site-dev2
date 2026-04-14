# Kvant Site - Replit Setup

## Overview

This is the **kvant-site** project, an educational/tutoring platform (Kvant Site) with booking capabilities, student cabinet, and admin dashboard. It is a pnpm workspace monorepo.

## Architecture

- **Monorepo root**: `Import-Launch/`
- **Main app**: `Import-Launch/artifacts/kvant-site/` — Express 5 backend + React 19 frontend (served together)
- **Shared libraries**: `Import-Launch/lib/` — DB schema (Drizzle), API spec (OpenAPI), generated hooks

## Tech Stack

- **Package manager**: pnpm workspaces
- **Frontend**: React 19, Tailwind CSS 4, Radix UI, Framer Motion, Tanstack Query v5, Wouter
- **Backend**: Express 5, Passport.js, JWT, bcrypt
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite (frontend), esbuild (backend), tsx (dev)
- **TypeScript**: 5.9

## Development

The app runs on port **5000** in development mode. The Express server serves both the API and the Vite dev server middleware together.

### Start development
Workflow: "Start application" runs `cd Import-Launch/artifacts/kvant-site && pnpm dev`

### Push DB schema
```
cd Import-Launch/artifacts/kvant-site && pnpm db:push
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — individual PG credentials

## Deployment

- **Target**: autoscale
- **Build**: `cd Import-Launch && pnpm install && cd artifacts/kvant-site && pnpm build`
- **Run**: `cd Import-Launch/artifacts/kvant-site && node dist/index.cjs`
