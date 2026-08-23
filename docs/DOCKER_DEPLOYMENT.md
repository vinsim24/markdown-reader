# Docker Deployment

Markdown Reader ships as a static browser application served by unprivileged Nginx. The image builds the application inside Docker with Node 24, so a local `dist` directory is neither required nor copied into the image.

## Build and run locally

```bash
docker build -t markdown-reader:local .
docker run --detach --rm --name markdown-reader -p 8080:8080 markdown-reader:local
```

Open <http://localhost:8080>. Confirm container health with:

```bash
docker inspect --format '{{.State.Health.Status}}' markdown-reader
curl --fail http://localhost:8080/healthz
```

Stop the local container with:

```bash
docker stop markdown-reader
```

The container runs without root privileges, listens on port `8080`, provides an HTTP health check, sends security headers, and uses an SPA fallback for browser routes. It does not mount, scan, or upload local files. Browser file and folder access still requires an explicit picker action.

## Published image

The Docker Hub repository is `vinsim24/markdown-reader`.

```bash
docker pull vinsim24/markdown-reader:latest
docker run --detach --rm --name markdown-reader -p 8080:8080 vinsim24/markdown-reader:latest
```

Release images receive both an immutable Git commit tag and `latest`. To publish the current commit:

```bash
docker build -t vinsim24/markdown-reader:<git-commit> -t vinsim24/markdown-reader:latest .
docker push vinsim24/markdown-reader:<git-commit>
docker push vinsim24/markdown-reader:latest
```

Publishing requires an authenticated Docker CLI with write access to `vinsim24/markdown-reader`.

## Verification checklist

- `/healthz` returns HTTP 200 and the container becomes healthy.
- `/` serves the production application and its assets.
- Security headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, and `Permissions-Policy`.
- Chromium can import a Markdown file, open the bundled cheat sheet, render Mermaid, and switch themes through the container URL.
- The running process is non-root and the image contains no source tree, tests, local `node_modules`, or user documents.

Run the repository browser suite against an already running container with:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
```

In PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:8080'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```
