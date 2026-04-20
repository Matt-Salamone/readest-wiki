# Wiki namespaces (library groups)

Wiki data is scoped by **namespace** rows in `wiki.db` (`wiki_namespaces`).

## Resolution rules (`WikiStore.resolveNamespaceForBook`)

- **Grouped book** — when `Book.groupName` and `Book.groupId` are both set (from **Group Books** in the library):
  - `id` = `group:` + `groupId` (same md5 fingerprint as `libraryStore.getGroupId(groupName)`).
  - `kind` = `group`.
  - `title` = full `groupName` path (may include `/` for nested groups).
- **Ungrouped book** — otherwise:
  - `id` = `book:` + (`metaHash` if set, else `hash`).
  - `kind` = `standalone`.
  - EPUB/file `metadata.series` is **not** used for wiki scoping.

## Renames

When the user renames a library group in `GroupingModal`, `WikiStore.renameGroupNamespace(oldPath, newPath)` updates `wiki_namespaces.id` / `title` and retargets `wiki_pages` and `wiki_tags` so existing wiki content stays with the group. Nested paths produce one rename call per distinct `(oldPath, newPath)` pair.

## Dev reset

If you change namespace rules during development, delete `wiki.db` (or use a fresh profile) to avoid stale `series:` rows from older builds.
