# src — Reconciliation Backend Logic

This folder contains the TypeScript source for the Reconciliation backend logic: a small Express app and the PostgreSQL connection used by the identify route.

## Contents

- `db.ts` — Postgres connection (exports `pool`). Currently uses local hard-coded credentials; prefer environment variables in production.
- `index.ts` — Express app entrypoint. Mounts the identify router at `/identify` and starts the server on port 3000.
- `routes/Identifyroute.ts` — Main business logic. Implements `POST /identify` to create/merge contacts and return a consolidated contact object.

## Purpose

The identify route accepts an email and/or phoneNumber and returns a consolidated view of the contact group: the primary contact id, the list of emails, the list of phone numbers, and secondary contact ids. It enforces a primary/secondary link precedence and links duplicates to the earliest primary.

## Quick start (development)

1. Install dependencies:

   npm install

2. Provide PostgreSQL connection configuration. The project currently uses `src/db.ts` which contains hard-coded values. Replace them with environment variables (recommended). Example environment variables:

- `PGHOST` (default: localhost)
- `PGUSER` (default: postgres)
- `PGPASSWORD`
- `PGDATABASE`
- `PGPORT` (default: 5432)
- `PORT` (server port, default: 3000)

A recommended change is to modify `src/db.ts` to use `process.env` (for example via the `pg` Pool options) or to use `dotenv` for local development.

3. Run TypeScript build or use ts-node for development. Example with ts-node-dev:

   npx ts-node-dev src/index.ts

Or build to JS and run:

   npm run build
   node dist/index.js

## API

POST /identify

- Request JSON body:
  - `email?: string`
  - `phoneNumber?: string | number`

- Behavior summary:
  - If neither email nor phoneNumber is provided: returns 400.
  - If no existing contact matches email/phone: creates a new primary contact and returns it.
  - If matches exist: picks the earliest primary (or promotes as needed), updates other contacts to secondary linked to that primary, inserts a new secondary contact if the request introduces new email/phone, and returns the consolidated contact group.

- Example successful response (200):

  {
    "contact": {
      "primaryContactId": 123,
      "emails": ["alice@example.com"],
      "phoneNumbers": ["+11234567890"],
      "secondaryContactIds": [124, 125]
    }
  }

## Database schema (assumptions)

The code expects a `contacts` table with at least the following columns (adjust types/names as needed):

- `id` (primary key, integer)
- `email` (text or varchar, nullable)
- `phoneNumber` (text or varchar, nullable)
- `linkPrecedence` (text) — values: `'primary' | 'secondary'`
- `linkedId` (integer) — references id of primary contact for secondaries
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `deletedAt` (timestamp, nullable)

Example SQL (Postgres):

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  email TEXT,
  "phoneNumber" TEXT,
  "linkPrecedence" TEXT NOT NULL DEFAULT 'primary',
  "linkedId" INTEGER,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

## Notes and recommended improvements

- Do not keep DB credentials in source. Use environment variables and a .env file for local development (gitignored).
- Add input validation (e.g., email format, normalized phone number format) and rate limiting for the endpoint.
- Consider wrapping related DB changes in transactions where multiple updates/inserts must succeed together.
- Add tests (unit and integration) for merging logic and edge cases (concurrent requests, null values, duplicate timestamps).
- Improve logging and error handling; consider a structured logger.
- Ensure the build pipeline compiles `.ts` to `.js` and that imports (e.g. `Identifyroute.js`) match the compiled output.

## Where to look next

- `src/routes/Identifyroute.ts` — core logic for merging contacts.
- `src/db.ts` — change to environment-driven configuration.
- `src/index.ts` — bootstrapping; adjust port or mount additional routes.
