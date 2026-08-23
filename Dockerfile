FROM node:26-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build
RUN pnpm run tailwind:build
RUN if [ -f prisma/schema.prisma ]; then pnpm prisma generate; fi

FROM node:26-alpine AS runtime

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/views ./views
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
