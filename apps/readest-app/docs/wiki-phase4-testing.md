# Manual testing — Personal wiki Phase 4 (spoiler / re-read protection)

Phase 4 adds **Re-read mode** (Auto / Spoilers on / Spoilers off) per wiki namespace, **spoiler masking** for wiki blocks ahead of the current reading position (with padlock + “Keep reading to unlock”), **lock icons** on page titles in the list when gated, and filters **Quick Capture** / **Ctrl+K quick lookup** so hidden pages do not appear in suggestions.

**Scope:** Desktop (Tauri) primary. Phase 6 (export/import, backup `wiki.db`) may be tested alongside.

---

## Preconditions

1. App runs (`pnpm tauri dev` or web).
2. At least one book with wiki pages/blocks (Phase 2–3).
3. For **group** namespaces: optional second book in the same group to verify “other book finished vs reading” behavior.

---

## 1. Reader wiki panel — Re-read mode

| Step | Action                                      | Expected                                                                                                                              |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Open **Wiki** panel while reading           | Header shows **Auto** / **Spoilers on** / **Spoilers off** and export/import icons.                                                   |
| 1.2  | Set **Spoilers off**                        | All blocks and summaries visible regardless of position.                                                                              |
| 1.3  | Set **Spoilers on**                         | Blocks after current CFI show locked card (blur + padlock + hint).                                                                    |
| 1.4  | Set **Auto**, book **reading**              | Blocks at/before current position visible; later blocks locked if namespace is in spoiler mode (e.g. not finished, or imported wiki). |
| 1.5  | Mark book **finished** in library, **Auto** | Spoiler gating relaxed per finished status where applicable.                                                                          |

---

## 2. Page list — lock badge

| Step | Action                               | Expected                                                                                                            |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 2.1  | With spoilers active, open page list | Pages that are gated show a **lock** icon next to the title.                                                        |
| 2.2  | Click a locked page                  | Page editor may show summary/blocks locked with “Keep reading to unlock” when the page itself is ahead of progress. |

---

## 3. Quick Capture & quick lookup

| Step | Action                         | Expected                                      |
| ---- | ------------------------------ | --------------------------------------------- |
| 3.1  | **Add to Wiki** — search pages | Gated pages do not appear in the picker list. |
| 3.2  | **Ctrl+K** quick lookup        | Gated pages do not appear in results.         |

---

## 4. Global `/wiki` route

| Step | Action                         | Expected                                                                         |
| ---- | ------------------------------ | -------------------------------------------------------------------------------- |
| 4.1  | Open `/wiki`, select namespace | Toolbar shows Re-read dropdown + export/import.                                  |
| 4.2  | **Auto** with no book open     | Gating uses per-book **finished** status for blocks from other books in a group. |

---

## Pass / fail sign-off

- [ ] Re-read mode Auto / on / off in reader header
- [ ] Locked blocks (padlock) and page lock icons
- [ ] Page/summary hidden when entire page is gated
- [ ] Quick Capture + Ctrl+K filter gated pages
- [ ] `/wiki` toolbar + behavior

Record: **branch**, **OS**, screenshot if anything fails.
