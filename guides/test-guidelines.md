# Testing

## Testing pipeline

The whole testing process can be described as a pipeline build with the following blocks (starting from the simplest):

launchers -> Testem -> `fern.js` -> Jenkins

### Launchers

Often also referred to as *runners*, these scripts are located in `./tests/runners/` folder and its subfolders. They define how to launch a browser instance, but do not define browser version or environment variables.

The following launchers are available at the moment:

* pre-defined Testem browser launchers like Chrome,
* unit-node,
* firefox-web-ext,
* firefox-web-ext-stresstest,
* chromium-headless,
* ghostery-headless,
* react-native.

They are used as a parameter for [`fern.js test`](#fern-js-test).

Launchers can be run directly in `nodejs` using the following command:

```sh
node <path_to_launcher>
```

They assume a build folder is already present with matching build artifacts (i.e. code has been built with the same config file). Additional environment variables have to be passed separately, e.g.:

* `FIREFOX_PATH=<path>` for path to Firefox executable,
* `CLIQZ_CONFIG_PATH=<config_file>` for path to config file.

#### Example

Assuming we have a build folder created with `configs/ci/unit-node.js` config, we can run unit tests as follows:

```sh
CLIQZ_CONFIG_PATH=./configs/ci/unit-tests.js node tests/runners/unit-node.js
```

### Testem

A test runner aggregating all launchers and reporting test results. Please see [Testem Github repository](https://github.com/testem/testem) for more specifics.

### `fern.js`

`fern` is a set of commands used to build the extension or run tests. They also handle environment variables based on passed parameters.

#### `fern.js build <config_file>`

Builds the extension once and by default does not include tests. If testing-related build is needed, build the code using the following command:

```sh
fern.js build <ci_config_file> --include-tests
```

Please notice tests require configs from `./configs/ci/` folder.

#### `fern.js serve [optional flags] <config_file>`

Builds the extension, installs it in the default browser, launches it and monitors changes in the project (rebuilds after detecting changes). By default does not include tests.

Most useful flags include:

* `--firefox [firefox path]`: specify Firefox version used to launch,
* `--include-tests`: include test-related packages and modules to be able to launch tests. This option requires config from `./configs/ci/` folder.

If the testing flag is used, browser opens a testing page but **does not** start running tests by itself. This allows you to change URL parameters as needed (see the [URL options](#url-options) section). To run tests, edit `autostart=false` parameter in the address bar and change it to `true`.

#### `fern.js test -l <launcher> [optional flags] <ci_config_file>`

Builds and installs an extension in [custom launcher(s)](#launchers) and automatically starts running tests. By default will close the browser after tests are finished.

Most useful flags include:

* `--grep [pattern]`: only run tests matching [pattern],
* `--firefox [firefox path]`: specify Firefox version used to launch,
* `--no-build`: skip the build and run tests only,
* `--keep-open`: do not close the browser.

#### `fern.js lint`

Does not build, just run Linter and check for code errors. Can be run with a `--fix` flag, which will try to fix the errors automatically.

##### URL options

Tests based on Firefox are opening URL where additional parameters can be passed as an extension to it:

* `forceExtensionReload`:

  * `0` to load extension only once at the beginning,
  * `0.5` to reload extension every other test,
  * `1` to reload extension before every single test,

* `grep`: pass any string to match text from `describe`, `context` and / or `it` blocks and run only the matching tests,

* `autostart`: `true` starts the tests.

First parameter has to be passed after `?`, next parameters after `&`. Values of parameters are passed with `=`, e.g.:

```sh
chrome://cliqz/content/integration-tests/index.html?forceExtensionReload=0&grep=dropdown&autostart=false
```

#### Examples

* Serve in Firefox 56 and be able to run tests:

  ```sh
  ./fern.js serve configs/ci/browser.js --include-tests --firefox /Applications/Firefox56.app/
  ```

* Run all Firefox integration tests:

  ```sh
  ./fern.js test configs/ci/browser.js -l firefox-web-ext
  ```

* Run all Android tests and keep the browser open:

  ```sh
  ./fern.js test configs/ci/cliqz-android.js -l firefox-web-ext --keep-open
  ```

* Run content tests in Chrome (browser will close after tests are done):

  ```sh
  ./fern.js test configs/ci/browser.js -l Chrome
  ```

* Run unit tests:

  ```sh
  ./fern.js test configs/ci/unit-tests.js -l unit-node
  ```

### Docker

Running tests in Docker has multiple advantages:

1. It does not require you to setup everything locally.
2. It allows to test with different version of Firefox.
3. Tests are more robust (especially the ones involving interactions with the dropdown).
4. The conditions are as close as possible from Jenkins when running tests in CI.

The script `run_tests_in_docker.sh` is the main entry-point and can be used to specify the kind of tests we wish to run. Running this command without any argument will list the available configurations:

```sh
$ ./run_tests_in_docker.sh
Usage:
 ./run_tests_in_docker.sh <FERN_ARGS>

Available arguments for fern.js:
 '-l unit-node'
 '-l chromium'
 '-l firefox-web-ext --firefox ~/firefox56/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefox60/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefoxBeta/firefox/firefox'
 '-l firefox-web-ext --firefox ~/firefoxNightly/firefox/firefox'
 '-l firefox-web-ext-stresstest --firefox ~/firefox56/firefox/firefox'
 '-l chromium-headless'
 '-l ghostery-headless'
 '-l react-native'
```

You can run any of these by specifying the full config **wrapped in single quotes**. For example:

```sh
./run_tests_in_docker.sh './configs/ci/browser.js -l firefox-web-ext --firefox ~/firefox60/firefox/firefox'
```

**IMPORTANT:**

* notice you have to pass the parameters using quotes,
* notice the Firefox path is not the one you use locally, but path specified in CI (see `Jenkinsfile` for reference what Firefox versions are currently available).

This might take some time for the first run (and every time the Docker image has to be rebuilt).

If `xtightvncviewer` is available on your system, a vnc connection
will automatically be created to the running docker so that you can
inspect running tests.

Otherwise, you can manually connect (using VNC Viewer or similar software) using the following parameters:

* VNC server address: `localhost:15900`
* password: `vnc`

On Mac OS, you might also need to install `bash4`:

```sh
brew install bash
/usr/local/bin/bash run_tests_docker.sh '<launcher>'
```

If upon connecting you see a black window the code is probably still being built. If you are using `fern.js test` and try to connect too late (when tests are finished), your connection will be refused.

You cannot have two containers running at the same time. If for some reasons your tests didn't finish correctly and you still have an active container, you can list all containers and their IDs with:

```sh
docker ps
```

Then you can close the outdated container with:

```sh
docker stop [container ID]
```

Which version of `fern` is running in Docker (`test` vs `serve`) is specified in `tests/run_tests.sh`. By default, Docker tests are running with the `test` option (as it starts the tests and closes the browser afterwards automatically):

```sh
./fern.js test "$@" --ci report.xml
```

For development, you can replace it with `serve`:

```sh
./fern.js serve "$@" --include-tests
```

Please don't forget to change it back to `test` after you're done.

<!-- TODO
### Jenkins  -->

## Types of tests

The code can be tested on different levels. Currently the following types of tests have been implemented:

* unit,
* content,
* integration.

### Unit tests

The lowest level of testing, covering the simplest blocks of code. Should be written at the same time as development of new features.

The `unit-node` [test runner](#unit-node) browses the project tree using the following pattern:
`/**/tests/**/unit/**/*-test.js`.

Therefore, to include new unit tests:

* if it does not exist, create `tests` folder in the module folder you would like to test (it should be at the same level as **sources** and **dist** folders),
* in the `tests` folder create a `unit` subfolder,
* add tests files, separate for each submodule (following the [naming convention](#name-convention)).

### Content and integration tests

These tests are based on Mocha tests framework together with [Chai assertion library](http://chaijs.com).

#### Content

These tests check functionality of one or very few components in isolation, not in the whole working system. A typical usage of content testing would be detailed tests of UI components, rendering, simple interactions (e.g. Freshtab rendered inside the testing framework, not as a new tab opened in the browser). These tests cannot check communication between different modules, hence sometimes require mocking of some features.

To include new tests:

* if it does not exist, create `tests` folder in the module folder you would like to test (it should be at the same level as **sources** and **dist** folders),
* in the `tests` folder create a `content` subfolder,
* add tests files, separate for each submodule (following the [naming convention](#name-convention)).

#### Integration

These tests check the whole system (extension) and the way its components are working together. A typical usage of integration testing would be checks of telemetry/signal/messaging (e.g. Freshtab opened in a new tab to check if offer-related signals have been sent).

While it's a good idea to implement basic tests of static content elements as part of integration suites, detailed tests of this type should be part of content testing for the sake of simplicity and speed.

You also need to update your hosts file with following

```sh
127.0.0.1   localhost cliqztest.com
```

## How to implement unit tests

The following code snippet shows the basic implementation and the comments on it explain what they mean and how to implement a very basic one.

```javascript
/* global chai */
/* global describeModule */
/* global require */

// describe the (sub)module name we are testing, in this case is the offers_db
// inside of the offers-v2 module.
//
export default describeModule('offers-v2/offers_db',
  // in this first part we define all the possible mocks we will use on the tests,
  // this should be defined as a dictionary of
  // <path_to_module> -> {variable | class | function}
  // When compiling the tests all the reference to those elements will be mocked up.
  () => ({
    // here we are mocking up the logging handler, so everywhere that is being imported
    // will take the following implementation. In this case is empty and dummy,
    // note that if your code use any of the functions exposed by the class / object
    // will throw an exception since it is not defined here.
    './logging_handler': {
      default: {}
    },
    // in this case we are defining the variable isWebExtension from the core/platform
    // module as false, since in this particular case is the only one we are using
    // from one of the includes on our dependencies.
    'core/platform': {
      isWebExtension: false
    },
    // we are defining here the default class for the db_helper, note that here we
    // are not defining the name of the class but the interface exported.
    // We also defined 2 functions (2 mocked functions) method1 and method2.
    './db_helper': {
      default: class {
        method1() {
          return 1;
        }
        method2() {
          return null;
        }
      }
    }
  }),
  () => {
    // Here we define all the tests for this particular module.
    // We can group them using describe / context / it, as nested as we want, trying
    // to keep a human readable logic, on the following case we define one set of
    // tests named "constructor" where we have 2 context: "with argument" and
    // "without argument", where inside of them we check some other cases (it(...)).
    //
    // Every context (describe section as well) can have global variables but is
    // important that each of the tests are isolated from each other, since we cannot
    // ensure the ordering of the execution, we should not have dependencies between them.
    // If you need to execute on common code before each test (it block) you can
    // use the beforeEach method as shown below, the same applies if you need to
    // execute some common code after each test (method: afterEach(...)).
    //
    // For more information about how to assert check the chai API documentation.
    //
    describe('OffersDB', function() {
      let OffersDB;

      beforeEach(function () {
        // this is the way we can load the current module, the one is at
        // the above descrubeModule part, this will return a reference to the
        // object (not instance) that we will need later to construct an instance
        // of it. Note that the name we define here is not strictly the same than
        // the one defined on offers_db module, but it will be good to keep the same
        // for consistency.
        OffersDB = this.module().default;
      });

      describe('#constructor', function () {
        context('with argument', function () {
          let db;

          beforeEach(function () {
            db = new OffersDB({});
          });

          it('sets dbDirty to false', function () {
            chai.expect(db).to.have.property('dbDirty').that.equals(false);
          });

          it('wraps db with DbHelper', function () {
            // if you need to load a different interface you can use the *deps*
            // method instead of *module* as used before. In this particular case
            // we are saying that DbHelper will be the interface used to build objects
            // of type defined as default on ./db_helper (this case is a mock).
            const DbHelper = this.deps('./db_helper').default;

            // if you need to dynamically override a method you can do it using
            // the prototype as follow:
            DbHelper.prototype.test = () => 1

            chai.expect(db).to.have.property('db').that.is.instanceOf(DbHelper);
            chai.expect(db.db.test()).to.equal(1)
          })
        });

        context('without argument', function () {
          it('throw error', function () {
            chai.expect(function () {
              new OffersDB();
            }).to.throw(Error)
          });
        })
      });
    })
  }
);
```

If for some reason you need (**you should try to avoid as much as possible**) to use an external module what you can do a small trick and load it (take into account that this is not a good practice since you are not isolating the test but generating a external dependency).

In the following example we will try to load a module named `offers_db` located on the `offers-v2` module folder, which contains a class named `OfferDB`.

```javascript
      let OfferDB;

      beforeEach(function () {
        OfferProcessor = this.module().default;
        return this.system.import('offers-v2/offers_db').then((mod) => {
          OfferDB = mod.default;
        });
      });
```

After that you can create an object of type OfferDB as usual.

## Name convention

### Unit

The files created in `tests/unit` folder should be named using the following convention: `[sub_module_name]-test.es`. All segments of the filename are lowercase.

Each submodule should have a separate file.

### Content / integration

Create the files in `tests/content` or `tests/integration` folders, named using the following convention: `[tested_area]-test.es`. All segments of the filename are lowercase.

If there are different types of test, e.g. interactions vs UI, these should also be included in the file name.
