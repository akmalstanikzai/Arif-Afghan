# Rice Factory

React + Vite staff login using Supabase Auth. Includes email/password login, persistent sessions, password visibility, error handling, and sign-out. After login, a responsive dashboard displays a welcome message, sidebar navigation, and account details. Factory operations data has not been added yet.

## Connect Supabase

1. Open your project in the Supabase dashboard and click **Connect**. Copy the project URL and publishable key (also available in project settings / API keys). A legacy anon key also works. Never use a secret or service_role key in this frontend.
2. Copy .env.example to .env.local in this project root and replace both values:

   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

   .env.local is ignored by Git. Vite exposes these public values to the browser. Never put private credentials in VITE_ variables.
3. In **Authentication > Sign In / Providers**, enable Email authentication.
4. In **Authentication > Users > Add user > Create new user**, create a staff account with email and password. Mark the email as confirmed for this administrator-created test account. No custom users table or SQL is needed.
5. For a staff-only app, disable **Allow new users to sign up** in the authentication settings. Administrators can create staff accounts in the dashboard. The app has no public signup or password-reset flow; staff should contact their administrator.
6. In **Authentication > URL Configuration**, set Site URL to http://localhost:5173 for development and your HTTPS domain when deployed. Password login itself needs no redirect URL.
7. Run npm install, then npm run dev. Open the address Vite shows. Restart Vite after changing .env.local.

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
