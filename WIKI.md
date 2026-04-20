# Executive Summary

The plan is to add an integrated personal wiki designed specifically for consumers of complex fiction and expansive fantasy/sci-fi universes. Navigating intricate plots, massive character rosters, and dense lore often drives readers to online wikis, exposing them to major plot spoilers. We will solve this by empowering readers to actively build their own chronological, customized reference guides in real-time, directly within their reading environment.

By seamlessly bridging the gap between an immersive reading experience and a robust knowledge-management system, we will transform passive reading into active world-building. The value proposition lies in friction-free data capture—allowing users to extract quotes, jot down thoughts, and interconnect concepts without leaving the page—resulting in a spoiler-free, highly personalized companion guide that grows alongside the reader's journey.

# Core Functional Requirements

## Immersive Reading Experience

- **Series Grouping**: The system MUST allow users to categorize books as standalones or group them into custom or existing series. This can piggyback off of the existing grouping feature.
- Need to add “Add to Wiki” to the text selection context menu.
- Wiki block quotes should take advantage of the existing in-text note highlights.

## Wiki Generation & Management

- **Modular Content Blocks**: The system MUST structure wiki entries using "Blocks." A valid block MUST contain a **section** (optional but recommended for grouping), a specific book location identifier, plus at least one of the following: a user note or a highlighted quote.
- **Dynamic Linking**: The system MUST support bracket-based syntax (e.g., `[[Character Name]]`) for cross-referencing.
- **Just-In-Time (JIT) Page Creation**: The system MUST generate "ghost" or placeholder pages for broken links, allowing users to tap a grayed-out link to instantly initialize that new wiki page.
- **Cascading Title Updates**: The system MUST automatically update all corresponding inbound links across the entire wiki if a page title is renamed.

## Data Portability & Ecosystem

- **Chronological State Tracking**: The system MUST be able to filter wiki visibility globally based on the user's current reading progression percentage within a specific book.
- There needs to be a way to save, sync, and share a wiki

# Expanded Feature Set

- **Page types & sections**: Wiki **pages** are categorized by structured **page types** (**Person, Location, Faction, Item, Concept, Lore, Misc**). Each **block** may belong to one **section** (e.g. Appearance, Lore, History)—the heading under which blocks are grouped on that page. A **global section catalog** (shared across every wiki / namespace) supplies preset sections and accumulates user-created section names so labels stay consistent library-wide.
- **Chronological Block Architecture**: Because every wiki block is strictly tied to a specific location in the book, the wiki inherently builds a chronological timeline of when the user learned specific information. This allows users to review a character's arc exactly as it unfolded in the text
- **Dynamic Spoiler Protection (Re-read Mode)**: When a user restarts a book (or toggles "Re-read Mode"), the wiki acts as a temporal database. It progressively discloses information by automatically masking wiki blocks and pages that occur after the user's current reading location, allowing them to consult past notes without spoiling late-game revelations they may have forgotten.
  - This can piggyback off of the existing "status" feature (i.e., "Mark as Unread"/"Mark as Finished")
- **Chronological Wiki Export (Safe Sharing)**: Users can package their entire customized wiki for a book or series and share it. Because the exported data retains its strict chronological anchoring, the recipient can import this "companion guide" and experience the original reader's insights progressively. The recipient's app will keep future notes hidden until they physically reach that point in the text.
- **Quote Toggling**: Within a wiki page, users can collapse or hide the direct text quotes within a block, leaving only their personal notes visible.
- **Multi-Tiered Contextual Search**: The wiki search operates on two levels. The **In-Reader Modal** acts as a quick-reference tool, prioritizing partial matches on page titles to quickly jump to a character sheet. The **Global Wiki Search** provides a deep-dive index, filterable by entity type and sortable by chronological discovery.
- **Frictionless Quick-Notes**: The chrome includes a direct "+" button that bypasses text highlighting. This allows users to capture fleeting thoughts or realizations, linking the note automatically to their current page without requiring a specific text anchor.

# User Interface & Experience

## Primary User Journey: The Discovery Loop

1. **Read & Encounter**: The user begins reading. They encounter a new, complex magic system concept.
2. **Capture & Categorize**: The user highlights the paragraph explaining the magic. The context menu appears. They select "Add to Wiki." A quick-capture overlay opens where they choose the wiki **page**, optional **section** (from the shared catalog or a new section name), and set the **page type** when creating a new page—e.g. **Lore** as the page type for a lore article.
3. **Connect & Expand**: While writing their note, they surround a related character's name in brackets `[[Kaladin]]`.
4. **Review & Navigate**: Days later, the user opens the Wiki Entry for that Lore page. They tap the `[[Kaladin]]` link (which acts as a JIT trigger to create the character page) and review the chronological blocks of information they've gathered about him, organized under **section** headings on that page.

## Key UI Screens

- **Quick capture (Phase 2) / In-reader Wiki Modal (later phases)**: A non-intrusive overlay triggered by highlighting, the header `+` button, or searching. It allows rapid data entry (saving quotes/notes with an optional **section**) or quick retrieval without losing the user's place in the narrative context.
- **The Wiki Entry Page**: The core knowledge hub. The top features a highly visible, editable title and a standard Markdown editor for high-level summaries. Below, content is grouped visually by **section** headings. Under each heading are the Blocks, displaying the book location, the hideable text quote, and the user's personal note. _In Re-read or Imported mode, blocks ahead of the current reading position are blurred out with a "Keep reading to unlock" padlock icon._
- **The Wiki Index**: A powerful directory view. Users can filter their vast database by visual icons representing the **page types** (Person, Location, etc.) and sort by the exact chronological order the concepts were introduced in the text.
