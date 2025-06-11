# FROM node:20
FROM node:20-bullseye

# ENV DEBIAN_FRONTEND=noninteractive

# RUN apt-get update
# RUN apt-get install -y curl wget python3.9

# RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
# RUN apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./

RUN npm install

# RUN apt-get install fonts-noto-cjk
# RUN apt-get install fonts-symbola

# RUN apt-get update
# RUN apt-get install -y --no-install-recommends wget fontconfig
# RUN mkdir -p /usr/share/fonts/noto
# RUN cd /usr/share/fonts/noto
# RUN wget https://noto-website-2.storage.googleapis.com/pkgs/NotoSansCJKtc-hinted.zip
# RUN wget https://noto-website-2.storage.googleapis.com/pkgs/NotoSansCJKjp-hinted.zip
# RUN apt-get install -y unzip
# RUN unzip NotoSansCJKtc-hinted.zip
# RUN unzip NotoSansCJKjp-hinted.zip
# RUN rm NotoSansCJKtc-hinted.zip
# RUN rm NotoSansCJKjp-hinted.zip
# RUN fc-cache -fv
# RUN rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]