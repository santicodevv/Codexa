FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/cli/package.json apps/cli/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/analysis/package.json packages/analysis/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/cli-core/package.json packages/cli-core/package.json

RUN npm ci

COPY . .

RUN npx prisma generate \
  && npm run build:packages \
  && npm run build --workspace apps/api

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
