# NazVik Konnect — Farmhouse Booking

NazVik Konnect is a mobile-focused booking app for a farmhouse shared by several families. Members can request stays, track reservations and priority points, and record the condition of the property; an admin can manage families, bookings, and house information.

## Overview

The project coordinates use of one shared property. A family chooses dates and a visit type, sees a points estimate, and submits a reservation. The app also supports inviting one other family to a combined stay, checking out with photos, and recording inspections. It is a portfolio demo, not an authentication or production deployment example.

## Features

- Family selection and four-digit demo PIN sign-in, plus a configurable demo admin entry flow.
- Date-based family and friends bookings, including open-ended stays and checks against existing reservations.
- Two-family combined-stay invitations that the invited family can accept or decline, with optional WhatsApp share messages.
- Priority-point estimates and updates when bookings are made, cancelled, or checked out.
- Upcoming, past, and cancelled trip views; booking edits, cancellation, and checkout.
- Checkout photos, condition inspections with a checklist, and a house information screen with rules, contacts, directions, and Wi-Fi details.
- In-app alerts and browser notification reminders while the page remains open.
- Admin screens for family records, scores, bookings, checkout photos, and house settings.

## Tech stack

| Area | Implementation |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router |
| UI | Tailwind CSS, Radix UI components, Lucide icons, Framer Motion, Sonner |
| Data | Supabase JavaScript client talking directly to Supabase PostgreSQL |
| Dates | date-fns and React Day Picker |
| Hosting configuration | Static site with SPA rewrites for Vercel (`vercel.json`) and Netlify (`public/_redirects`) |

There is no separate backend process or server API in this repository. The `zite-endpoints-sdk` import is aliased to a local browser-side module, and the file-upload alias converts images to data URLs rather than uploading them to a storage service.

## Architecture

```text
Browser
  └─ React pages and components
       ├─ local SDK adapter (booking and admin operations)
       │    └─ Supabase JavaScript client → PostgreSQL tables
       ├─ localStorage (session and limited house-settings fallback)
       └─ browser APIs (notifications, service worker, image reading)
```

The browser performs PIN checks and application operations. The app does not use Supabase Auth. Without a configured demo database, the interface can load, but family sign-in and data-backed workflows cannot run.

## Project structure

```text
src/App.tsx                 Routes and route guard
src/pages/                 Login, booking, trips, inspection, house info, admin
src/components/            Booking form, trip cards, navigation, UI components
src/stubs/                 Browser-side SDK and file-upload adapters
src/lib/db-supabase.ts     Supabase table operations
src/lib/auth.ts            Browser-stored session
src/lib/house-info.ts      Demo house defaults and settings API
src/lib/notifications.ts   Browser notifications and service worker registration
supabase-schema.sql        Demo database tables, policies, and seed rows
public/                   Icons and service worker
```

The `zite-endpoints-sdk` and `zite-file-upload-sdk` names are local aliases retained from the project's original export; their implementations are in `src/stubs/`.

## Getting started

### Prerequisites

- Node.js and npm.
- An **isolated, disposable demo** Supabase project for data-backed screens. Never connect this code or its SQL policies to real family data.

### Installation

```bash
npm ci
```

### Configuration

Copy [`.env.example`](.env.example) to `.env` and fill in the URL and anon/publishable key from the isolated demo project. Replace the example `VITE_DEMO_ADMIN_PIN` value with an eight-digit **demo-only** code if you want to access the admin screen. For example, in PowerShell:

```powershell
Copy-Item .env.example .env
```

In that disposable Supabase project's SQL editor, run `supabase-schema.sql` once. It creates six tables and obviously fake demo records. The seeded bookings use dates relative to the day the SQL runs. Do **not** run it against an existing database: it includes broad demo-only row-level security policies. Vite exposes all `VITE_` values to the browser; the admin code is a demo gate, not a secret or server-side authorization.

### Running the application

```bash
npm run dev
```

Open the local URL printed by Vite. `npm run build` runs TypeScript checking and creates a production build in `dist/`; `npm run preview` serves that build. There is no test or lint script in `package.json`.

## Usage

Select one of the seeded demo families and use its demo PIN from `supabase-schema.sql`, then use **Book Your Stay** to choose the trip type and dates. Reservations appear under **Upcoming Trips** and **Past Trips**. For a combined stay, select one other family; its invitation appears on that family's dashboard. **House Info** shows demo property details and recent condition records. For demo admin access, leave the family selector empty and enter the configured demo admin code.

## Database

The SQL defines `families`, `bookings`, `inspections`, `notifications`, `house_settings`, and `checkout_photos`. Bookings reference one owning family and at most one invited family; inspections and checkout photos reference bookings. House settings store Wi-Fi details, contacts, location, a checklist, and rules. Seeded values are fake. Photos are stored as data URLs in database fields, not in Supabase Storage.

## Current limitations

- Authentication and admin authorization rely on browser-side checks and a localStorage session. The demo SQL stores fake PINs as plaintext and grants broad access through its row-level security policies. It is unsuitable for real users or a publicly accessible database.
- The active data layer needs Supabase. There is no general offline fallback for families and bookings.
- The repository has no automated tests. Browser reminders use page timers, so they are not a reliable background notification service.
- Images selected for checkout and inspections are stored as data URLs in database rows; this is not a scalable photo-storage design.

## Future improvements

1. Move identity and authorization to a trusted server or Supabase Auth, and replace the open database policies before any real deployment.
2. Add focused tests for booking, invitation, and points workflows.
3. Move photos to managed storage and build a reliable notification service if the project grows beyond a demo.
4. Add privacy-checked screenshots of the demo screens.
