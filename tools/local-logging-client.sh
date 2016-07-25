#!/usr/bin/env bash
#
# serves as local endpoint for the extension's tracking data:
# listens to given port and writes incoming data as JSON file (one entry per line)
#
# in the extension: change CliqzUtils.LOG to 'http://localhost:PORT'
#
# author: Dominik Schmidt (cliqz)

PORT=3333
FILE_NAME="logs/track_$(date "+%Y_%m_%d-%H_%M_%S")"
PID_FILE="server.pid"

case "$1" in
    start)
		if [ -e $PID_FILE ]
			then
				echo "ERROR: pid file ($PID_FILE) exits already--server already running?"
				exit 1
		fi

		# listen to port | strip HTTP headers | flatten JSON list
		(nc -l -k $PORT & echo $! > $PID_FILE) | \
			sed -e '/^[^\[].*$/d' -e 's/^\(\[.*\]\).*$/\1/' | \
			tee "$FILE_NAME.log" | \
			jq -c ".[]" > "$FILE_NAME.json" &

		echo "client listening to port $PORT and writing to $FILE_NAME..."
		;;
	stop)
		kill $(cat $PID_FILE)
		rm $PID_FILE

		echo "stopped client"		
		;;
	*)
		echo "Usage: $0 start|stop"
		exit 1
	;;
esac

exit 0


