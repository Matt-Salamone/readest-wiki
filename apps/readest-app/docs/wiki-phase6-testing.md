# Manual testing — Personal wiki Phase 6 (portability + backup wiki.db)

Phase 6 adds **Export wiki** / **Import wiki** (`.wiki.json`), **`imported:*` namespaces** with `importedMode` for spoiler-safe sharing, and includes **`data/wiki.db`** (and `-shm`/`-wal` if present) in **library backup zips** with restore support.

---

## Preconditions

1. App runs (`pnpm tauri dev` or web).
2. At least one wiki namespace with pages/blocks (Phase 2–3).

---

## 1. Export / import JSON

| Step | Action                                              | Expected                                                                                    |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.1  | Reader **Wiki** header — **Export** (download icon) | Saves `*.wiki.json`; toast success.                                                         |
| 1.2  | **Import** (upload icon) — choose JSON              | Prompt: merge into current vs new namespace; import succeeds; toast.                        |
| 1.3  | `/wiki` — same icons in namespace toolbar           | Same behavior.                                                                              |
| 1.4  | Import into **new** namespace                       | New `imported:…` namespace appears in `/wiki` list; `importedMode` forces spoiler behavior. |
| 1.5  | Invalid file                                        | Error toast (“Not a Readest wiki export” / invalid JSON).                                   |

---

## 2. Backup zip includes wiki DB

| Step | Action                                                      | Expected                                                                                                             |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Create wiki data, then **Library → Backup** (or equivalent) | Zip contains `library.json`, `Books/...`, and **`data/wiki.db`** (and optional `-shm`/`-wal`).                       |
| 2.2  | Restore backup on a clean profile / second machine          | Library restores; wiki content matches after restore (may require app restart if DB was locked — see risks in plan). |

---

## 3. Regression

| Step | Action                | Expected                   |
| ---- | --------------------- | -------------------------- |
| 3.1  | Phase 4 spoiler modes | Still work after import.   |
| 3.2  | Phase 5 `/wiki` index | Lists imported namespaces. |

---

## Pass / fail sign-off

- [ ] Export `.wiki.json` from reader + `/wiki`
- [ ] Import merge + new imported namespace
- [ ] Backup zip contains `data/wiki.db`
- [ ] Restore round-trip (best-effort; note if restart needed)

Record: **branch**, **OS**, screenshot if anything fails.
