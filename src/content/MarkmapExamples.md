# Markmap Examples

This bundled document demonstrates structures that become useful mind-map branches. Switch to **Mind map** above, then drag to pan, scroll to zoom, and select a branch dot to fold or expand it.

## Product roadmap

### Reader foundation

- Local Markdown files
- Folder navigation
  - Nested documents
  - Relative images
- Responsive reading

### Rich content

- GitHub-flavored Markdown
- Mermaid diagrams
- Obsidian compatibility
- Markmap visualization

### Later

- Editor
- Desktop application
- Custom themes

## Release checklist

- [x] TypeScript checks
- [x] Unit and component tests
- [x] Production build
- [ ] Windows folder-permission smoke test

## Architecture

### Inputs

1. Browser file picker
2. Drag and drop
3. Explicit folder picker
4. Public Markdown URL

### Processing

1. Read content locally
2. Parse Markdown
3. Sanitize rendered output
4. Resolve approved local resources

### Outputs

- Reader view
- Mind-map view
  - SVG export
  - PNG export
- Table of contents

## Useful references

- [Markmap project](https://markmap.js.org/)
- [Markdown Reader product specification](PRODUCT_SPEC.md)

## Code branch

```typescript
type DocumentView = 'reader' | 'mindmap';
```

Code is represented as a text branch; it is not executed.
