#! /bin/bash

# in order to comply with AMO policies we need to offer a way
# to reproduce the exact build from the original source code
#
# https://extensionworkshop.com/documentation/publish/source-code-submission/
#
# Usage:
#      bash amobuilder.sh cliqz
#      bash amobuilder.sh sparalarm
#      bash amobuilder.sh myoffrz
#

set -e

usage () {
  echo
  echo "Usage: bash $0 product"
  echo "* product one of |cliqz|, |sparalarm| or |myoffrz|"
  echo
  echo "eg: bash amobuilder.sh cliqz"
}

if [ $# -eq 0 ]; then
  usage
  exit 1
fi

case "$1" in
  cliqz)
      CONFIG="amo-webextension.js"
      ;;

  sparalarm)
      CONFIG="offers-chip-firefox.js"
      ;;

  myoffrz)
      CONFIG="offers-firefox.js"
      ;;

  *)
      usage
      exit 1
esac

echo "start building CONFIG=$CONFIG"

# clean any previous builds
rm -fr build

# clean all the exiting node_modules for a more reproducible build
rm -fr node_modules

# install the exact versions from package-lock.json
npm ci

# build a production version for the extension specified in $CONFIG
./fern.js build configs/releases/$CONFIG --no-debug --environment=production

cd build
RAW_VERSION=`cat manifest.json | jq '.version'`
EXTENSION_ID=`cat manifest.json | jq -r '.applications.gecko.id'`
VERSION=${RAW_VERSION//\"}
EXPECTED_FILENAME="$EXTENSION_ID.$VERSION.xpi"
zip --exclude=*.DS_Store* ../$EXPECTED_FILENAME -r *

cd ..

echo
echo
echo
echo  "$EXTENSION_ID xpi ready"
echo "Path: `pwd $EXPECTED_FILENAME`/$EXPECTED_FILENAME"
