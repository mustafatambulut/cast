FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

# Üretim yapısını oluştur
RUN yarn build

# 3000 portunu aç
EXPOSE 3000

# Express sunucusunu başlat
CMD ["node", "src/server.js"]
