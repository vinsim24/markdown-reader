# Markdown Reader Post-MVP Implementation Plan

This document records the approved post-MVP feature order. Product requirements remain authoritative in `PRODUCT_SPEC.md`; durable development rules remain in `../AGENTS.md`. Implement and verify one priority at a time before starting the next.

## Priority 1 — Tabs and document sessions — Complete

- Add accessible, responsive tabs for open documents.
- Opening a local file creates or activates a tab instead of replacing every open document.
- Folder navigation activates an existing tab for that file or opens a new one; relative links continue in the current document context unless their target is already open.
- Closing the active tab selects an adjacent tab; closing the final tab returns to the private welcome screen.
- Tab state and document contents remain session-only and are never written to persistent browser storage.

## Priority 2 — Open Cheat Sheet

- Bundle an offline Markdown cheat sheet with the application.
- Open it as a read-only document tab through a prominent source action.
- Keep the application empty by default; the cheat sheet opens only after an explicit user action.

## Priority 3 — Import Markdown experience

- Present the existing local file picker as an Import Markdown source action alongside Open Folder and Open Cheat Sheet.
- Continue processing selected files only in the browser, without uploads or broader filesystem permissions.

## Priority 4 — Import from URL and GitHub README

- Fetch a user-supplied public Markdown URL directly from the browser and open it in a tab.
- Support raw Markdown URLs and common public GitHub repository/README URLs.
- Do not add a server-side proxy; explain CORS, network, content-type, size, and validation failures clearly.
- Treat fetched Markdown as untrusted input and keep the existing sanitization and safe-link policies.

## Priority 5 — Obsidian Markdown and cheat sheet

- Add a documented, read-only Obsidian compatibility subset: properties, wikilinks, embeds, callouts, tags, and highlights.
- Resolve vault-relative notes and assets only inside a folder the user explicitly opened.
- Provide a bundled Obsidian Markdown cheat sheet that opens in a tab.

## Priority 6 — Markmap mind-map view

- Provide an interactive mind-map view of the active Markdown tab.
- Support zoom, pan, branch folding, full screen, and SVG/PNG export.
- Keep Reader and Mind Map as alternate views of the same session document.

## Deferred — Editor

Editing and saving Markdown remain deferred until the reader, tabs, imports, Obsidian rendering, and Markmap view are stable. Editor work must receive a separate product and security review before implementation.

## Verification gates

- Add Vitest coverage for session-state rules and React Testing Library coverage for tab interactions.
- Add Chromium Playwright coverage for opening, switching, and closing tabs at desktop and mobile widths.
- Run `npm run verify` after each priority and Chromium Playwright before every push.
- Preserve the manual Chrome or Edge Open Folder permission-flow release gate.
