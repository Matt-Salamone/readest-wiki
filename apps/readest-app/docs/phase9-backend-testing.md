# Phase 9 — Core backend in Supabase (testing)

Manual checks after applying [`phase9-backend-setup.md`](phase9-backend-setup.md).

## Preconditions

- `.env.local` filled with Supabase URL, anon key, and `SUPABASE_ADMIN_KEY`.
- `NEXT_PUBLIC_OBJECT_STORAGE_TYPE=supabase` if testing Supabase Storage.
- Signed-in user (valid JWT).

## Postgres / sync

1. **GET** `/api/sync?type=books&since=0` (or a recent epoch ms) — should return `{ books: [...] }` without 500. Empty array is OK.
2. Repeat for `type=configs` and `type=notes`.
3. Optionally **POST** a small sync payload matching [`libs/sync.ts`](../src/libs/sync.ts) shapes for `books` / `configs` / `notes` and confirm rows in Supabase **Table Editor** under your `user_id`.

## Storage

1. **Upload** a small file through the app (library upload or any flow using [`libs/storage.ts`](../src/libs/storage.ts) `uploadFile`).
2. Confirm a row in `public.files` with matching `file_key` and `file_size`.
3. In **Storage**, confirm the object exists under bucket `books` (or `SUPABASE_STORAGE_BUCKET`) at path `{user_uuid}/{filename}`.
4. **Download** / open the book or asset that uses the file — should resolve via `/api/storage/download`.
5. **Delete** via app or **DELETE** `/api/storage/delete?fileKey=...` — row removed from `files` and object removed from Storage.

## Temp image upload (wiki / rich content)

1. Trigger a **temp** upload (`temp: true` in upload API body) if your UI supports it.
2. Confirm object under `temp-images` (or `SUPABASE_STORAGE_TEMP_BUCKET`) and that the returned `downloadUrl` is reachable (public bucket).

## Regression

- With `NEXT_PUBLIC_OBJECT_STORAGE_TYPE=r2` or `s3`, repeat upload/download using legacy env vars (optional).

## Notes

- `/api/storage/stats` falls back to aggregating `files` if RPC `get_storage_by_book_hash` is missing (no Phase 9 RPC required).
- DeepL `/api/deepl/translate` usage tracking RPCs are **not** part of Phase 9; self-hosted may skip translation or add RPCs later.
