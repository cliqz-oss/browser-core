/* eslint-disable no-await-in-loop */
const fs = require('fs');
const path = require('path');

const rimraf = require('rimraf');
const spawn = require('cross-spawn');
const tmp = require('tmp');

const archiver = require('archiver');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const logging = require('selenium-webdriver/lib/logging');
const until = require('selenium-webdriver/lib/until');

// Incremented counter to number TAP results
let tapId = 1;

/**
 * Emit a new test result using TAP format. If no `error` argument is specified,
 * then the test is considered to be successful ('ok - test description'),
 * otherwise the test is a failure and we also log the exception so that it can
 * be inspected from Jenkins or any test runner.
 */
function logTap(msg, error = null) {
  const id = tapId;
  tapId += 1;
  if (!error) {
    // eslint-disable-next-line no-console
    console.log(`ok ${id} - ${msg}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`not ok ${id} - ${msg}`);
    String(error)
      .trim()
      .split(/\n+/g)
      .forEach((line) => {
        // eslint-disable-next-line no-console
        console.log(`   ${line.trim()}`);
      });
  }
}

function log(...args) {
  // eslint-disable-next-line no-console
  console.error(...args);
}

// ***************************************************************************\
// * Test definitions                                                         |
// ***************************************************************************/

const TESTS = [
  {
    it: 'checks Ghostery loads properly',
    fn: () => {},
  },
  {
    it: 'checks adblocker injects cosmetics',
    fn: async (driver) => {
      await driver.get('https://www.google.com/search?q=ghostery');

      const id = 'cliqz-adblokcer-css-rules';
      const element = webdriver.By.id(id);

      try {
        await driver.wait(until.elementLocated(element), 10000);
      } catch (ex) {
        throw new Error(`Expected #${id} to exist`);
      }
    },
  },
];

// ***************************************************************************\
// * Internals                                                                |
// ***************************************************************************/

/**
 * Asynchronously stream error logs from the running browser. This is currently
 * only used for debugging purposes, but could be pretty useful to detect error
 * while loading Cliqz/Ghostery in the future. (e.g.: test fail if we see some
 * error logs).
 */
function streamLogs(driver, tearDown) {
  // Get logs from Chromium
  return setInterval(async () => {
    try {
      // Check if the browser is closed
      await driver.getTitle();
      // Browser is open
      await driver
        .manage()
        .logs()
        .get(logging.Type.BROWSER)
        .then((entries) => {
          entries.forEach((entry) => {
            log('browser log', entry.message);
          });
        });
    } catch (ex) {
      // Browser is closed
      tearDown();
    }
  }, 1000);
}

/**
 * Try to actively switch to the on-boarding page of Ghostery. This is needed
 * because by default, a first tab is loaded when Ghostery is installed via
 * Selenium and the on-boardin page is not considered to be the active tab. This
 * function will fetch the list of opened tab and switch to all of them until we
 * reach the on-boarding page (which should be pretty fast once the tab exists).
 */
async function switchToGhosteryPage(driver) {
  let index = 0;
  let handles = [];
  while (!(await driver.getCurrentUrl()).startsWith('chrome-extension')) {
    // Refresh list of windows/tabs
    if (index >= handles.length) {
      index = 0;
      handles = await driver.getAllWindowHandles();
    }

    const handle = handles[index];
    await driver.switchTo().window(handle);

    index += 1;
  }
}

/**
 * Wait for Ghostery to be initialized by checking if some element is present on
 * the on-boarding page. This seems to be a good-enough proxy for "extension
 * is running".
 */
async function ghosteryInitialized(driver) {
  const element = webdriver.By.css('div.HomeView__featureTitle');
  await driver.wait(until.elementLocated(element), 10000);
}

/**
 * Helper function used to wrap the execution of a test with the boiler-plate
 * needed to run Ghostery in Chromium using Selenium. It will start Chromium,
 * install Ghostery and wait for the extension to be started before invoking
 * `fn` with `driver` as argument.
 *
 * It is also in charge of closing the browser, even if exceptions were raised.
 */
async function _withGhosteryDriver(ghosteryExtension, fn) {
  let interval = null;
  let driver = null;
  const tearDown = async () => {
    clearInterval(interval);
    try {
      await driver.quit();
    } catch (ex) {
      /* Ignore exception as driver might already be closed */
    }
  };

  try {
    // Prepare chromium webdriver
    log('> create selenium driver');
    const chromeOptions = new chrome.Options()
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--no-sandbox')
      .addArguments('--disable-gpu')
      .addExtensions(ghosteryExtension);

    const service = new chrome.ServiceBuilder('./chromedriver').build();
    driver = chrome.Driver.createSession(chromeOptions, service);

    // Start listening and printing logs
    interval = streamLogs(driver, tearDown);

    log('> wait for ghostery to be initialized');
    await switchToGhosteryPage(driver);
    await ghosteryInitialized(driver);

    // Run test
    await Promise.race([
      fn(driver),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
    ]);

    // Graceful shutdown
    process.on('SIGTERM', tearDown);
  } catch (ex) {
    log('while creating driver', ex);
    tearDown();
    throw ex;
  }

  // Close browser if everything went well
  tearDown();
}

/**
 * Handle running all the tests. Each test will run in a newly created Chromium
 * instance with Ghostery extension freshly installed. This function is also in
 * charge of emitting TAP-formatted result on stdout.
 */
async function runSeleniumTests(ghosteryExtension) {
  const withGhosteryDriver = fn => _withGhosteryDriver(ghosteryExtension, fn);

  for (let i = 0; i < TESTS.length; i += 1) {
    const { it, fn } = TESTS[i];
    try {
      await withGhosteryDriver(fn);
      logTap(it);
    } catch (ex) {
      logTap(it, ex);
    }
  }
}

/**
 * Helper used to run a shell command. It will also emit TAP results based on
 * the success of running the command. This allows testem to create one test
 * entry per command executed.
 */
function run(cmd, options = [], { returnStdout = false } = {}) {
  let args = { stdio: 'inherit' };
  if (returnStdout) {
    args = { stderr: 'inherit' };
  }

  log(`> ${cmd} ${options.join(' ')}`.trim());
  const spawned = spawn.sync(cmd, options, args);

  // Handle failure and emit TAP results
  if (spawned.error !== null) {
    logTap(`${cmd} ${options.join(' ')}`.trim(), spawned.error);
    process.exit(1);
  } else {
    logTap(`${cmd} ${options.join(' ')}`.trim());
  }

  // Aggregate all stdout into a string, normalizing new-lines.
  const output = [];
  spawned.output.forEach((buffer) => {
    if (buffer) {
      const str = buffer.toString('ascii').trim();
      if (str) {
        output.push(str);
      }
    }
  });

  return output.join('\n');
}

/**
 * Prepare Ghostery extension from latest `develop` branch revision and current
 * version of navigation-extension (the commit currently being tested). This
 * function will create a zip archive containing the extension, ready to be
 * installed in Chromium using Selenium.
 */
async function createGhosteryExtension(navigationExtension) {
  const ghosteryExtensionSource = 'ghostery-extension';

  // Close repository
  run('git', [
    'clone',
    '--depth=1',
    'https://github.com/ghostery/ghostery-extension.git',
    ghosteryExtensionSource,
  ]);

  // Checkout develop branch
  process.chdir(`./${ghosteryExtensionSource}`);
  run('git', ['fetch', '--depth=1', 'origin', 'develop:develop']);
  run('git', ['checkout', 'develop']);

  // Make sure we can install the latest adblocker version
  const newPackageJson = run(
    'jq',
    ['delpaths([["resolutions", "@cliqz/adblocker"]])', 'package.json'],
    { returnStdout: true },
  );
  fs.writeFileSync('package.json', newPackageJson, { encoding: 'utf-8' });

  // Update browser-core to latest
  run('yarn', ['remove', 'browser-core']);
  run('yarn', ['add', navigationExtension]);

  // Make sure everything is installed properly
  run('yarn', ['install', '--frozen-lockfile']);

  // Build Ghostery!
  run('yarn', ['run', 'build.dev']);

  // Package Ghostery
  const extensionPath = './ghostery.zip';
  await new Promise((resolve, reject) => {
    log('> package Ghostery extension');
    const output = fs.createWriteStream(extensionPath);
    const archive = archiver('zip', {
      zlib: { level: 1 }, // Sets the compression level.
    });

    // listen for all archive data to be written
    output.on('close', () => {
      logTap('package Ghostery extension');
      resolve();
    });

    // good practice to catch this error explicitly
    archive.on('error', (err) => {
      logTap('package Ghostery extension', err);
      reject(err);
    });

    archive.pipe(output);
    archive.file('./manifest.json');
    archive.directory('./app', 'app');
    archive.directory('./dist', 'dist');
    archive.directory('./_locales', '_locales');
    archive.directory('./cliqz', 'cliqz');
    archive.finalize();
  });

  // Copy artifact in parent directory and clean-up
  run('cp', [extensionPath, '../']);
  process.chdir('../');
  rimraf.sync(ghosteryExtensionSource);

  return extensionPath;
}

/**
 * Package navigation-ghostery.
 */
async function createNavigationExtension() {
  return run('node', ['fern.js', 'pack', 'configs/ci/ghostery.js'], { returnStdout: true })
    .split('\n')
    .splice(-1)[0];
}

async function main() {
  // Package navigation-extension
  const browserCoreArtifact = await createNavigationExtension();
  const baseDirectory = process.cwd();
  const navigationExtensionPath = path.join(baseDirectory, browserCoreArtifact);

  // Move to a temporary directory
  tmp.setGracefulCleanup();
  const tempDir = tmp.dirSync();
  process.chdir(tempDir.name);

  // Package ghostery-extension
  const ghosteryExtensionPath = path.join(
    tempDir.name,
    await createGhosteryExtension(navigationExtensionPath),
  );

  // Move back to base directory
  process.chdir(baseDirectory);

  // Start tests
  runSeleniumTests(ghosteryExtensionPath);
}

main();
