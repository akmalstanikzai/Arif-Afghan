# Rice Factory

React + Vite staff login using Supabase Auth. Includes email/password login, persistent sessions, password visibility, error handling, and sign-out. After login, a responsive dashboard displays a welcome message, sidebar navigation, and account details. Factory operations data has not been added yet.

## Project structure

```text
src/
  app/App.jsx                    # App composition and authenticated screen selection
  components/
    navigation/Sidebar.jsx       # Shared workspace navigation
    ui/                          # Brand, icons, alerts, page headings
  features/
    auth/                        # Login page, login branding, authentication hook
    dashboard/pages/             # Overview and welcome screen
    account/pages/               # Account profile
  layouts/DashboardLayout.jsx    # Sidebar, header, and content shell
  lib/
    supabase/client.js           # Browser Supabase connection
    user.js                      # Shared user display helper
  styles/globals.css             # Tailwind import, theme tokens, and base styles
  assets/                        # Bundled static assets
  main.jsx                       # React entry point
supabase/
  migrations/                    # Every database migration
  functions/                     # Every Edge Function, one folder per function
    _shared/                     # Shared server-only helpers
```

Use Tailwind utilities in components. Add new areas such as inventory or production under `src/features/<feature>/`, keeping their pages, components, hooks, and services together as needed. Promote components to `src/components` only when shared across features. Navigation currently switches between Overview and My account in memory; add a router when URL-based pages are needed.

All future migrations and Edge Functions belong in `supabase/`; see [the backend workflow](supabase/README.md). Project conventions are recorded in [AGENTS.md](AGENTS.md). No database or hosted functions are changed by this folder refactor.

## Connect Supabase

1. Open your project in the Supabase dashboard and click **Connect**. Copy the project URL and publishable key (also available in project settings / API keys). A legacy anon key also works. Never use a secret or service_role key in this frontend.
2. Copy .env.example to .env.local in this project root and replace both values:

   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

   .env.local is ignored by Git. Vite exposes these public values to the browser. Never put private credentials in VITE_ variables.
3. In **Authentication > Sign In / Providers**, enable Email authentication.
4. In **Authentication > Users > Add user > Create new user**, create a staff account with email and password. Mark the email as confirmed for this administrator-created test account.
5. Add that Auth user to the staff allow-list from the Supabase SQL editor. Replace the email with the exact account email:

  ```sql
  insert into public.mill_staff(user_id)
  select id from auth.users where email = 'staff@example.com'
  on conflict (user_id) do update set active = true;
  ```

  The factory RPCs intentionally reject authenticated users who are not active in `public.mill_staff`.
6. For a staff-only app, disable **Allow new users to sign up** in the authentication settings. Administrators can create staff accounts in the dashboard, then add them to `mill_staff` with the SQL above. The app has no public signup or password-reset flow; staff should contact their administrator.
7. In **Authentication > URL Configuration**, set Site URL to http://localhost:5173 for development and your HTTPS domain when deployed. Password login itself needs no redirect URL.
8. Run npm install, then npm run dev. Open the address Vite shows. Restart Vite after changing .env.local.

## Verify

- An incorrect password should show an error.
- Correct staff credentials should display the account email.
- Reloading should preserve the session.
- Signing out should return to the login form.
- npm run build checks the production build; npm run lint checks source code.

Live authentication requires your project values and a Supabase user. Missing configuration displays setup guidance and disables sign-in.

## Deployment and future data access

Set both VITE_ values in your hosting provider before building. The frontend session controls the screen, not database permissions. When adding factory tables, enable Row Level Security and write policies for authorized users. Authentication alone does not enforce staff roles or table access.

References:
- https://supabase.com/docs/guides/auth/quickstarts/react
- https://supabase.com/docs/guides/auth/passwords
