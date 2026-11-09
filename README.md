# Nexora Ai (Next.js)

Stack: Next.js (App Router) · React · TypeScript · Tailwind CSS · Lucide React · Supabase (login)

## Step 1: set up login (works from a phone browser)
1. supabase.com > New project. Save the database password somewhere safe.
2. In the project: **SQL Editor** > New query > paste everything from `supabase/schema.sql` > **Run**.
3. **Project Settings > API**: copy the **Project URL** and the **anon public** key.
4. **Authentication > URL Configuration**: set Site URL to your live site (for example your Vercel link) and add these Redirect URLs:
   `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback`
5. **Authentication > Providers**: Email is on by default (keep "Confirm email" on). Google is optional: it needs a Google Cloud OAuth client; Supabase shows the callback URL to paste there.
6. Add the two keys: locally copy `.env.local.example` to `.env.local`; on Vercel use **Settings > Environment Variables** (same two names), then redeploy.

Until the keys are added, the site still opens and the forms say "Login isn't set up yet".

## Run it on a computer
`npm install` then `npm run dev` and open http://localhost:3000

## Deploy (free)
Put the folder on GitHub, import it on vercel.com, add the two environment variables, Deploy.

## Where things live
- `app/` pages (`login/`, `signup/`, `reset-password/`, `auth/callback/`, `dashboard/`)
- `middleware.ts` + `lib/supabase/` login helpers. `/dashboard` needs a signed-in user once the keys are set
- `supabase/schema.sql` database setup · `lib/chat/api.ts` future AI connection point
- `lib/studios.json` AI models and point prices · `lib/account.json` demo balance (replaced in Step 2)
