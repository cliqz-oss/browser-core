

## Requirements

* [Node.js](https://nodejs.org) `8` LTS is recommended, but version `9` will work as well.
(*warning*: Node.js 10 is currently not supported)

To manage multiple Node.js versions, you can use [nvm](https://github.com/creationix/nvm).

## Contribution Workflow

To setup your environment:
1. Fork the repository
2. Get a local copy of it: `git clone ...`
2. Add the `upstream` repository as a remote: `git remote add upstream git@github.com:cliqz/navigation-extension.git`

When you are ready to contribute:

1. `git fetch upstream` (get latest changes from `upstream`)
2. `git checkout upstream/master` (you might need to run `npm install` again
   from time to time if `package.json` changed)
3. `git checkout -b <my-feature-branch>` (create a new local branch from the
   latest `upstream/master` revision)

Note that it is *not necessary* to have your own `master` branch. Actually
having a `master` branch on your fork is not needed, as you can always take the
latest changes from `upstream/master`.

Do some changes, run tests locally (check the following sections for more
details) and then create a pull request once you are ready.

If changes are pushed upstream while you are working on your changes, it might
be necessary to *rebase* your branch against `master`. To do so:

1. `git fetch upstream`
2. `git rebase upstream/master`
3. `git push origin <my-feature-branch> --force-with-lease` (you need to
force push because *rebase* will re-write your history)

This will make sure that all commits from upstream appear before your own local
changes in the git history.

## Installing dependencies

1. `npm install -g broccoli-cli`
2. `npm install` (or `yarn install`).

## Building the Extension

To build the extension and load it into Firefox:

```sh
./fern.js serve ./configs/<CONFIG>
```

The build artifacts can be found in the `./build` folder. It is also possible to
only build the extension without serving it in a browser with:

```sh
./fern.js build ./configs/<CONFIG>
```

Which accepts the same arguments as the `serve` sub-command.

You can change flavors by specyfing a configuration file stored
under the `./configs` folder. Passing this argument is mandatory.

Examples:
* `./fern.js build ./configs/amo.js`
* `./fern.js serve ./configs/browser.js`

### Custom prefs

If you want to load your browser with predefined preferences set, all
you have to do is create a `.custom-prefs.json` file at the root of the
project and add your custom prefs there.

Example:
```json
{
  "extensions.cliqz.triggersBE": " http://10.1.21.104",
  "extensions.cliqz.offers2FeatureEnabled": true,
  "extensions.cliqz.offersDevFlag": true,
  "extensions.cliqz.offersHubTrigger": "auto"
}
```

## Testing

### Unit Tests

Running the unit tests can be done with:
```sh
./fern.js test configs/ci/unit-tests.js -l unit-node
```

### Integration Tests

There are multiple kinds of integration tests:

* Browser tests: `./fern.js test ./configs/ci/browser.js -l firefox-web-ext`
* Content tests: `./fern.js test ./configs/ci/browser.js -l chromium`
* Webextension tests: `./fern.js test ./configs/ci/webextension.js -l chromium-selenium`
* Ghostery tests: `./fern.js test ./configs/ci/ghostery.js -l ghostery-selenium`

If you want to debug and keep the browser open when test are over you can use
the `--keep-open` option for fern.js:

```sh
./fern.js test configs/ci/browser.js -l firefox-web-ext --keep-open
```

For an easier iteration flow, you can also `serve` the
extension with the `./configs/ci/browser.js` config as well
as the `--include-tests` flag, and access the following URL
`chrome://cliqz/content/firefox-tests/index.html` directly in the URL
bar.

```sh
./fern.js serve ./configs/ci/browser.js --include-tests
```


### Running Tests in Docker

Running tests in Docker has multiple advantages:
1. It does not require you to setup everything locally
2. It allows to test with different version of Firefox
3. Tests are more robust (especially the ones involving interactions with the
   dropdown)
4. The conditions are as close as possible from Jenkins when running tests in CI

The script `run_tests_in_docker.sh` is the main entry-point and can be used to
specify the kind of tests we wish to run. Running this command without any
argument will list the available configurations:

```sh
$ ./run_tests_in_docker.sh
Usage:
 ./run_tests_in_docker.sh <FERN_ARGS>

Available arguments for fern.js:
 '-l unit-node'
 '-l chromium'
 '-l firefox-web-ext --firefox ~/firefox52/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefox60/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefoxBeta/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefoxNightly/firefox/firefox'
 '-l firefox-web-ext-stresstest --firefox ~/firefox52/firefox/firefox'
 '-l chromium-selenium'
 '-l ghostery-selenium'
 '-l react-native'
```

You can run any of these by specifying the full config **wrapped in single
quotes**. For example:

```sh
./run_tests_in_docker.sh './configs/ci/browser.js -l firefox-web-ext --firefox ~/firefox60/firefox/firefox'
```
Please remember path to the configuration file is mandatory.

Also, if `xtightvncviewer` is available on your system, a vnc connection
will automatically be created to the running docker so that you can
inspect running tests. Otherwise, you can manually connect to `localhost::15900`
using the VNC client of your choice.

On Mac OS, you might also need to install `bash4`:
```
$ brew install bash
$ /usr/local/bin/bash run_tests_docker.sh '<launcher>'
```

## Contributions

Please use the configuration from [editorconfig](/.editorconfig) and check the
[Airbnb Javascript Style Guide](https://github.com/airbnb/javascript) which we
use in this project.
