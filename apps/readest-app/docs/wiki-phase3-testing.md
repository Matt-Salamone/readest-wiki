# Manual testing — Personal wiki Phase 3 (in-reader Wiki panel)

Phase 3 adds a **Wiki** side panel (resize, pin, overlay dismiss), **page list + editor** with summary View/Edit (markdown), **blocks** grouped by section with collapsible quotes and Jump-to-CFI, **`[[link]]` autocomplete**, JIT **draft** pages, and **cascading rename** via `WikiStore.renamePage`.

**Scope:** Desktop (Tauri) is the primary target. Phase 4+ (spoilers, `/wiki` index, export) are out of scope here.

---

## Preconditions

1. App runs on desktop (`pnpm tauri dev` or equivalent).
2. Prefer an **EPUB** with selections; Phase 2 **Add to Wiki** / header `+` should already work.

---

## 1. Header — Wiki panel toggler

| Step | Action                                          | Expected                                                                |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1.1  | Click **Wiki** (book icon) in the header        | Wiki side panel opens; **Notebook** closes if it was open.              |
| 1.2  | Click **Wiki** again on the same book           | Panel closes.                                                           |
| 1.3  | Open **Notebook**, then open **Wiki**           | Notebook closes; Wiki opens.                                            |
| 1.4  | **Pin** Wiki (pushpin), click outside / overlay | Unpinned: overlay dismisses panel. Pinned: panel stays; no overlay.     |
| 1.5  | Resize panel (drag left edge on desktop)        | Width updates; persists after restart (stored in global read settings). |
| 1.6  | **Escape**                                      | Unpinned panel closes; pinned stays.                                    |

---

## 2. Quick Capture → Wiki

| Step | Action                                           | Expected                                                               |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| 2.1  | **Add to Wiki** → save                           | Wiki panel opens to the saved page (Notebook closed).                  |
| 2.2  | While capture is open, pick or slug-match a page | **Open in wiki** appears; opens panel to that page and closes capture. |

---

## 3. Page list & CRUD

| Step | Action                         | Expected                                                        |
| ---- | ------------------------------ | --------------------------------------------------------------- |
| 3.1  | **New page**                   | New page appears; selectable in list.                           |
| 3.2  | Search box                     | Filters titles.                                                 |
| 3.3  | **Delete page** in editor      | Confirm; page removed; selection clears if it was active.       |
| 3.4  | Draft / **ghost** page in list | Shows **(draft)**; **Initialize this page** clears ghost state. |

---

## 4. Summary & `[[links]]`

| Step | Action                                          | Expected                                                                             |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| 4.1  | Summary **View**                                | Markdown renders; `[[Title]]` becomes a clickable wiki link.                         |
| 4.2  | Summary **Edit**, type `[[Ab`                   | Autocomplete list appears; picking a title inserts `[[Full Title]]`.                 |
| 4.3  | Save summary (switch to View or Ctrl/Cmd+Enter) | Links persist; ghost targets created in DB appear as draft pages / links.            |
| 4.4  | Rename page title (blur title field)            | Inbound `[[Old]]` text updates to new title across summaries/notes where applicable. |
| 4.5  | Rename to an existing slug                      | Toast: title already exists; title field reverts.                                    |

---

## 5. Blocks

| Step | Action                                    | Expected                                                                                                       |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 5.1  | Sections                                  | Blocks grouped under section headings (from Phase 2 tag); **Ungrouped** when none.                             |
| 5.2  | Quote default visibility                  | **No note**: quote **shown** by default. **Has note**: quote **hidden** by default; **Show quote** reveals it. |
| 5.3  | Per-block **Show quote** / **Hide quote** | Each block toggles independently after the default above.                                                      |
| 5.4  | **Jump**                                  | Reader navigates to block CFI when present.                                                                    |
| 5.5  | Note View/Edit + `[[...]]` autocomplete   | Same behavior as summary; saving updates links.                                                                |
| 5.6  | **Delete** block                          | Block removed after confirm.                                                                                   |

---

## 6. Regression

| Step | Action                | Expected                                                    |
| ---- | --------------------- | ----------------------------------------------------------- |
| 6.1  | Phase 2 quick capture | Still saves blocks.                                         |
| 6.2  | SQLite                | No “concurrent use forbidden” when opening panel + editing. |

---

## Pass / fail sign-off

- [ ] Wiki ↔ Notebook mutual exclusion
- [ ] Panel pin / resize / Escape / overlay
- [ ] Quick Capture opens wiki to saved page + **Open in wiki**
- [ ] Summary & note markdown view + edit + `[[autocomplete]]`
- [ ] Ghost draft + Initialize
- [ ] Rename cascade + slug conflict toast
- [ ] Blocks: sections, quotes, Jump, delete

Record: **branch**, **OS**, **book format**, screenshot if anything fails.
