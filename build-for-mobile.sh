# user must specify `CLIQZ_OUTPUT_PATH` path
if [ -z "$CLIQZ_OUTPUT_PATH" ]; then
	echo "You should specify the output directory, i.e. CLIQZ_OUTPUT_PATH={path}"
	exit 1
fi

# remove old build directory
rm -R $CLIQZ_OUTPUT_PATH

# build the navigation extension for mobile production
./fern.js build configs/mobile-prod.json --version=tag

# change the output folder to subfolder `v8`
CLIQZ_OUTPUT_PATH=$CLIQZ_OUTPUT_PATH/v8

# build the navigation extension for Anti-Tracking/AdBlocker
./fern.js build configs/v8.json

# create folders structure for seeds files
echo $CLIQZ_OUTPUT_PATH
mkdir -p $CLIQZ_OUTPUT_PATH/seed-files/adblocking/easylist-downloads.adblockplus.org/
mkdir -p $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/
mkdir -p $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org
mkdir -p $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/reek/anti-adblock-killer/master/

# download AdBlocker seed files
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/customized_filters_mobile_specific.txt https://cdn.cliqz.com/adblocking/latest-filters/customized_filters_mobile_specific.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/easylist-downloads.adblockplus.org/easylistgermany.txt https://cdn.cliqz.com/adblocking/latest-filters/easylist-downloads.adblockplus.org/easylistgermany.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/easylist-downloads.adblockplus.org/antiadblockfilters.txt https://cdn.cliqz.com/adblocking/latest-filters/easylist-downloads.adblockplus.org/antiadblockfilters.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt https://cdn.cliqz.com/adblocking/latest-filters/raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt https://cdn.cliqz.com/adblocking/latest-filters/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt https://cdn.cliqz.com/adblocking/latest-filters/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt https://cdn.cliqz.com/adblocking/latest-filters/raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt
curl -o $CLIQZ_OUTPUT_PATH/seed-files/adblocking/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt https://cdn.cliqz.com/adblocking/latest-filters/raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt
