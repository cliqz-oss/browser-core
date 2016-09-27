# Configure firefox globally
cp -v firefox-autoconfigs/autoconfig.js /home/jenkins/firefox/defaults/pref/autoconfig.js
cp -v firefox-autoconfigs/firefox.cfg /home/jenkins/firefox/firefox.cfg

# Install Cliqz extension
cp -fr ./build/cliqz@cliqz.com /home/jenkins/firefox/distribution/extensions/

RESOLUTION="1024x768"

if [ -z "$JOB_NAME" ] ; then
    # TODO: Fix this as docker doesn't seem to isolate Xvfb totally
    # Choose a free display number for Xvfb
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

    # TODO: Make this more robust and push live
    # Start recording video
    # finish() {
    #     pkill -2 avconv
    #     sleep 5
    #
    #     echo "Try to push on S3 if needed"
    #     if grep -v 'failures="0" errors="0"' $(mocha-report-*.xml); then
    #         echo "PUSH ON S3"
    #
    #         # Push logs
    #         PREFIX="s3://cliqz-ci/jenkins-artifacts/${JOB_NAME}/${BUILD_NUMBER}"
    #         echo $PREFIX
    #         mv /home/jenkins/profile/logs* logs
    #         ls
    #         aws s3 --region us-east-1 cp logs ${PREFIX}/logs-${VERSION}
    #
    #         # Push video
    #         aws s3 --region us-east-1 cp video.mp4 ${PREFIX}/video-${VERSION}.mp4
    #     fi
    # }

    # Disable video stream for new as Jenkins slave is a bit short on disk space...
    # avconv -y -f x11grab -r 2 -s ${RESOLUTION} -i ${DISPLAY}.0+0,0 -vcodec libx264 -threads 0 video.mp4 &
    # trap finish EXIT

    # Run VNC using virtual frame buffer
    echo "Start VNC Server"
    x11vnc -storepasswd vnc /tmp/vncpass
    x11vnc -rfbauth /tmp/vncpass -forever &


    # Run tests
    echo "Run integration tests"
    /home/jenkins/firefox/firefox -profile /home/jenkins/profile --no-remote -chrome chrome://cliqz/content/firefox-tests/run.html
else
    # TODO: Fix problem with already used display
    xvfb-run -e /dev/stdout --server-args="-screen 0 ${RESOLUTION}x24" --auto-servernum /home/jenkins/firefox/firefox -profile /home/jenkins/profile --no-remote -chrome chrome://cliqz/content/firefox-tests/run.html
fi

# Move tests report into workspace
echo "Move test report to workspace"
mv -v /home/jenkins/profile/mocha-report-* ./

# Dump logs and move into workspace
echo "Print logs"
mv -v /home/jenkins/profile/logs* ./
cat logs* | jq .

exit 0
