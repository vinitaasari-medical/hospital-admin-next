# Next.js is built in CI (with NEXT_PUBLIC_* env vars inlined at build time).
# This Dockerfile only packages the pre-built standalone output into a minimal image.
# Requires next.config.ts to have output: "standalone".

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone bundle: self-contained server.js + only the node_modules it needs
COPY --chown=nextjs:nodejs .next/standalone ./

# Static client assets — standalone does not include these
COPY --chown=nextjs:nodejs .next/static ./.next/static

# Public folder — standalone does not include this either
COPY --chown=nextjs:nodejs public ./public

USER nextjs

EXPOSE 4022

ENV PORT=4022
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
