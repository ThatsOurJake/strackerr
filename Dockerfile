FROM node:26-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.6.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build
RUN if [ -f prisma/schema.prisma ]; then pnpm prisma generate; fi

FROM node:26-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm@11.6.0

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
