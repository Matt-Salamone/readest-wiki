# Manual testing — Personal wiki Phase 5 (global index + quick lookup)

Phase 5 adds the **global `/wiki` route** (namespace list, page list with type filter + chronological sort, full page editor + backlinks), a **Wiki** icon in the **library header**, and **Wiki Quick Lookup** (`Ctrl/Cmd+K`) in the reader.

**Scope:** Desktop (Tauri) primary. Phase 4 (spoiler gating) is out of scope.

---

## Preconditions

1. App runs (`pnpm tauri dev` or web build).
2. At least one book with wiki data (Phase 2–3): namespaces exist, a few pages and blocks.
3. Optional: grouped vs standalone namespaces to verify both appear in the sidebar.

---

## 1. Library — Wiki entry

| Step | Action                           | Expected                                         |
| ---- | -------------------------------- | ------------------------------------------------ |
| 1.1  | Open **Library**                 | Header shows a **Wiki** (book) icon near import. |
| 1.2  | Click **Wiki**                   | Navigates to `/wiki` with namespaces listed.     |
| 1.3  | Click **Library** in wiki header | Returns to library.                              |

---

## 2. Global `/wiki` — namespaces & URL

| Step | Action                     | Expected                                                             |
| ---- | -------------------------- | -------------------------------------------------------------------- |
| 2.1  | Open `/wiki` with no query | URL updates to include `?ns=<firstNamespaceId>` (canonical).         |
| 2.2  | Click another namespace    | URL `ns` changes; page list reflects that wiki.                      |
| 2.3  | Sidebar row                | Shows page count and block count (approximate sanity: non‑negative). |

---

## 3. Page list — filter & sort

| Step | Action                      | Expected                                                                  |
| ---- | --------------------------- | ------------------------------------------------------------------------- |
| 3.1  | **All** + type chips        | Filtering by type (e.g. Person) only shows matching pages.                |
| 3.2  | **A–Z** / **Chronological** | Order toggles; chronological follows page `createdAt` ascending.          |
| 3.3  | Search box                  | Still filters titles within the current filter/sort.                      |
| 3.4  | **New page**                | Creates page and selects it; URL gains `page=` when selection propagates. |

---

## 4. Page editor & backlinks (no reader `bookKey`)

| Step | Action                         | Expected                                                                   |
| ---- | ------------------------------ | -------------------------------------------------------------------------- |
| 4.1  | Edit summary, `[[Link]]`, save | Same behavior as in-reader wiki panel (ghost targets, links).              |
| 4.2  | **Backlinks** section          | Lists pages that link to the current page (summary vs block note).         |
| 4.3  | Click a backlink source title  | Selects that source page in the index (`page=` in URL).                    |
| 4.4  | Block **Jump** (has CFI)       | Opens reader with `cfi=` in URL; reader navigates to location once loaded. |

---

## 5. Reader — Wiki Quick Lookup (`Ctrl/Cmd+K`)

| Step | Action                                | Expected                                                                 |
| ---- | ------------------------------------- | ------------------------------------------------------------------------ |
| 5.1  | Open a book, press **Ctrl/Cmd+K**     | Modal opens; search focuses.                                             |
| 5.2  | Type partial title                    | Results ranked (prefix matches above substring-only).                    |
| 5.3  | **Arrow Up/Down**, **Enter**          | Opens **Wiki** panel to that page; modal closes.                         |
| 5.4  | **Esc** or backdrop click             | Modal closes without opening the panel.                                  |
| 5.5  | **Ctrl/Cmd+K** again while modal open | Toggles modal closed.                                                    |
| 5.6  | No book open (edge)                   | Modal shows hint to open a book (or shortcut no-ops per implementation). |

---

## 6. Regression — Phase 3 reader wiki

| Step | Action                  | Expected                                                        |
| ---- | ----------------------- | --------------------------------------------------------------- |
| 6.1  | Reader **Wiki** panel   | Page list **without** index toolbar chips (unless intentional). |
| 6.2  | Default list sort       | Still **A–Z** by title.                                         |
| 6.3  | Block **Jump** in panel | Still jumps in-place with `bookKey` set.                        |

---

## Pass / fail sign-off

- [ ] Library Wiki icon → `/wiki` → back to Library
- [ ] Namespace sidebar + canonical `?ns=`
- [ ] Type filter + chronological sort + search + new page
- [ ] Backlinks + navigate to source page
- [ ] Jump from `/wiki` → reader with `cfi` navigation
- [ ] Ctrl/Cmd+K lookup → panel open to chosen page
- [ ] Reader wiki panel unchanged defaults

Record: **branch**, **OS**, screenshot if anything fails.
