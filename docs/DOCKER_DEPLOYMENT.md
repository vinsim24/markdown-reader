# Docker Deployment

Markdown Reader ships as a static browser application served by unprivileged Nginx. The image builds the application inside Docker with Node 24, so a local `dist` directory is neither required nor copied into the image.

## Build and run locally

```bash
docker build -t markdown-reader:local .
docker run --detach --rm --name markdown-reader -p 8787:8080 markdown-reader:local
```

Open <http://localhost:8787>. The container listens internally on `8080`, but `8787` is the recommended host port because host port `8080` is commonly occupied. Map any other free host port when needed. Confirm container health with:

```bash
docker inspect --format '{{.State.Health.Status}}' markdown-reader
curl --fail http://localhost:8787/healthz
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
docker run --detach --rm --name markdown-reader -p 8787:8080 vinsim24/markdown-reader:latest
```

The current release is `0.3.1`. Pin this tag for reproducible deployments:

```bash
docker pull vinsim24/markdown-reader:0.3.1
docker run --detach --rm --name markdown-reader -p 8787:8080 vinsim24/markdown-reader:0.3.1
```

Published releases contain native `linux/amd64` and `linux/arm64` images. Docker automatically selects the matching image, including ARM64 on Apple Silicon, without emulation.

Release images receive a semantic version tag, an immutable Git commit tag, and `latest`. The source commit also receives an annotated Git tag such as `v0.3.1`. Pull requests validate both architectures, and pushing the version tag publishes the release through `.github/workflows/docker.yml`.

The workflow requires the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets. Both are passed only to Docker's login action during tagged releases. The workflow uses Node 24-based Docker actions and publishes provenance and an SBOM with each image.

To reproduce the multi-platform publishing flow locally with an authenticated Docker CLI:

```bash
docker buildx create --name markdown-reader-builder --use
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag vinsim24/markdown-reader:<version> \
  --tag vinsim24/markdown-reader:<git-commit> \
  --tag vinsim24/markdown-reader:latest \
  --provenance=true --sbom=true --push .
```

Publishing requires an authenticated Docker CLI with write access to `vinsim24/markdown-reader`.

Verify the published platforms with:

```bash
docker buildx imagetools inspect vinsim24/markdown-reader:<version>
```

## Verification checklist

- `/healthz` returns HTTP 200 and the container becomes healthy.
- `/` serves the production application and its assets.
- The published manifest includes both `linux/amd64` and `linux/arm64`.
- Security headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, and `Permissions-Policy`.
- Chromium can import a Markdown file, open the bundled cheat sheet, render Mermaid, and switch themes through the container URL.
- The running process is non-root and the image contains no source tree, tests, local `node_modules`, or user documents.

Run the repository browser suite against an already running container with:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8787 npm run test:e2e
```

In PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:8787'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```
