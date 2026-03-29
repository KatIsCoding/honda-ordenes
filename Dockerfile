FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock .
RUN bun install --frozen-lockfile
RUN bun run playwright install chromium chromium-headless-shell
RUN bun run playwright install-deps chromium chromium-headless-shell

FROM install AS copy
COPY . .


FROM copy AS execution
RUN mkdir -p /usr/src/app/data /usr/src/app/uploads && chown bun:bun /usr/src/app/data /usr/src/app/uploads
RUN bun run build
USER bun
EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT ["bun", "run", "src/index.ts"]


