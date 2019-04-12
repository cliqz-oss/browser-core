# Freshtab

Welcome to Freshtab, the Cliqz custom page you will see on opening a new window or a new tab.
Freshtab doesn't replace your Home page, just the new tab page.
This new tab page includes speed dials for your most visited websites
(excluding websites from private sessions, of course) and favorite sites.
You can manually add and remove speed dials. The Cliqz new tab page keeps you
up-to-date by showing you a mix of headlines from popular news sources and
news sources you visit often.

On AMO, the Freshtab page is switched on by default. Prefer your
“old” Firefox page? You can turn Freshtab off at any time via the
Cliqz Control Center (see the “Q” symbol in the browser bar or your
settings menu).

Freshtab is available both on Firefox and Google Chrome.

# Terminology
Before you read further, make sure you are familiar with the following
definitions:

* **Speed dials**: Speed dials are the most visited websites and favorites sites. Most visited websites come from user's history, where as favorites are manually added by the user.
* **Urlbar-with-results** Search field with Cliqz results only on Google Chrome
* **Top news**: News from top domains that are displayed to all users.
* **History based news**: Most frequent news domains present in user's history
* **Top-messages**: Static or dynamic messages displayed on top part of Freshtab regarding feature updates
* **Message-center**: All type of messages mentioned above are managed by message-center


# Technologies
HTML, CSS, React.js

# Components / Dependencies
1. Speed dials
2. Search
3. Notifications
4. News
5. Settings
6. History UI

![freshtab-components](https://s3.amazonaws.com/cdn.cliqz.com/extension/newtab/freshtab-components.png)

# Architecture
New tab page doesn't have a storage, it relies on background to get all its data. We have 2 dataflows, pull and push.

## Pull workflow
When we open a new tab, Freshtab will ask background for information to render. For example it will ask for user's speed-dials, news and notifications.

## Push workflow
Once Freshtab is running, due to different user interactions we might want to update the contents of Freshtab. For example some notifications might be pushed to an open tab, whenever they are available. These notifications are routed by another module, message-center, which basically holds a queue of messages that will be sent to Freshtab.


# Testing
Inside Freshtab module there are 3 types of tests: content tests, integration tests and unit tests.

## Content tests
```./fern.js test configs/ci/browser.js -l (chrome | chromium)```


Above command will run all content tests. You can grep Freshtab tests http://localhost:4200/8103/tests/index.mustache?grep=Fresh%20tab

## Integration tests
We have integration tests that run both on Firefox and Chrome.

### Firefox
```./fern.js test configs/ci/browser.js -l firefox-web-ext --grep Freshtab [--firefox FIREFOX_PATH] ```


### Google Chrome
```./fern.js test configs/ci/webextension.js -l chromium-headless --grep Freshtab```


## Unit tests
```./fern.js test configs/ci/unit-tests.js -l unit-node --grep freshtab```
