# Markdown Reader

A private, responsive reader for comfortable long-form Markdown. Documents are processed entirely in the browser and are never uploaded.

## MVP features

- Open individual `.md` and `.markdown` files, or drag a file into the page.
- Explicitly open a local folder and navigate a recursive Markdown file tree.
- Follow safe relative Markdown links and load relative images from the granted folder.
- Render sanitized GitHub-flavored Markdown, including tables, task lists, blockquotes, syntax-highlighted code blocks with copy controls, KaTeX math, safe inline HTML, and themed Mermaid diagrams with viewing and export controls.
- Search with match highlighting, current-section navigation, and Focus mode.
- Persist validated reading preferences locally: themes, fonts, size, width, line height, custom colors, and code theme.
- Responsive desktop, tablet, and mobile layouts with accessible keyboard/dialog behavior.

## Privacy and folder permissions

Markdown contents never leave the browser. File and folder access begins only after an explicit picker action or file drop. Folder handles, absolute paths, and document contents are not persisted. Folder permission lasts only for the current browser session, and Docker does not mount or scan the user’s home directory.

Chrome and Edge are the primary desktop browsers because they support `showDirectoryPicker()`. Other modern browsers receive a directory-input fallback. Native permission prompts are intentionally not automated.

Mermaid diagrams render locally from fenced `mermaid` code blocks. The renderer is loaded only when needed, follows the active reader theme, and runs with Mermaid's strict security mode. Each diagram can be viewed full screen, copied as source, or downloaded as PNG or SVG; invalid diagrams show their source with a clear error instead of breaking the document.

Inline and display LaTeX use `$…$` and `$$…$$` syntax and render locally with KaTeX. Inline HTML is parsed only to support a small sanitized set of reading-oriented elements such as `sup`, `sub`, `kbd`, `abbr`, and `mark`; scripts and event handlers are removed.

Known limitations:

- Drag-and-drop supports individual Markdown files, not folders.
- Folder access must be granted again after reloading the page.
- Directory-input fallback behavior varies slightly by browser.
- Tauri packaging, editing/saving, cloud sync, bookmarks, history, and export are post-MVP work.

## Development

The repository uses the public npm registry through its project-level `.npmrc`; global npm configuration is not changed.

```bash
npm ci
npm run dev
```

Available checks:

```bash
npm run typecheck
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run test:a11y
npm run build
npm run verify
```

`npm run verify` runs TypeScript, unit/component tests, and the production build. Playwright E2E remains separate so clean environments can install browser binaries explicitly with `npx playwright install chromium`.

## Production and Docker

```bash
npm ci
npm run build
docker build -t markdown-reader .
docker run --rm -p 8080:80 markdown-reader
```

Open <http://localhost:8080>.

## Fonts and licenses

Inter, Source Serif 4, Literata, Atkinson Hyperlegible, and JetBrains Mono are bundled through Fontsource packages for offline use. Their upstream font licenses are the SIL Open Font License. Charter, System Sans, and System Mono use locally installed/system fallback stacks and add no network dependency.

See [the product specification](docs/PRODUCT_SPEC.md) and [MVP implementation plan](docs/MVP_IMPLEMENTATION_PLAN.md) for product scope and status.
