FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

CMD ["ts-node", "server/SUB_Server.ts"]
