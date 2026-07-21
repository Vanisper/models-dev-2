FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && apk add --no-cache bash curl
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY apps apps
COPY scripts scripts
RUN pnpm build && bash scripts/update-data.sh && pnpm deploy --legacy --filter @app/server --prod /prod/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    WEB_DIR=/app/web/dist \
    DATA_READONLY=1
COPY --from=build /prod/server ./
COPY --from=build /app/apps/web/dist ./web/dist
COPY --from=build /app/data ./data
EXPOSE 3000
CMD ["node", "dist/main.js"]
