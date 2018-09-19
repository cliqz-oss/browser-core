#! /bin/bash

set -e

# clean any previous builds
rm -fr build

# clean all the exiting node_modules for a more reproducible build
rm -fr node_modules

# install the exact versions from package-lock.json
npm ci

# build a production version of the Cliqz extension
./fern.js build configs/amo.js --no-maps --environment=production
VERSION=`cat VERSION`
EXPECTED_FILENAME="Cliqz.`cat VERSION`.xpi"

cd build && fab package:beta=False,channel=amo,version=$VERSION
cp $EXPECTED_FILENAME ../
cd ..

echo
echo
echo
echo  "CLIQZ xpi ready"
echo "Path: `pwd $EXPECTED_FILENAME`/$EXPECTED_FILENAME"
