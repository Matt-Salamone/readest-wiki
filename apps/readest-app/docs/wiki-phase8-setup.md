# Phase 8 — Wiki Supabase sync (setup)

This project already uses Supabase for `/api/sync` (books, configs, notes). Phase 8 adds optional sync for all wiki tables.

## Prerequisites

- A Supabase project (Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)).
- The same environment variables as the rest of the app (see [`.env.local.example`](../.env.local.example)).

## Database schema

1. Open **SQL Editor** in the Supabase Dashboard (or run statements via the Supabase MCP `execute_sql` tool).
2. Execute the full script: [`wiki-phase8-supabase.sql`](wiki-phase8-supabase.sql).

That script creates `wiki_namespaces`, `wiki_pages`, `wiki_blocks`, `wiki_tags`, `wiki_links`, and `wiki_section_catalog` with `user_id`, timestamps, composite primary keys, and Row Level Security policies (`auth.uid() = user_id`).

After applying:

- Optionally run MCP **`get_advisors`** (or Supabase **Database > Advisors**) and fix any reported issues.
- Optionally run **`list_tables`** (MCP) and confirm the six `wiki_*` tables exist.

## Environment variables

Copy the project **URL** and **anon (publishable) key** from Supabase **Project Settings → API**, or use MCP **`get_project_url`** and **`get_publishable_keys`**.

Set in `.env.local` (same as existing sync):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No extra wiki-specific variables are required.

## Smoke test

1. Sign in to the app (sync requires a valid JWT).
2. Open the library so **`useWikiSyncGlobal`** runs a wiki pull.
3. In Supabase **Table Editor**, confirm rows appear under your user after editing wiki data on device.

If GET `/api/sync?type=wiki&since=0` returns `wiki` with empty arrays and no error, the API and RLS are wired correctly.
