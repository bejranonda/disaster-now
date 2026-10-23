# One image for both services (docker-compose.yml): the static page server and the collector. No npm packages are
# needed at run time: plain Node and the files in public/ and tools/. Docker Hub rate-limits anonymous pulls; on a
# host that hits it, build with --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine (same image).
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE}
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY tools ./tools
# the collector writes here (a named volume in compose); the page server only reads it
RUN mkdir -p /app/public/data/live && chown -R node:node /app/public/data/live
USER node
ENV HOST=0.0.0.0 PORT=8080 LIVE_DIR=/app/public/data/live NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 CMD ["node", "tools/health.mjs", "--web", "http://127.0.0.1:8080/"]
CMD ["node", "tools/serve.mjs"]
