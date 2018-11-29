# Browser Core

Cliqz features are available on multiple platforms: browsers for Windows and Mac, (based on Mozilla/Firefox), for iOS (based on Mozilla/Firefox), and for Android (based on Lightning). In addition, the Cliqz for Firefox browser extension offers key Cliqz functions for Firefox users.

Browser Core is used in:

* [Cliqz for Desktop](https://github.com/cliqz-oss/browser-f)
* [Cliqz for Android](https://github.com/cliqz-oss/browser-android)
* [Cliqz for IOS](https://github.com/cliqz-oss/browser-ios)

## Documentation

* [API](http://docs.clyqz.com/browser-core/api/)

## Core modules

The Browser Core set of features consists of multiple independent modules. All modules underlie our strict privacy and user-first principles. The most important ones are:

* quick search - [modules/ui](modules/ui/sources) - heart of the Cliqz navigation: search directly in the browser
* mobile ui - [modules/mobile-ui](modules/mobile-ui) - quick search UI for Android and iOS
* human web - [modules/human-web](modules/human-web/) - collects anonymous statistical data to assess website relevance and security [read more](https://cliqz.com/en/whycliqz/human-web)
* anti tracking - [modules/antitracking](modules/antitracking) - detects and overwrites tracking data that could be used to indentify individual users [read more](https://cliqz.com/en/whycliqz/anti-tracking)
* anti phishing -  [modules/anti-phishing](modules/anti-phishing) - detects and alerts users about forged websites and data theft attempts [read more](https://cliqz.com/en/whycliqz/anti-phishing)
* MyOffrz - [modules/offers-cc](modules/offers-cc) and [/offers-v2](modules/offers-v2) - provides the option to receive selected deals and offers to users in a novel, privacy conscious way.

A full list of modules can be found [here](https://github.com/cliqz-oss/browser-core/tree/master/modules). Please note that this list also includes experimental features that have not been and may not get released.

## Contributing

Please make sure you read [CONTRIBUTING](./CONTRIBUTING.md) for more
information about how to setup your developement environment.
