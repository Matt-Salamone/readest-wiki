# Manual testing — Personal wiki Phase 2 (reader capture)

Phase 2 adds **Add to Wiki** from the selection toolbar, a **Quick Capture** dialog, a header **Wiki quick note** (`+`) action, persistence in `wiki.db` via `WikiStore`, and (when saving a quote) a **mirrored highlight** through the normal `BookNote` / `view.addAnnotation` path.

**Scope:** Desktop (Tauri) is the primary target. **Out of scope** for this checklist: full `WikiModal`, `[[wiki]]` autocomplete, spoiler gating, global `/wiki` index (later phases).

---

## Preconditions

1. App runs on desktop (`pnpm tauri dev` or equivalent once the Rust toolchain builds).
2. Prefer an **EPUB** with reliable text selection and CFI for highlight mirroring.
3. Optional: empty or populated `wiki.db` — note which you used when reporting issues.

---

## 1. Selection toolbar — Add to Wiki

| Step | Action                             | Expected                                                                                        |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1.1  | Open a book, select text           | Annotation popup appears.                                                                       |
| 1.2  | Locate **Add to Wiki** (book icon) | Present with sensible tooltip.                                                                  |
| 1.3  | Click **Add to Wiki**              | **Quick Capture** opens; quote appears in a read-only **Quote** block when text was selected.   |
| 1.4  | While the dialog loads             | No **“concurrent use forbidden”** (or similar) error bar; wiki list loads or shows empty state. |

---

## 2. Quick Capture — wiki page choice

| Step | Action                                                                      | Expected                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Type a **new** title that **does not** slug-match any existing wiki page    | **Page type** selector appears (Person, Location, …).                                                                                                    |
| 2.2  | Type text that **slug-matches** an existing page title (same logical title) | Hint: block will attach to **that existing page**. There is **no** “create duplicate page with the same name” — titles are unique per namespace by slug. |
| 2.3  | Change the title so it **no longer** matches                                | **Page type** appears again for a genuinely new page.                                                                                                    |
| 2.4  | Pick a page from the **filtered list**                                      | Selection highlights; Save targets that page.                                                                                                            |

---

## 3. Section (single tag per block, shared catalog)

| Step | Action                                           | Expected                                                                                       |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 3.1  | **Section** dropdown                             | Built-in options (Appearance, Lore, History, …) plus custom sections saved earlier.            |
| 3.2  | Open quick capture from another book/series wiki | **Same catalog** — sections are stored globally in `wiki.db`, not per wiki namespace.          |
| 3.3  | **New section** text field                       | Saving with a new name adds it to the catalog; it appears in the dropdown on the next capture. |
| 3.4  | Both **New section** and dropdown set            | **New section** overrides the menu (per on-screen hint).                                       |
| 3.5  | Save with a section                              | Block has **one** tag id for that section (Phase 3 uses it as the heading).                    |
| 3.6  | Optional                                         | Same section typed with different casing reuses the stored spelling (case-insensitive match).  |

---

## 4. Note and Save

| Step | Action                                 | Expected                                                                               |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| 4.1  | Leave note empty, save with quote only | Saves where product rules allow (quote and/or note and/or section per `useAddToWiki`). |
| 4.2  | Add markdown in **Note**, Save         | Modal closes; no uncaught errors.                                                      |
| 4.3  | Cancel                                 | Modal closes without saving.                                                           |

---

## 5. Highlight mirroring (selection + quote)

| Step | Action                                  | Expected                                             |
| ---- | --------------------------------------- | ---------------------------------------------------- |
| 5.1  | After saving a capture **with** a quote | Passage appears highlighted like a normal highlight. |
| 5.2  | Navigate away and back                  | Highlight persists like other book annotations.      |

---

## 6. Header — Wiki quick note (`+`)

| Step | Action                                          | Expected                                       |
| ---- | ----------------------------------------------- | ---------------------------------------------- |
| 6.1  | Click **`+`** near the notebook control         | Quick Capture opens **without** a quote block. |
| 6.2  | Pick/create page, add note and/or section, Save | Saves without requiring a selection CFI.       |

---

## 7. Annotation quick action (optional)

| Step | Action                                                                           | Expected                                           |
| ---- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| 7.1  | Enable **instant** / quick action on selection; choose **Add to Wiki** if listed | Same capture flow triggers per your view settings. |

---

## 8. Regression — reader chrome

| Step | Action                             | Expected                                         |
| ---- | ---------------------------------- | ------------------------------------------------ |
| 8.1  | Highlight, Annotate→Notebook, Copy | Still work.                                      |
| 8.2  | Notebook toggler                   | Still opens notebook; `+` does not break layout. |

---

## 9. Edge cases

| Step | Action                     | Expected                                                                                  |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------- |
| 9.1  | **PDF** / fixed-layout     | Capture may omit xpointer conversion; save should not hard-crash (CFI-only path).         |
| 9.2  | Series vs standalone books | Wiki namespace follows existing `resolveNamespaceForBook` rules (series vs `book:` hash). |

---

## Pass / fail sign-off

- [ ] Add to Wiki from selection → Quick Capture → Save → success path
- [ ] Slug match → attaches to existing page; **no** duplicate same-title page affordance
- [ ] Section **dropdown** + optional **new section**; catalog shared across all wikis
- [ ] Header `+` → note-only / no-quote capture
- [ ] Quote save → highlight visible
- [ ] No concurrent DB error on dialog open

Record: **app version / branch**, **OS**, **book format**, and **screenshot** if anything fails.
