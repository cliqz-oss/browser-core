FROM jolicode/nvm

RUN /bin/bash -l -c "nvm install 5"
RUN /bin/bash -l -c "nvm use 5"
RUN /bin/bash -l -c "npm install -g bower"
RUN /bin/bash -l -c "npm install -g broccoli-cli"

USER root

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y build-essential
RUN apt-get install -y python-dev
RUN apt-get install -y python-pip
RUN apt-get install -y zip

RUN pip install fabric
RUN pip install jinja2
RUN pip install awscli
RUN pip install requests
RUN pip install pycrypto
RUN pip install argparse

RUN wget https://www.openssl.org/source/old/0.9.x/openssl-0.9.8zg.tar.gz
RUN tar zxf openssl-0.9.8zg.tar.gz
WORKDIR ./openssl-0.9.8zg
RUN ./config
RUN make

WORKDIR ..
