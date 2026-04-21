# Phase 9 — Core backend in Supabase (setup)

Phase 9 adds Postgres tables for **books**, **book configs**, **book notes**, and the **files** ledger (metadata for uploaded blobs), plus optional **Supabase Storage** buckets for blobs. Wiki tables from Phase 8 are unchanged.

## Prerequisites

- A Supabase project ([Dashboard](https://supabase.com/dashboard)).
- Environment variables (see [`.env.local.example`](../.env.local.example)).

## Database schema

1. Open **SQL Editor** (or use the Supabase MCP `execute_sql` tool).
2. Execute the full script: [`phase9-backend-supabase.sql`](phase9-backend-supabase.sql).

That creates:

- `books` — PK `(user_id, book_hash)`
- `book_configs` — PK `(user_id, book_hash)`
- `book_notes` — PK `(user_id, book_hash, id)`
- `files` — PK `id` (uuid), with unique active `(user_id, file_key)` where `deleted_at` is null

All tables reference `auth.users(id) ON DELETE CASCADE` and use RLS policies scoped with `(SELECT auth.uid()) = user_id`.

## Storage buckets (Supabase Storage)

If you use `NEXT_PUBLIC_OBJECT_STORAGE_TYPE=supabase`, create two buckets:

| Bucket ID     | Public | Purpose                                                        |
| ------------- | ------ | -------------------------------------------------------------- |
| `books`       | No     | User book files; keys like `{user_id}/{fileName}`              |
| `temp-images` | Yes    | Temporary uploads (e.g. wiki images); keys like `temp/img/...` |

You can create them in **Storage → New bucket**, or run (in SQL Editor, as a user with access to `storage.buckets`):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-images', 'temp-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
```

Override names with:

- `SUPABASE_STORAGE_BUCKET` (default `books`)
- `SUPABASE_STORAGE_TEMP_BUCKET` (default `temp-images`)

The app uses the **service role** (`SUPABASE_ADMIN_KEY`) on the server to mint signed upload/download URLs; the client completes uploads via `uploadToSignedUrl` using the returned `path` + `token`.

## Environment variables

Set at minimum:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_ADMIN_KEY` (server-side; never expose to the client)
- `NEXT_PUBLIC_OBJECT_STORAGE_TYPE=supabase`
- `SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_TEMP_BUCKET` (if not using defaults)

For self-hosted builds without billing, JWT `plan` / storage claims may be absent; use `NEXT_PUBLIC_STORAGE_FIXED_QUOTA` to cap uploads (see `utils/access.ts`).

## Legacy R2 / S3

If `NEXT_PUBLIC_OBJECT_STORAGE_TYPE` is `r2` or `s3`, configure `R2_*` or `S3_*` and `TEMP_STORAGE_PUBLIC_BUCKET_NAME` as before; Phase 9 DB tables still apply.
