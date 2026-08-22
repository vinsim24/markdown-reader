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

- The MVP opens only files explicitly selected through the browser picker.
- Avoid broad macOS or Windows filesystem permissions.
- Docker must not mount or scan the user’s home directory.
- Drag-and-drop should use browser file access.
- Folder access and linked local Markdown files are a future feature.

## MVP Functionality

- Open `.md` and `.markdown` files
- Drag-and-drop
- GitHub-flavored Markdown
- Clickable heading navigation
- Current-section highlighting
- Document search
- Responsive desktop, tablet, and phone layouts
- Focus mode
- Reading preferences stored locally
- External links open safely in another tab
- Relative links must not navigate to broken localhost routes
- Tables, task lists, ordered lists, blockquotes, images, and code blocks

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

## Current Problems

- Focus mode has no working handler.
- It needs an Exit Focus control and Escape-key support.
- The handwritten Markdown parser breaks Markdown links.
- Ordered lists appear as a single paragraph.
- Linked headings display raw Markdown syntax.
- Code-block text has insufficient contrast.
- Relative links navigate to broken localhost routes.

## Required Technical Change

- Replace the handwritten parser with `react-markdown`.
- Add `remark-gfm`.
- Sanitize output using `rehype-sanitize`.
- Generate stable heading IDs and table of contents.
- Preserve search highlighting.
- Open external links in a new tab with safe `rel` attributes.
- For now, intercept relative links and explain that folder access is required.

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

