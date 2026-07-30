# Couple Expense Tracker

A tiny two-person expense + settle-up tracker that installs to your phone's
home screen (PWA). Data syncs live between two devices via Supabase.

## Use
Open `index.html` — it's the whole app (single file). To enable sync, paste your
own Supabase **Project URL** and **anon public key** into the two constants near
the top of the `<script>` in `index.html`, then sign in with your shared account.

No build step. Host anywhere that serves static files (GitHub Pages, Netlify, …).

_The anon key is safe to be public; your data is protected by the login and
database row-level security._
