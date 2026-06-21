FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline

COPY --from=builder /app/dist ./dist

USER node

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
