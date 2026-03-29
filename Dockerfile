FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
USER bun
COPY package.json bun.lock .
RUN bun install --frozen-lockfile
RUN bun run playwright install-deps
RUN bun run playwright install

FROM install AS copy
COPY . .


FROM copy AS execution
RUN mkdir -p /usr/src/app/data /usr/src/app/uploads && chown bun:bun /usr/src/app/data /usr/src/app/uploads
RUN bun run build
EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT ["bun", "run", "src/index.ts"]


