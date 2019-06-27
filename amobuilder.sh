#! /bin/bash

set -e

# clean any previous builds
rm -fr build

# clean all the exiting node_modules for a more reproducible build
rm -fr node_modules

# install the exact versions from package-lock.json
npm ci

# build a production version of the Cliqz extension
./fern.js build configs/amo-webextension.js --no-maps --environment=production

cd build
RAW_VERSION=`cat manifest.json | jq '.version'`
VERSION=${RAW_VERSION//\"}
EXPECTED_FILENAME="Cliqz.$VERSION.xpi"
zip --exclude=*.DS_Store* ../$EXPECTED_FILENAME -r *

cd ..

echo
echo
echo
echo  "CLIQZ xpi ready"
echo "Path: `pwd $EXPECTED_FILENAME`/$EXPECTED_FILENAME"
