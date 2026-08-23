# Changelog

Markdown Reader follows [Semantic Versioning](https://semver.org/). This file records user-visible changes beginning with the editor milestone.

## [0.2.0] - Unreleased

### Added

- A lazy-loaded CodeMirror 6 Markdown editor with theme-aware syntax highlighting.
- Preview, Write, responsive Split, and Mind map modes stored independently for each open document.
- A live, sanitized Split preview that is side by side on desktop, stacked on tablet, and replaced by the mode switcher on phone, with a draggable and keyboard-adjustable per-tab divider.
- Session-only drafts with tab dirty markers, cursor, editor-scroll, reader-scroll, and split-preview-scroll preservation, plus unsaved-change protection.
- Chromium coverage for real editor input, live preview, responsive layouts, and automated accessibility checks.

### Changed

- The package and documented application version are now `0.2.0`.
