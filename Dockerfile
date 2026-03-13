FROM node:20-alpine AS deps-prod

WORKDIR /app

COPY ./package*.json .

RUN npm ci --omit=dev

FROM deps-prod AS build

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS prod

WORKDIR /app

COPY --from=build /app/package*.json .
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/app.js"]
