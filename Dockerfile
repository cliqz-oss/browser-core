FROM node:5.11.1

RUN npm install -g \
  bower \
  broccoli-cli \
  ember-cli \
  phantomjs \
  yuidocjs \
  selleck

RUN apt-get update && \
  apt-get install -y \
    build-essential \
    python-dev \
    python-pip \
    zip
    
RUN pip install --upgrade cffi
RUN pip install \
  fabric \
  jinja2 \
  awscli \
  requests \
  pycrypto \
  argparse

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

# TODO
# Cache bower packages
# RUN su - jenkins -c 'echo "{\"storage\": {\"packages\": \"~/.bower/packages\", \"registry\": \"~/.bower/registry\", \"links\": \"~/.bower/links\"}}" > /home/jenkins/.bowerrc'

# TODO: Also make use of a caching directory
USER jenkins
# Cache npm install and bower in docker
COPY package.json /home/jenkins/
COPY bower.json /home/jenkins/
RUN cd /home/jenkins/ && npm install && bower install

# Freshtab
RUN mkdir /home/jenkins/freshtab
COPY subprojects/fresh-tab-frontend/package.json /home/jenkins/freshtab
COPY subprojects/fresh-tab-frontend/bower.json /home/jenkins/freshtab
RUN cd /home/jenkins/freshtab && npm install && bower install
