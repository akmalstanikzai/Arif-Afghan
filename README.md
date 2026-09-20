# Rice Factory

React, Tailwind CSS, and Supabase application for a rice factory. Includes staff
login, dashboard, suppliers/customers, purchases, factory and contract processing,
inventory, sales, cash payments, deliveries, expenses, and auditable corrections.
The interface supports English, Dari/Persian, and Pashto. All business dates support
Gregorian and Solar Hijri entry, display, and storage; see [the calendar guide](docs/calendars.md).

Read [the processing, cheque, and inventory guide](docs/processing-and-stock.md)
for the latest workflow and migration 005.

## Simple project structure

```text
src/
  app/App.jsx            # App composition; authentication mounted once
  pages/                 # Screens
  components/            # UI, navigation, forms, tables, and history
  hooks/                 # Authentication, language, factory data/actions
  providers/             # Language and factory contexts/providers
  services/              # Supabase RPC calls and form calculations
  layouts/               # Dashboard shell
  locales/               # Editable English, Dari, and Pashto JSON files
  lib/                   # Formatting, translations, user helper
    supabase/client.js   # Single browser Supabase client
  styles/globals.css     # Tailwind, shared tokens, base styles
supabase/
  migrations/            # Ordered SQL changes; never rewrite applied files
  tests/                 # Database workflow and concurrency checks
tests/                   # Translation, calculation, and page-render checks
docs/backend-requirements.md
```

Read [the translation guide](src/locales/README.md) to change local terminology.
Read [the requirements review](docs/backend-requirements.md) for frontend/backend
coverage and [the SQL instructions](supabase/README.md) before applying migrations.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable
   key. A legacy anon key is also supported. Never put a secret or service-role
   key in frontend environment variables.
3. Apply the database migrations using the instructions in `supabase/README.md`.
4. Create a confirmed email/password user in Supabase Auth and provision that
   user in `mill_staff`. Auth users are not staff automatically. This app has no
   public signup or password-reset screen; staff contact the administrator.
5. Run `npm run dev`. Restart the dev server after changing environment values.

## Checks

- `npm run build` — production build.
- `npm run lint` — code checks.
- `npm test` — catalog parity/placeholders, translated database errors, units and
  Gregorian dates, calculation regressions, and all pages in all three languages.
- Database test instructions are in `supabase/README.md`.

For a live authentication check, sign in with a provisioned staff account, reload
to confirm session persistence, and sign out. The refactor preserves the single
existing authentication subscription. Page navigation remains in memory.
