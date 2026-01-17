# use lts-alpine (latest), to ensure we're running the latest stable platform to match ever-increasing next.js minimum ver. requirements
FROM node:lts-alpine AS base

# build next.js project
FROM base AS builder
WORKDIR /app
COPY ./src /app
RUN npm install --legacy-peer-deps
RUN npm run build

# create production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
#
# runtime user permissions, recommended by Vercel
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
#
# disable next.js telemetry (see: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)
ENV NEXT_TELEMETRY_DISABLED=1
# run next.js project
EXPOSE 3000
CMD ["npm", "run", "start"]
