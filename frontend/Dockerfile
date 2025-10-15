# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

# Allow passing API base at build time
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ---- runtime (nginx) ----
FROM nginx:1.27-alpine
# your custom nginx config (caching, SPA fallback, gzip, etc.)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]