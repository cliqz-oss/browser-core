#!/bin/bash

set -x

# TODO: Fix this as docker doesn't seem to isolate Xvfb totally
# Choose a free display number for Xvfb
RESOLUTION="1024x768"
DISPLAY_NUMBER=0
for n in `seq 1000`; do
    if ! [ -f /tmp/X${n}-lock ] ; then
        DISPLAY_NUMBER=$n;
        echo "Using display number $DISPLAY_NUMBER";
        break;
    fi
done
export DISPLAY=:${DISPLAY_NUMBER}

# Run virtual frame buffer
Xvfb ${DISPLAY} -screen 0 ${RESOLUTION}x24 -ac &
sleep 1

openbox&

# Run VNC using virtual frame buffer
echo "Start VNC Server"
x11vnc -storepasswd vnc /tmp/vncpass
x11vnc -rfbport 5900 -rfbauth /tmp/vncpass -forever > /dev/null 2>&1 &

testem ci -l Mocha,ChromiumNoSandbox -R xunit -d > report.xml

exit 0
