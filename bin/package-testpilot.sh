#!/usr/bin/env bash

set -e
set -x

if [ -z $CLIQZ_CONFIG_PATH ]; then
  export CLIQZ_CONFIG_PATH=./configs/test-pilot.json
fi

# CLIQZ - check for global dependencies
bower              > /dev/null 2>&1 || npm install -g bower
ember              > /dev/null 2>&1 || npm install -g ember-cli
broccoli --version > /dev/null 2>&1 || npm install -g broccoli-cli

npm install

# CLIQZ - check for global dependencies
pip install \
  fabric \
  requests \
  jinja2

./fern.js install

# CLIQZ - building
./fern.js build --freshtab --environment=production --no-maps

# CLIQZ - packaging
cd build && fab package:beta=False,channel=amo && cd ..

# CLIQZ - preparing build artifacts
cp build/latest.xpi addon.xpi
TESTPILOT_ADDON_ID=`./fern.js addon-id`
echo "TESTPILOT_ADDON_ID=$TESTPILOT_ADDON_ID" > addon.env
TESTPILOT_ADDON_VERSION=`./fern.js addon-version`
echo "TESTPILOT_ADDON_VERSION=$TESTPILOT_ADDON_VERSION" >> addon.env
