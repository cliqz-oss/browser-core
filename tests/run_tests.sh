#! /bin/bash

set -x

export DISPLAY=:0
Xvfb $DISPLAY -screen 0 1024x768x24 -ac &
sleep 1
openbox &

x11vnc -storepasswd vnc /tmp/vncpass
x11vnc -rfbport 5900 -rfbauth /tmp/vncpass -forever > /dev/null 2>&1 &

# ./fern.js test "$@" --ci report.xml
# ./fern.js build configs/jenkins.json
OUTPUT_PATH=/app/build/ FIREFOX_PATH=/home/node/firefox55/firefox/firefox node tests/runners/firefox-web-ext-stresstest.js
