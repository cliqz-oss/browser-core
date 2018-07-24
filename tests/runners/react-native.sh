#! /bin/bash

echo "1..4"

npm pack &> step1.error

if [ $? -eq 0 ]; then
	echo "ok 1 - npm pack";
else
	echo "not ok 1 - npm pack";
	echo "   Error: npm pack"
	cat step1.error | sed 's/^/   /'
fi
rm -f step1.error

cd tests/fixtures/ReactNativeTestProject

npm install &> step2.error

if [ $? -eq 0 ]; then
	echo "ok 2 - install deps";
else
	echo "not ok 2 - install deps";
	echo "   Error: install deps"
	cat step2.error | sed 's/^/   /'
fi
rm -f step2.error

npm install ../../../browser-core-*.tgz &> step3.error

if [ $? -eq 0 ]; then
	echo "ok 2 - install browser-core";
else
	echo "not ok 2 - install browser-core";
	echo "   Error: install browser-core"
	cat step3.error | sed 's/^/   /'
fi
rm -f step3.error

npm run bundle &> step4.error

if [ $? -eq 0 ]; then
	echo "ok 4 - react-native bundle";
else
	echo "not ok 4 - react-native bundle";
	echo "   Error: react-native bundle"
	cat step4.error | sed 's/^/   /'
fi
rm -f step4.error
