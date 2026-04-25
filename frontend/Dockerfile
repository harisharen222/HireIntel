# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runtime

# Replace the default nginx config with one that supports SPA routing
# and proxies /api to the backend container by service name.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q -O- http://localhost/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
