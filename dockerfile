
FROM ubuntu:20.04 AS base

RUN apt-get update
RUN apt-get install -y curl wget python3.8 python3-pip

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "index.js"]