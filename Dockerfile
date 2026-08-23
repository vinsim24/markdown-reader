FROM node:24.19.0-alpine3.24 AS build

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY index.html styles.css ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine3.24-slim AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
