# ── Этап 1: сборка React-приложения ──────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Устанавливаем зависимости (package-lock.json необязателен — символ * делает его опциональным)
COPY package.json package-lock.json* ./
RUN npm install

# Копируем исходники и собираем статику.
# CI=false — чтобы предупреждения сборки не считались ошибками.
COPY . .
ENV CI=false
RUN npm run build

# ── Этап 2: раздача статики + reverse proxy через Caddy ───────────
# Caddy сам получает и автоматически продлевает бесплатный SSL-сертификат.
FROM caddy:2-alpine

# Готовая статика React попадает в папку, которую раздаёт Caddy
COPY --from=build /app/build /srv

# Порты HTTP и HTTPS
EXPOSE 80 443
