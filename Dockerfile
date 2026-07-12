FROM node:24-bookworm-slim AS node-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS frontend-builder
WORKDIR /frontend
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY frontend ./
RUN pnpm install --frozen-lockfile --filter skyroc-admin... && pnpm --filter skyroc-admin build

FROM python:3.12-slim-bookworm AS runtime
COPY --from=node:24-bookworm-slim /usr/local/ /usr/local/
ENV NODE_ENV=production \
    PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1
WORKDIR /app
RUN useradd --create-home --uid 10001 app && python -m venv /opt/venv
COPY vendor/hidemyemail-generator ./vendor/hidemyemail-generator
RUN /opt/venv/bin/pip install --no-cache-dir ./vendor/hidemyemail-generator
COPY --from=node-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY python ./python
COPY scripts ./scripts
COPY --from=frontend-builder /frontend/apps/admin/dist ./frontend/apps/admin/dist
RUN mkdir -p /app/data && chown -R app:app /app /opt/venv
USER app
EXPOSE 4173
CMD ["node", "src/server.mjs"]
