# Phase 8 — Wiki sync (manual QA)

## Preconditions

- [wiki-phase8-supabase.sql](wiki-phase8-supabase.sql) applied to your Supabase project.
- `.env.local` configured with Supabase URL and keys.
- Two clients or two browsers signed in as the **same** user (optional but recommended).

## Core flows

1. **Library pull**  
   Open the library while signed in. Confirm no console errors from wiki sync. Optionally verify `lastSyncedAtWiki` advances in persisted settings after a successful pull.

2. **Reader push/pull**  
   Open a book, add wiki blocks/pages. Wait for the throttled sync (same interval family as notes). On the second device, open the library (pull) or the reader (pull + merge) and confirm pages/blocks/links match.

3. **Namespace merge**  
   For a grouped series, confirm `wiki_namespaces.book_hashes_json` unions across devices (both hashes present) after both devices have added books to the group.

4. **Spoiler override (device-local)**  
   Toggle per-namespace spoiler override on device A. Confirm device B does **not** receive that toggle from sync (column is not on the server).

5. **Imported mode**  
   Import a wiki bundle (Phase 6). Confirm `imported_mode` syncs and behaves as expected on another device after sync.

6. **Soft-deleted links**  
   Edit markdown to remove a `[[link]]`, sync, and confirm the remote row is tombstoned (`deleted_at` set) and the UI hides the link where appropriate.

7. **Section catalog**  
   Add a new section label on one device; confirm it appears in the catalog on the other after sync.

8. **Offline / catch-up**  
   Make edits offline (or with network disabled), reconnect, and confirm a later pull/push reconciles without duplicate primary keys.

## Regression

- Signed **out**: wiki remains local-only; no failed sync spam in console.
- Books/configs/notes sync still works as before (pull library, reader notes).
