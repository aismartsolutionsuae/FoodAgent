FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

# Copy lockfile so npm ci gives a reproducible install
COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
