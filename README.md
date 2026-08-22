# Markdown Reader

A local-only Markdown reader UI draft.

## Run the React app

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Run the original static draft without Node

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Run the React app with Docker

```bash
npm install
npm run build
docker build -t markdown-reader .
docker run --rm -p 8080:80 markdown-reader
```

Then open <http://localhost:8080>.

The browser reads only the Markdown file you explicitly choose through the file picker. Docker does not mount or scan your Mac filesystem.
