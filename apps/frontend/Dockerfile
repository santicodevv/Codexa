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

RUN npm run build --workspace apps/frontend

FROM nginx:alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
