# Ink & Paper Revamp Specification

## Status

Approved product direction for the next Markdown Reader workstream. This document captures the visual revamp, editor, theme, and favicon scope before implementation. `PRODUCT_SPEC.md` remains the product authority, and `../AGENTS.md` remains the authority for durable development rules.

The supplied reference screens are design input, not a pixel-copy target. They demonstrate useful patterns for document tabs, a split editor and preview, and grouped appearance controls. Markdown Reader should preserve its simpler navigation and reading-first identity instead of adopting the reference product's crowded global toolbar.

## Product Direction

**Working direction:** Ink & Paper

**Brand promise:** Markdown, made comfortable.

**Design read:** A targeted brand and product-shell redesign for people reading and editing local Markdown, with a calm editorial-product language, restrained controls, and strong reading typography.

Design dials:

- Design variance: 5/10
- Motion intensity: 2/10
- Visual density: 4/10

This is an evolution of the existing application, not a framework or information-architecture rewrite. Continue using React, TypeScript, Vite, and the existing native CSS token system.

## Visual System

### Brand

- Keep the product name **Markdown Reader**.
- Replace the temporary symbol with a distinctive page-and-`M` monogram.
- Use monogram plus wordmark at desktop widths and the monogram alone when space is constrained.
- The mark must remain recognizable at 16 px and in both light and dark browser chrome.
- Use the same source mark for the application header, favicon family, installable web-app icons, and future Tauri assets.

### Color

Use one quiet ink-blue accent. Green is not the default brand color; reserve semantic green for success states.

Initial light tokens:

| Role | Value |
| --- | --- |
| Canvas | `#F6F7F8` |
| Surface | `#FCFCFD` |
| Raised/secondary surface | `#EEF1F3` |
| Primary text | `#20262C` |
| Muted text | `#5F6973` |
| Border | `#DDE2E6` |
| Accent | `#3F6396` |
| Accent soft | `#E5ECF5` |

Initial dark tokens:

| Role | Value |
| --- | --- |
| Canvas | `#161A1E` |
| Surface | `#1D2227` |
| Raised/secondary surface | `#252B31` |
| Primary text | `#E8ECEF` |
| Muted text | `#A5ADB5` |
| Border | `#333B43` |
| Accent | `#87AADB` |
| Accent soft | `#26374D` |

All final token combinations must pass WCAG contrast checks. Color must never be the only indicator of selected, dirty, error, or success state.

### Typography and Shape

- Keep Inter as the neutral interface and default Light/Dark reading face.
- Keep the selected reading font independent from the editor font.
- Use JetBrains Mono for the editor and all code blocks.
- Use 8 px radii for controls and 12 px radii for dialogs and substantial panels.
- Use subtle borders and spacing before shadows. Reserve shadows for menus and dialogs.
- Remove ornamental traffic-light dots from code blocks. Keep the language label on the left and Copy on the right.
- Use one consistent icon family during implementation; do not mix glyph styles or use emoji as interface icons.

## Product Shell

- Keep the top bar to one calm row, approximately 64 px high.
- Preserve a clear source-action hierarchy: **Import Markdown** first, **Open Folder** second, and less common actions in **More**.
- Keep the cheat sheets and examples discoverable without turning every example into a top-level button.
- Use document tabs for open sessions, with unambiguous close controls and a visible unsaved marker when editing is introduced.
- Keep the desktop navigation near 240 px and reduce boxed or card-like treatment inside it.
- Use an ink-blue marker plus text treatment for the active document or heading.
- On tablet, collapse secondary controls before reducing readable content width.
- On phone, use a navigation drawer and mode switcher instead of persistent side-by-side panes.
- Group settings into **Appearance**, **Typography**, and **Layout** rather than presenting one long list.
- Successful import/open notices remain brief and self-dismiss. Errors persist until dismissed or resolved.

## Theme Revamp

Retain the curated themes instead of copying a large catalog of near-duplicates:

- **Light:** Ink & Paper light defaults.
- **Dark:** Ink & Paper dark defaults.
- **Sepia:** low-glare warm paper for long reading.
- **Cappuccino:** richer warm literary preset.
- **Mono:** distraction-free monochrome with JetBrains Mono.
- **High Contrast:** accessibility-first preset with explicit focus and selection states.

Theme work includes:

- Harmonize canvas, panel, text, border, accent, code, Mermaid, Markmap, selection, and focus tokens for every preset.
- Show compact preview swatches and a plain-language description for each preset.
- Preserve existing font, size, line height, reading width, and reset controls.
- Store preferences locally, but never store document content with them.
- Keep custom colors and custom CSS out of this revamp. They require a separate usability and security design.
- Test code syntax, math, Mermaid, Markmap, tables, task lists, links, selection, and focus indicators across every preset.

## Editor Scope

The separate product and security review previously required by the roadmap is satisfied by this specification. Implementation remains incremental and must preserve the reader as the primary experience.

### Editing Model

- Use CodeMirror 6 as a lazily loaded Markdown editor. Do not build a handwritten editor or use a plain textarea as the production editor.
- Provide three modes for the active document: **Reader**, **Split**, and **Editor**.
- Desktop Split uses an editor and live preview side by side. A simple stable ratio is acceptable in the first milestone; resizing can follow after the interaction is proven.
- Tablet may offer Split when space permits and otherwise uses the mode switcher.
- Phone switches between Editor and Reader. It must not squeeze both panes side by side.
- Reuse the existing sanitized Markdown rendering pipeline for live preview, including GFM, relative links and images, math, Mermaid, Obsidian compatibility, and syntax highlighting.
- Lazy-load the editor only when a user first enters Editor or Split so the reading path remains lightweight.

### Initial Capabilities

- Markdown-aware syntax highlighting and line numbers.
- Tab indentation, undo/redo, keyboard selection, and editor search.
- Preserve each tab's draft, selection, editor scroll position, and reader scroll position during the session.
- Show a textual and visual unsaved state on a modified tab.
- Warn before closing or replacing a dirty draft.
- Provide a focused formatting toolbar for headings, bold, italic, strike, links, images, ordered and unordered lists, tasks, blockquotes, code, and tables. Toolbar behavior must preserve the current selection and have keyboard-accessible labels.

### Save and Security Boundaries

- Document contents remain local and are never uploaded by editing features.
- Editing is session-only by default.
- **Download .md** is the universal save/export fallback.
- A file selected through a normal browser input cannot be silently overwritten.
- Direct **Save** is available only when the file was opened through an explicitly granted writable File System Access API handle and the browser still grants permission.
- Do not autosave to disk or persist filesystem handles in the first editor release.
- URL imports, bundled examples, and cheat sheets open as editable copies and can only be saved through download or an explicit Save As flow. They never write back to their source.
- Files opened through directory-input fallback are not silently overwritten.
- Do not store Markdown drafts in `localStorage`. Warn on page exit when a dirty session exists.
- Abstract writable filesystem behavior so automated tests use an in-memory adapter and never automate native operating-system dialogs.

## Favicon and App Icon

- Create a vector source for the page-and-`M` monogram.
- Ship `favicon.svg`, conventional small PNG fallbacks, an Apple touch icon, 192 px and 512 px web-app icons, and a web manifest.
- Add appropriate browser `theme-color` metadata for light and dark color schemes.
- Verify the mark at 16, 32, 180, 192, and 512 px. Do not put wordmark text inside the favicon.
- Keep enough padding and contrast that the icon remains legible in light, dark, pinned-tab, and installed-app contexts.

## Implementation Order

Work one priority at a time:

1. **Brand foundation and favicon:** finalize tokens, monogram, favicon set, manifest metadata, and shared icon conventions.
2. **Shell refinement:** simplify the header, start page, sidebar, document tabs, menus, and transient status treatment under the new tokens.
3. **Theme refinement:** update all six presets, group settings, add previews/descriptions, and verify contrast across reader features.
4. **Editor foundation:** add the session draft model, CodeMirror, Reader/Editor switching, dirty state, and lazy loading.
5. **Split view:** add responsive live preview, state/scroll preservation, and desktop/tablet/phone behavior.
6. **Safe save flow:** add Download, capability-aware Save/Save As, dirty-close safeguards, and in-memory filesystem tests.
7. **Editor toolbar and polish:** add formatting actions, keyboard/a11y refinements, and cross-theme quality checks.

Brand tokens precede editor implementation so the editor is not styled twice. Session and save boundaries precede toolbar expansion so the editing model is safe before it becomes feature-rich.

Deliver the visual Ink & Paper work, Docker verification, and editor milestones on focused branches. Merge each workstream through a reviewed pull request after its relevant verification passes. Complete and merge the visual revamp first, verify and document Docker deployment second, and begin editor implementation only after both are merged. Do not implement these priorities directly on `main`.

## Verification

### Unit and Component

- Vitest covers editor session state, dirty-state transitions, save capabilities, filename handling, and preference migration.
- React Testing Library with `user-event` covers mode switching, typing-to-preview, tab dirty indicators, close guards, theme selection, settings groups, and formatting actions.
- Use injected in-memory file and writable-file adapters for filesystem behavior.

### Browser and Responsive

- Playwright covers Reader, Editor, and Split modes at desktop, tablet, and phone widths.
- Use `setInputFiles` for local-file and directory-input fallback coverage; never automate the native folder or save dialog.
- Verify relative links and assets, unsaved-close behavior, downloads, keyboard navigation, and the complete theme matrix in Chromium.
- Run `@axe-core/playwright` checks for the shell, settings, editor, and split view.
- Run Chromium before every push and Firefox/WebKit before the revamp release.
- Manually verify real Open Folder and writable Save permission flows in Chrome or Edge on Windows before release.

## Out of Scope

- Rich-text or WYSIWYG editing
- Collaborative editing, accounts, or cloud synchronization
- Writing back to remote URLs
- Silent autosave or persistent filesystem handles
- Custom CSS and arbitrary theme scripting
- PDF, Word, or publishing export
- A plugin marketplace
- Advanced multi-cursor or IDE features
