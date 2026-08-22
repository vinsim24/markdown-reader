# Markdown Reader MVP Implementation Plan

This document records the execution order and verification gates for the MVP. Product requirements remain authoritative in `PRODUCT_SPEC.md`; durable development rules remain in `../AGENTS.md`.

## Priority 0 — Baseline and architecture — Complete

- Confirm clean `main`, inspect architecture and guidance, and run baseline TypeScript/build checks.
- Introduce focused modules only as feature work requires them.
- Document the milestone commit-and-push workflow.
- Commit: `93added` (`docs: document milestone development workflow`)

## Priority 1 — Local Markdown folder navigation — Complete

- Explicit Open Folder flow with File System Access API and directory-input fallback.
- Session-only recursive folder scan, normalized paths, collapsible file tree, local relative Markdown links, anchors, and images.
- Root-boundary protection and path-resolution tests.
- Commit: `452003e` (`feat: add local Markdown folder navigation`)

## Priority 2 — Core reader usability — Complete

- Individual-file drag-and-drop overlay and validation.
- IntersectionObserver current-section navigation.
- Structural, duplicate-safe GitHub-style heading IDs and matching TOC labels.
- Versioned, validated local preference persistence without document contents or filesystem handles.
- Commit: `38875e1` (`feat: improve reader navigation and persistence`)

## Priority 3 — Reading appearance and typography — Complete

- Line height, custom colors, contrast warning, code themes, and theme/all-preference resets.
- Charter, System Sans, and System Mono choices alongside existing fonts.
- Theme-specific implicit font defaults that preserve explicit user choices.
- Commit: `4394c89` (`feat: expand reading appearance controls`)

## Priority 4 — Responsive behavior and accessibility — Complete

- Distinct desktop, tablet, and mobile layout behavior.
- Accessible button names/types, control labels, ARIA state, dialog semantics, focus trap/restore, scoped Escape behavior, and status messages.
- Keyboard-visible focus, reduced-motion support, accessible contrast, and overflow protection.
- Commit: `03d3b4c` (`fix: improve responsive behavior and accessibility`)

## Priority 5 — Quality, documentation, and MVP completion — Complete

- Vitest unit tests and React Testing Library component tests with `user-event`.
- Playwright Chromium end-to-end and responsive tests using fixture folders and `setInputFiles`; axe accessibility checks.
- GitHub Actions verification on pushes to `main`, with failure artifacts.
- Locally bundled open-licensed fonts and complete README/product-spec updates.
- Clean `npm ci`, `npm run verify`, Chromium E2E, Docker availability/build, security/diff review, and branch synchronization.
- Automated verification passed with `npm run verify`, Chromium Playwright, axe, and the Docker build.
- Manual real Open Folder permission verification in Chrome or Edge on Windows remains a release gate because native operating-system dialogs are intentionally not automated.
- Commit: `chore: finalize Markdown Reader MVP`

The Priority 5 changes were intentionally batched, then checked with the full automated verification gate immediately before the final commit.

## Required scripts

- `npm run typecheck`
- `npm run test`
- `npm run test:watch`
- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:a11y`
- `npm run build`
- `npm run verify`

Chromium must pass before every push. Firefox and WebKit must be tested before an MVP release. Native operating-system folder dialogs are never automated.
