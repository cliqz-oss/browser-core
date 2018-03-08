#! /bin/bash


help() {
    echo 'Usage:'
    echo " $0 <FERN_ARGS>"
    echo
    echo 'Available arguments for fern.js:'
    awk '/def matrix/{flag=1;next}/^]/{flag=0}flag' Jenkinsfile | \
        grep testParams                                         | \
        cut -d':' -f 2-                                         | \
        sed '/^\s*$/d'                                          | \
        sed s'/,*$//'
}

if [ -z "$1" ]; then
    help
    exit 1
fi

FERN_ARGS="$1"

# Create temporary docker file
DOCKER_FILE="Dockerfile.tmp"
cp Dockerfile.ci "${DOCKER_FILE}"
cat << EOF >> ${DOCKER_FILE}
# Copy extension directory inside of Docker
ADD . /app/
WORKDIR /app/
RUN ./fern.js install
EOF

# Build docker
echo "Building docker image"
docker build  -f "${DOCKER_FILE}" -t docker-navigation-extension-tests .
rm -frv "${DOCKER_FILE}"

# Run docker
echo "Running tests, you can connect using a vnc client to 'localhost:15900 with password vnc'"
echo "Fern config: ${FERN_ARGS}"
# To slow things down, use the --cpus=N options
# DOCKER_RUN="docker run --rm -t --cpus=0.4 --user node -p 15900:5900 -w /app docker-navigation-extension-tests ./tests/run_tests.sh $FERN_ARGS"
DOCKER_RUN="docker run --rm -t --user node -p 15900:5900 -w /app docker-navigation-extension-tests ./tests/run_tests.sh $FERN_ARGS"

if type xtightvncviewer >/dev/null 2>&1 ; then
   ${DOCKER_RUN} &
   sleep 5
   echo vnc | xtightvncviewer -autopass localhost::15900
else
   ${DOCKER_RUN}
fi
