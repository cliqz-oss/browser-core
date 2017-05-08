# Browser Core

CLIQZ is available on multiple platforms: browsers for Windows, Mac, Linux, and iOS (based on Mozilla/Firefox), as well as the CLIQZ browser for Android (based on Lightning). There's also the CLIQZ for Firefox browser extension.

Browser Core is used in:

* [CLIQZ for Desktop](https://github.com/cliqz-oss/browser-f)
* [CLIQZ for Android](https://github.com/cliqz-oss/browser-android)
* [CLIQZ for IOS](https://github.com/cliqz-oss/browser-ios)

## Documentation

* [API](http://docs.clyqz.com/browser-core/api/)
* [Guides](http://docs.clyqz.com/browser-core/guides/)

## Core modules

Browser Core consist of independent modules that together form the CLIQZ product. The most important ones are:

* quick search - [modules/ui](modules/ui/sources) - heart of the CLIQZ navigation: search directly in the browser
* human web - [modules/human-web](modules/human-web/) - collects anonymous statistical data to assess website relevance and security [read more](https://cliqz.com/en/whycliqz/human-web)
* anti tracking - [modules/antitracking](modules/antitracking) - detects and overwrites tracking data that could be used to indentify individual users [read more](https://cliqz.com/en/whycliqz/anti-tracking)
* anti phishing -  [modules/anti-phishing](modules/anti-phishing) - detects and alerts users about forged websites and data theft attempts [read more](https://cliqz.com/en/whycliqz/anti-phishing)
* mobile ui - [modules/mobile-ui](modules/mobile-ui) - quick search UI for Android and iOS

## Requirements

Node version required: is >= 4.x

(use  [nvm](https://github.com/creationix/nvm) to manage multiple node versions)

`./fern.js install`

## Development

To start build system:

`./fern.js serve`

Release channel configuration file can be specified via optional argument (default is ./config/jenkins.json`):

`./fern.js serve ./configs/amo.json`

To run ember freshtab:

`cd modules/fresh-tab-frontend`
`ember serve -p 3000`

You can then access freshtab under http://localhost:3000. Every change you make in fresh-tab-frontend folder will be live reloaded. However if you change anything in freshtab folder (backend), restart browser to see your changes.

To build ember freshtab:
`./fern.js serve --freshtab ./configs/browser.json`

By running above command you end up with minified distributed files in fresh-tab-frontend/dist folder. If you want these files to be moved into build/firefox folder, you also have to be running fern.

## Flavours

All release channels configurations files are stored in `./configs` folder. Choose your channel and build it with:

`./fern.js build ./configs/<CHANNEL_NAME>.json`

Examples:
* `./fern.js build ./configs/amo.json`
* `./fern.js build ./configs/browser.json`
* `./fern.js build ./configs/mobile.json`

## Testing

you need to build extension with `./fern.js serve ./configs/jenkins.json` configuration file in order to run tests.

Then open this URL to start tests `chrome://cliqz/content/firefox-tests/index.html`

## Testing in Docker

It's now possible to run tests inside of docker locally. It can be useful for several reasons:

1. Test any version of firefox without poluting your system.
2. Make integration tests more robust as interacting with the browser while testing could break some tests.

The current setup allows you to:

1. Choose a firefox version at build time.
2. Run tests inside of docker.
3. Connect and interact with running docker using any VNC client.
4. Logs and test results are saved in the current extension directory.

Make sure the followings are available: `fabric` and `jinja2`.
Also, if `xtightvncviewer` is available on your system, a vnc connection will
automatically be created to the running docker so that you can inspect running tests.

Everything can be done with only one command but make sure your developement
environment is setup correctly; that is, you can run `./fern.js build` and it
should build the extension successfuly (which will be attempted by the script
if no `build` folder is present):

```sh
./run_tests_docker.sh <FIREFOX_VERSION>
```

You need `bash4` on MacOS, you can do
```
brew install bash
/usr/local/bin/bash run_tests_docker.sh <FIREFOX_VERSION>
```

Where `<FIREFOX_VERSION>` can be any [released version](https://ftp.mozilla.org/pub/firefox/releases/). For example: `./run_tests_docker.sh 47.0.1`.

You can manually connect to docker with any VNC client on `localhost`, port `15900`, password `vnc`.

## Contributions

Please use the configuration from [editorconfig](/.editorconfig).
Make sure to check out the [**JavaScript Style Guide**](https://github.com/cliqz/js-style-guide) and ensure that your code complies with the rules.
