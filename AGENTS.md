# Markdown Reader Development Rules

Before making changes, read this file and `docs/PRODUCT_SPEC.md`.

- Work directly in this repository and preserve unrelated user changes.
- Use React and TypeScript in strict mode; keep the interface responsive and accessible.
- Process user files locally. Do not broaden browser/filesystem permissions, scan home directories, or upload document contents.
- Use the public npm registry only through the project-level `.npmrc`; never modify global npm configuration.
- Do not use `dangerouslySetInnerHTML` for Markdown. Use `react-markdown`, `remark-gfm`, and `rehype-sanitize`.
- When a lockfile is present, install with `npm ci` unless intentionally changing dependencies.
- Before declaring work complete, run TypeScript checks and `npm run build`, review responsive behavior, and review the final diff.
- Explain important tradeoffs briefly. Do not ask the user to copy files or apply individual changes manually.
- Do not commit or push without explicit user approval.

