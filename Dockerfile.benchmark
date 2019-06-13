FROM node:11-stretch

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update --no-install-recommends \
  && apt-get install -y time jq \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest yarn

RUN mkdir /app
RUN chown node:node -R /app

USER node
COPY package.json /app/
COPY package-lock.json /app/

WORKDIR /app/

RUN mkdir -p /app/benchmarks && wget -O - https://s3.amazonaws.com/cdncliqz/extension-profiles/session_2018-10-15.jl.gz | gunzip > /app/benchmarks/session.jl
RUN wget -O - https://cdn.cliqz.com/adblocking/requests_top500.json.gz | gunzip | head -n 100000 > /app/benchmarks/requests.jl
RUN npm ci
