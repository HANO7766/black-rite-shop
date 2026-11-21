# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim

LABEL org.opencontainers.image.title="Black Rite Shop" \
      org.opencontainers.image.description="Tienda de poleras con Node.js, SQLite y render en servidor" \
      org.opencontainers.image.version="1.0.0"

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DB_PATH=/data/shop.db

WORKDIR /app

# Sin dependencias npm: el runtime usa solo módulos nativos.
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node css ./css
COPY --chown=node:node assets ./assets
COPY --chown=node:node server ./server

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 8080
VOLUME ["/data"]

CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
