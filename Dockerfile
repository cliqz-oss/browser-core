FROM node:11-stretch

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update --no-install-recommends  \
 && apt-get install -y                      \
    build-essential                         \
    python-dev                              \
    python-pip                              \
    zip                                     \
 && rm -rf /var/lib/apt/lists/*

RUN pip install setuptools==39.2.0
RUN pip install cffi==1.10.0
RUN pip install     \
  Fabric==1.13.2    \
  Jinja2==2.9.6     \
  argparse==1.4.0   \
  awscli==1.15.32  \
  pycrypto==2.6.1   \
  requests==2.18.4

RUN npm install -g npm@latest yarn

RUN cd /tmp && \
  wget https://www.openssl.org/source/old/0.9.x/openssl-0.9.8zg.tar.gz && \
  tar zxf openssl-0.9.8zg.tar.gz && \
  cd openssl-0.9.8zg && \
  ./config && \
  make && \
  make install
ENV PATH "/usr/local/ssl/bin:$PATH"

ARG UID
ARG GID
RUN groupadd jenkins -g $GID \
 && useradd -ms /bin/bash jenkins -u $UID -g $GID

# TODO: Also make use of a caching directory
USER jenkins
# Cache npm install in docker
COPY package.json /home/jenkins/
COPY package-lock.json /home/jenkins/
RUN cd /home/jenkins/ && npm ci
