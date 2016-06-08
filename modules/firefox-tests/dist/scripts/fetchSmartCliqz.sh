#!/bin/bash

echo "Fetching smart cliqz" $1

curl https://newbeta.cliqz.com/api/v1/results?q=$1 > ../EZ/$1.json
