FROM node:11-stretch

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update --no-install-recommends  \
 && apt-get install -y \
    build-essential \
    bzip2 \
    ca-certificates \
    chromium \
    chromium-l10n \
    dbus \
    jq \
    libasound2 \
    libatk1.0-0 \
    libav-tools \
    libavcodec-extra57 \
    libc6 \
    libcairo-gobject2 \
    libcairo2 \
    libdbus-1-3 \
    libdbus-glib-1-2 \
    libfontconfig1 \
    libfreetype6 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libgtk2.0-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstartup-notification0 \
    libstdc++6 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxml2-utils \
    libxrender1 \
    libxt6 \
    lsb-release \
    menu \
    openbox \
    python-dev \
    python-pip \
    unzip \
    wget \
    x11vnc \
    xauth \
    xvfb \
    zip \
 && rm -rf /var/lib/apt/lists/*

RUN pip install setuptools==39.2.0
RUN pip install cffi==1.10.0
RUN pip install     \
  Fabric==1.13.2    \
  Jinja2==2.9.6     \
  argparse==1.4.0   \
  awscli==1.15.32   \
  pycrypto==2.6.1   \
  requests==2.18.4

RUN cd /tmp && \
  wget https://www.openssl.org/source/old/0.9.x/openssl-0.9.8zg.tar.gz && \
  tar zxf openssl-0.9.8zg.tar.gz && \
  cd openssl-0.9.8zg && \
  ./config && \
  make && \
  make install
ENV PATH "/usr/local/ssl/bin:$PATH"

RUN mkdir /app
RUN chown node:node -R /app

# Prevent errors when running xvfb as node user
RUN mkdir /tmp/.X11-unix \
 && chmod 1777 /tmp/.X11-unix \
 && chown root /tmp/.X11-unix

# Expose port for VNC
EXPOSE 5900

RUN npm install -g npm@latest yarn@latest

USER node

RUN wget https://ftp.mozilla.org/pub/devedition/releases/60.0b16/linux-x86_64/en-US/firefox-60.0b16.tar.bz2 -O /home/node/firefox.tar.bz2 \
  && mkdir /home/node/firefox60 \
  && tar xjvf /home/node/firefox.tar.bz2 -C /home/node/firefox60 \
  && rm -f /home/node/firefox.tar.bz2

RUN wget https://ftp.mozilla.org/pub/devedition/releases/62.0b20/linux-x86_64/en-US/firefox-62.0b20.tar.bz2 -O /home/node/firefox.tar.bz2 \
  && mkdir /home/node/firefox62 \
  && tar xjvf /home/node/firefox.tar.bz2 -C /home/node/firefox62 \
  && rm -f /home/node/firefox.tar.bz2

RUN wget https://ftp.mozilla.org/pub/devedition/releases/66.0b9/linux-x86_64/en-US/firefox-66.0b9.tar.bz2 -O /home/node/firefox.tar.bz2 \
 && mkdir /home/node/firefox66 \
 && tar xjvf /home/node/firefox.tar.bz2 -C /home/node/firefox66 \
 && rm -f /home/node/firefox.tar.bz2

RUN wget 'https://download.mozilla.org/?product=firefox-devedition-latest&os=linux64&lang=en-US' -O /home/node/firefox.tar.bz2 \
  && mkdir /home/node/firefoxBeta \
  && tar xjvf /home/node/firefox.tar.bz2 -C /home/node/firefoxBeta \
  && rm -f /home/node/firefox.tar.bz2

RUN wget 'https://download.mozilla.org/?product=firefox-nightly-latest&os=linux64&lang=en-US' -O /home/node/firefox.tar.bz2 \
  && mkdir /home/node/firefoxNightly \
  && tar xjvf /home/node/firefox.tar.bz2 -C /home/node/firefoxNightly \
  && rm -f /home/node/firefox.tar.bz2

# Cliqz Beta
RUN wget 'https://repository.cliqz.com/dist/beta/latest/cliqz.en-US.linux-x86_64.tar.bz2' -O /home/node/cliqz.tar.bz2 \
  && mkdir /home/node/cliqzBeta \
  && tar xjvf /home/node/cliqz.tar.bz2 -C /home/node/cliqzBeta \
  && rm -f /home/node/cliqz.tar.bz2

# Cliqz Stable
RUN wget 'https://cdn.cliqz.com/browser-f/download/linux/cliqz.en-US.release.x86_64.tar.bz2' -O /home/node/cliqz.tar.bz2 \
  && mkdir /home/node/cliqzStable \
  && tar xjvf /home/node/cliqz.tar.bz2 -C /home/node/cliqzStable \
  && rm -f /home/node/cliqz.tar.bz2

COPY package.json /app/
COPY package-lock.json /app/

WORKDIR /app/

RUN npm ci
