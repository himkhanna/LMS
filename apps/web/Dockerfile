FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

FROM node:22-alpine AS build
WORKDIR /app

# Public, non-secret values that Next.js must inline into the client
# bundle at build time. They're surfaced as NEXT_PUBLIC_* env vars during
# `next build` so they end up in the static JS the browser loads.
ARG NEXT_PUBLIC_MS_TENANT_ID=common
ARG NEXT_PUBLIC_MS_CLIENT_ID=
ARG NEXT_PUBLIC_MS_REDIRECT_URI=http://localhost:3000/auth/callback
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
ARG NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:8083
ARG NEXT_PUBLIC_AI_GATEWAY_URL=http://localhost:8082
ENV NEXT_PUBLIC_MS_TENANT_ID=$NEXT_PUBLIC_MS_TENANT_ID
ENV NEXT_PUBLIC_MS_CLIENT_ID=$NEXT_PUBLIC_MS_CLIENT_ID
ENV NEXT_PUBLIC_MS_REDIRECT_URI=$NEXT_PUBLIC_MS_REDIRECT_URI
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_AUTH_BASE_URL=$NEXT_PUBLIC_AUTH_BASE_URL
ENV NEXT_PUBLIC_AI_GATEWAY_URL=$NEXT_PUBLIC_AI_GATEWAY_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
