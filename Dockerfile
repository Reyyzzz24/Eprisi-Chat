# GATE 8 — multi-stage, non-root, Next.js standalone build.
#
# Deviates from WRAPPER_PROMPT.md's literal pnpm example on purpose: GATE 1
# (spike/RESULTS.md) found `@rocket.chat/ddp-client`'s dependency tree pins a
# Yarn Berry `patch:` protocol specifier that plain npm and Yarn Classic
# cannot resolve at all, and pnpm was flagged as untested/risky against the
# same patch. This project committed to Yarn Berry (4.18.0, node-modules
# linker) for that reason back in GATE 3 — this Dockerfile follows the same
# package manager the rest of the project actually uses, not the prompt's
# original example.
#
# Build for a Dokploy/amd64 host from an arm64 dev machine with:
#   docker buildx build --platform linux/amd64 -t <tag> .

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack prepare yarn@4.18.0 --activate && yarn install --immutable

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.18.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time envs consumed by `getLoginBranding()`/NEXT_PUBLIC_* — see
# SECURITY.md's note (GATE 6) that the first build must run against a
# healthy RC instance or the login/home pages' ISR cache bakes in stale
# defaults until the next 5-minute revalidation window.
ARG NEXT_PUBLIC_RC_WS_URL
ARG NEXT_PUBLIC_RC_PUBLIC_URL
ENV NEXT_PUBLIC_RC_WS_URL=$NEXT_PUBLIC_RC_WS_URL
ENV NEXT_PUBLIC_RC_PUBLIC_URL=$NEXT_PUBLIC_RC_PUBLIC_URL
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# `node` user/group already exist in the official node:22-alpine image.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
