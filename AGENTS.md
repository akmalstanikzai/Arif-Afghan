# Project conventions

- Use React and Tailwind CSS for the frontend. Style components with Tailwind utilities; keep shared design tokens and base styles in `src/styles/globals.css`. Avoid page-specific CSS files.
- Keep application composition in `src/app`, shared shells in `src/layouts`, and genuinely reusable UI/navigation in `src/components`.
- Organize business areas under `src/features/<feature>`. Add `pages`, `components`, `hooks`, or `services` inside a feature only when needed. Keep feature-specific code within its feature rather than growing a catch-all components folder.
- Keep the browser Supabase client in `src/lib/supabase/client.js`. Mount the authentication hook once at the app level; pass its state/actions down rather than creating multiple auth subscriptions.
- Save EVERY database change as a timestamped SQL migration in `supabase/migrations`. Include policies, SQL functions, indexes, triggers, and storage changes there. Do not leave changes only in chat or the hosted SQL editor. Do not rewrite applied migrations.
- Save EVERY Edge Function in `supabase/functions/<function-name>/index.ts`, with supporting files alongside it. Put shared server helpers in `supabase/functions/_shared`. Save the source before deployment and keep it updated with deployed changes.
- Do not put server secrets in frontend code or VITE_ variables. Keep environment files ignored, with placeholder-only `.env.example` files as documentation.
- Keep existing authentication and responsive behavior working during refactors. Run `npm run build` and `npm run lint` after changes; add focused behavioral checks for auth or data changes as appropriate.
