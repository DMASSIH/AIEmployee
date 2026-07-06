# Production image for @aie/api — multi-stage with turbo prune.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune @aie/api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo build --filter=@aie/api
RUN pnpm --filter=@aie/api deploy --prod --legacy /app

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder --chown=app:app /app .
USER app
EXPOSE 3001
CMD ["node", "dist/server.js"]
