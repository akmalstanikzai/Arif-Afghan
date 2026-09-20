# Supabase backend

Keep every project database migration and Edge Function in this directory, including changes first drafted in the Supabase dashboard. The frontend Supabase client lives separately in `src/lib/supabase/client.js`.

```text
supabase/
  migrations/                  # YYYYMMDDHHMMSS_description.sql
  functions/
    _shared/                   # Shared server-only helpers
    <function-name>/index.ts    # Each function's entry point (when added)
```

The mill migrations define the factory schema and staff allow-list. After applying them to a hosted project, every authenticated operator must also be inserted into `public.mill_staff`; Auth users are not staff automatically. This folder is not linked to a hosted project or synchronized with its schema.

After creating a user in Supabase Auth, provision access with:

```sql
insert into public.mill_staff(user_id)
select id from auth.users where email = 'staff@example.com'
on conflict (user_id) do update set active = true;
```

## Workflow

Use the Supabase CLI from the repository root. When starting local backend development, run `supabase init` once to generate `supabase/config.toml` and commit that configuration. Never store secrets in it; reference environment variables instead.

- Create a migration with `supabase migration new <description>`. Save tables, indexes, SQL functions, triggers, RLS policies, and storage policies in timestamped SQL files under `migrations/`.
- Create an Edge Function with `supabase functions new <function-name>`. Keep its entry point and dependencies in `functions/<function-name>/`, and reusable server helpers in `functions/_shared/`.
- Keep applied migrations unchanged. Make a new migration for later changes.
- If the hosted project already has custom schema or functions, establish the local baseline before making further changes. Do not assume these empty folders describe the hosted project's current state.
- Keep function secrets in ignored environment files locally and in Supabase secrets when deployed. Never import Edge Function source or server secrets into the browser app.
- Review and test changes locally before applying migrations or deploying functions to the intended hosted project. Saving files here does not deploy them.

References: [database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows).
