# ---------- Base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

RUN pnpm config set minimumReleaseAge 0
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- Dependencies ----------
FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install

# ---------- Builder ----------
FROM base AS builder

WORKDIR /app

ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# ---------- Runner ----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 \
 && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/components ./components

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]