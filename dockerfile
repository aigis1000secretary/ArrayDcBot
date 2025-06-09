FROM node:20

# ENV DEBIAN_FRONTEND=noninteractive

# RUN apt-get update
# RUN apt-get install -y curl wget python3.9

# RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
# RUN apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./

RUN npm install

# RUN apt-get install -y fonts-noto-cjk
# RUN apt-get install -y fonts-symbola

COPY . .

CMD ["node", "index.js"]