#!/bin/bash

declare -A versions
versions['38.0.6']='https://ftp.mozilla.org/pub/firefox/releases/38.0.6/linux-x86_64/en-US/firefox-38.0.6.tar.bz2'
versions['43.0.4']='https://ftp.mozilla.org/pub/firefox/releases/43.0.4/linux-x86_64/en-US/firefox-43.0.4.tar.bz2'
versions['44.0.2']='https://ftp.mozilla.org/pub/firefox/releases/44.0.2/linux-x86_64/en-US/firefox-44.0.2.tar.bz2'
versions['47.0.1']='https://ftp.mozilla.org/pub/firefox/releases/47.0.1/linux-x86_64/en-US/firefox-47.0.1.tar.bz2'
versions['49.0.2']='http://archive.mozilla.org/pub/firefox/tinderbox-builds/mozilla-release-linux64-add-on-devel/1474711644/firefox-49.0.2.en-US.linux-x86_64-add-on-devel.tar.bz2'

FIREFOX_VERSION=$1
FIREFOX_URL=${versions[$FIREFOX_VERSION]}

if [ -z $FIREFOX_URL ] ; then
  FIREFOX_URL=$2
fi

if [ -z $FIREFOX_URL ] ; then
    echo "Please specify firefox version: $0 <VERSION> <URL> or just version $0 <VERSION>"
    echo "Available versions: "
    for version in "${!versions[@]}"; do echo "  $version - ${versions[$version]}"; done
else
    # Make sure extension has been built
    if [ ! -d "build/cliqz@cliqz.com/" ]; then
        echo "Building extension for testing"
        ./fern.js build
        if [ $? -ne 0 ] ; then
            echo "Failed to build extension, exiting"
            exit 1
        fi
    fi

    # Package extension
    echo "Package extension"
    rm -vi cliqz@cliqz.com.xpi
    cd build/ && fab package && mv latest.xpi ../cliqz@cliqz.com.xpi && cd ..

    # Make sure autoconfig is there
    if [ ! -d "firefox-autoconfigs" ]; then
        echo "cloning firefox-autoconfigs"
        git clone git@github.com:remi-cliqz/firefox-autoconfigs.git
    fi

    # Build docker
    echo "Building docker for firefox ${FIREFOX_VERSION}"
    DOCKER_BUILD_DIR="docker_build"
    rm -fr ${DOCKER_BUILD_DIR}
    mkdir ${DOCKER_BUILD_DIR}
    cp Dockerfile.firefox ${DOCKER_BUILD_DIR}
    cd ${DOCKER_BUILD_DIR}
    docker build  --build-arg UID=`id -u` --build-arg URL=$FIREFOX_URL --build-arg GID=`id -g` -f Dockerfile.firefox -t docker-firefox-extension-tests-${FIREFOX_VERSION} .
    cd ..
    rm -fr ${DOCKER_BUILD_DIR}

    # Run docker
    echo "Running tests, you can connect using a vnc client to 'localhost:15900 with password vnc'"
    DOCKER_RUN="docker run  -iP -p 15900:5900 -u jenkins:jenkins -v `pwd`:/workspace/ -w /workspace -e FIREFOX_DEBUG --entrypoint ./run_tests.sh docker-firefox-extension-tests-${FIREFOX_VERSION}"

    if type xtightvncviewer >/dev/null 2>&1 ; then
       ${DOCKER_RUN} &
       sleep 5
       echo vnc | xtightvncviewer -autopass localhost::15900
    else
       ${DOCKER_RUN}
    fi
fi
