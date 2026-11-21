# Web de administración (Next.js). Contexto de construcción: v3 (es un monorepo de npm)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY paquetes/cliente/package.json paquetes/cliente/
COPY paquetes/ui/package.json paquetes/ui/
COPY web/package.json web/
COPY plc-sim/package.json plc-sim/
COPY terreno/package.json terreno/
RUN npm ci --no-audit --no-fund
COPY paquetes paquetes
COPY web web
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app .
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "web"]
