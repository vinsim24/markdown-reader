# Markdown Reader Development Rules

Before making changes, read this file and `docs/PRODUCT_SPEC.md`. For brand, theme, shell, favicon, or editor work, also read `docs/INK_AND_PAPER_REVAMP_SPEC.md`.

- Work directly in this repository and preserve unrelated user changes.
- Use React and TypeScript in strict mode; keep the interface responsive and accessible.
- Process user files locally. Do not broaden browser/filesystem permissions, scan home directories, or upload document contents.
- Use the public npm registry only through the project-level `.npmrc`; never modify global npm configuration.
- Do not use `dangerouslySetInnerHTML` for Markdown. Use `react-markdown`, `remark-gfm`, and `rehype-sanitize`.
- When a lockfile is present, install with `npm ci` unless intentionally changing dependencies.
- Before declaring work complete, run TypeScript checks and `npm run build`, review responsive behavior, and review the final diff.
- Explain important tradeoffs briefly. Do not ask the user to copy files or apply individual changes manually.
- Do not commit or push without explicit user approval.

## Milestone Workflow

- Work on the current `main` branch; do not create feature branches, pull requests, tags, or releases unless explicitly requested.
- Deliver major workstreams on focused branches and merge them through reviewed pull requests after their required checks pass. Complete Ink & Paper first, verify Docker deployment next, and begin editor work only after both are merged. Do not code these priorities directly on `main`.
- Keep feature branches after pull requests are merged; do not delete local or remote branches unless explicitly requested.
- Do not rewrite Git history. Stop if unexpected user changes conflict with the task.
- Follow the commit cadence explicitly requested for the task. For the current MVP completion, batch remaining coding, run the full verification suite once after coding is finished, then create the final commit and push.
- Continue approved phases automatically; ask only when permissions, credentials, or a material product decision block progress.
- Use Vitest for units, React Testing Library with `user-event` for components, and Playwright with axe for browser/accessibility coverage.
- Ship advanced reader features with a bundled example and representative automated fixtures.
- Run Chromium Playwright tests before each push. Test Firefox and WebKit before an MVP release, and never automate the native folder permission dialog.
