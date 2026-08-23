# Markdown Reader Product Specification

## Project

**Name:** Markdown Reader

**Goal:** Create a private, responsive Markdown reader optimized for comfortable long-form reading. It should eventually run as a browser application, Docker container, and cross-platform desktop application.

## Current Stack

- React
- TypeScript
- Vite
- Custom CSS
- Docker/Nginx build
- Tauri may be added later
- Files are processed locally and must not be uploaded
- Use the public npm registry through a project-level `.npmrc`
- Do not modify global npm configuration

## File Access

- The MVP opens only files or folders explicitly selected through browser pickers, or individual files explicitly dropped onto the application.
- Avoid broad macOS or Windows filesystem permissions.
- Docker must not mount or scan the user’s home directory.
- Drag-and-drop should use browser file access.
- Folder access is session-only; filesystem handles are not persisted.

## MVP Functionality

- [x] Open `.md` and `.markdown` files
- [x] Explicit session-only folder navigation
- [x] Individual-file drag-and-drop
- [x] GitHub-flavored Markdown
- [x] Clickable, duplicate-safe heading navigation
- [x] Current-section highlighting
- [x] Document search and match highlighting
- [x] Responsive desktop, tablet, and phone layouts
- [x] Focus mode
- [x] Reading preferences stored locally
- [x] External links open safely in another tab
- [x] Relative Markdown links and images resolve inside a granted folder
- [x] Tables, task lists, ordered lists, blockquotes, images, syntax-highlighted code blocks with copy controls, KaTeX math, sanitized inline HTML, and themed Mermaid diagrams with copy, full-screen, PNG, and SVG controls

## Themes

- Light
- Dark
- Sepia
- High Contrast
- Mono
- Cappuccino
- Custom colors later

## Fonts

- Inter
- Source Serif 4
- Literata
- Charter
- Atkinson Hyperlegible
- System Sans
- JetBrains Mono
- System Mono

## Defaults

- Light and Dark: Inter
- Cappuccino: Source Serif 4 or Literata
- Mono: JetBrains Mono
- All code blocks: JetBrains Mono

## Reading Controls

- Font family
- Font size
- Line height
- Reading width
- Background color
- Text color
- Accent color
- Code theme
- Reset preferences

## Design

- Reading-focused editorial interface
- Calm, polished, and non-generic
- Strong typography and spacing
- Avoid generic admin-dashboard styling
- Responsive sidebar on desktop
- Collapsible sidebar on tablet
- Navigation drawer on mobile
- Accessibility and readable contrast are required
- Mono and Cappuccino are additional presets, not replacements

## Resolved MVP Problems

- [x] Focus mode has a working handler, Exit Focus control, and Escape-key support.
- [x] `react-markdown` replaces the handwritten parser and renders ordered lists correctly.
- [x] Formatted headings use structural labels and duplicate-safe IDs.
- [x] Code-block text has accessible contrast.
- [x] Relative links never navigate to broken localhost routes.

## Required Technical Change

- [x] Replace the handwritten parser with `react-markdown`.
- [x] Add `remark-gfm`.
- [x] Sanitize output using `rehype-sanitize`.
- [x] Generate stable heading IDs and table of contents.
- [x] Preserve search highlighting.
- [x] Open external links in a new tab with safe `rel` attributes.
- [x] Resolve local relative links only after explicit folder permission.

## Post-MVP Roadmap

The approved sequence is maintained in [`POST_MVP_IMPLEMENTATION_PLAN.md`](POST_MVP_IMPLEMENTATION_PLAN.md). Work proceeds one priority at a time:

1. Tabs and session-only document management
2. Bundled Open Cheat Sheet action — complete
3. Import Markdown source-action experience — complete
4. Direct browser URL import and public GitHub README support — complete
5. Read-only Obsidian Markdown subset and bundled cheat sheet
6. Markmap mind-map view for the active document
7. Editor functionality only after a separate product and security review

Longer-term items include Tauri desktop packaging, persistent folder permissions, cloud synchronization, bookmarks/history, document export, large-library indexing, and custom theme preset management.

Remote URL imports are an explicit user-directed download, not an upload. They must use direct browser fetching without a server proxy, remain subject to browser CORS controls, pass through the existing untrusted-Markdown sanitization pipeline, and never weaken local file-access boundaries.

## Development Rules

- Work directly in this repository.
- Use TypeScript strict mode.
- Do not use `dangerouslySetInnerHTML` for Markdown.
- Do not weaken browser or filesystem security.
- Run `npm ci` when the lockfile is present.
- Run TypeScript checks and `npm run build` before declaring completion.
- Review responsive behavior.
- Explain important tradeoffs briefly.
- Do not ask the user to copy individual files or manually apply code changes.
- Do not commit or push unless the user approves.
- Preserve unrelated user changes.
