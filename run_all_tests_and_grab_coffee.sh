#! /bin/bash

./run_tests_in_docker.sh | grep "^ '" | while read -r config
do
    echo "Testing: $config";
    rm -fr report.xml
    eval CONFIG="$config"
    echo "$CONFIG" >> tests_results.txt
    ./run_tests_in_docker.sh "${CONFIG}" # | grep '<testsuite' | cut -d'>' -f1 >> tests_results.txt
done
