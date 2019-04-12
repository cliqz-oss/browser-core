/* eslint-disable no-await-in-loop */

const path = require('path');
const { spawnSync } = require('child_process');

const tmp = require('tmp');

const puppeteer = require('puppeteer');

// Incremented counter to number TAP results
let tapId = 1;

function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

/**
 * Emit a new test result using TAP format. If no `error` argument is specified,
 * then the test is considered to be successful ('ok - test description'),
 * otherwise the test is a failure and we also log the exception so that it can
 * be inspected from Jenkins or any test runner.
 */
function logTap(msg, error) {
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
    fn: async (page) => {
      await page.goto('https://www.google.com/search?q=ghostery');

      // Create a fake element which should be hidden
      await page.evaluate(() => {
        const newElement = document.createElement('div');
        newElement.id = 'integration-tests';
        newElement.className = 'ads-ad';
        newElement.innerText = 'This is an ad';
        document.body.appendChild(newElement);
      });

      // Give time to Ghostery to have started and ad-blocker to be initialized
      await wait(2000);

      // Make sure the element inserted was hidden
      const visible = await page.evaluate(() => {
        const newElement = document.getElementById('integration-tests');
        return (
          window.getComputedStyle(newElement).getPropertyValue('display') !== 'none'
          && newElement.offsetHeight
          && newElement.offsetWidth
        );
      });

      if (visible) {
        throw new Error('ads element should have been hidden');
      }
    },
  },
];

// ***************************************************************************\
// * Internals                                                                |
// ***************************************************************************/

/**
 * Try to actively switch to the on-boarding page of Ghostery. This is needed
 * because by default, a first tab is loaded when Ghostery is installed via
 * puppeteer and the on-boarding page is not considered to be the active tab.
 */
async function switchToGhosteryPage(driver) {
  let index = 0;
  while (index < 10) {
    const ghosteryPages = (await driver.pages()).filter(page => page.url().startsWith('chrome-extension'));
    if (ghosteryPages.length !== 0) {
      await ghosteryPages[0].bringToFront();
      return ghosteryPages[0];
    }

    await wait(1000);
    index += 1;
  }

  throw new Error('Ghostery extension did not load');
}

/**
 * Wait for Ghostery to be initialized by checking if some element is present on
 * the on-boarding page. This seems to be a good-enough proxy for "extension
 * is running".
 */
function ghosteryInitialized(page) {
  return page.waitForSelector('div.HomeView__featureTitle');
}

/**
 * Helper function used to wrap the execution of a test with the boiler-plate
 * needed to run Ghostery in Chromium using puppeteer. It will start Chromium,
 * install Ghostery and wait for the extension to be started before invoking
 * `fn` with `driver` as argument.
 *
 * It is also in charge of closing the browser, even if exceptions were raised.
 */
async function _withGhosteryDriver(ghosteryExtension, fn) {
  let driver = null;
  const tearDown = async () => {
    try {
      await driver.close();
    } catch (ex) {
      /* Ignore exception as driver might already be closed */
    }
  };

  try {
    // Prepare chromium webdriver
    log('> create driver');
    driver = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        `--disable-extensions-except=${ghosteryExtension}`,
        `--load-extension=${ghosteryExtension}`
      ]
    });

    log('> wait for ghostery to be initialized');
    await ghosteryInitialized(await switchToGhosteryPage(driver));

    // Create page that test will manipulate
    const page = await driver.newPage();
    await page.bringToFront();

    // Run test
    await Promise.race([
      fn(page),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
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
async function runTests(ghosteryExtension) {
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
  const spawned = spawnSync(cmd, options, args);

  // Handle failure and emit TAP results
  if (spawned.error) {
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

  return output.join('\n').trim();
}

/**
 * Prepare Ghostery extension from latest `develop` branch revision and current
 * version of navigation-extension (the commit currently being tested). This
 * function will create a zip archive containing the extension, ready to be
 * installed in Chromium using puppeteer.
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
  process.chdir(ghosteryExtensionSource);
  run('git', ['fetch', '--depth=1', 'origin', 'develop:develop']);
  run('git', ['checkout', 'develop']);

  // Update browser-core to latest
  run('yarn', ['install', '--frozen-lockfile']);
  run('yarn', ['remove', 'browser-core']);
  run('yarn', ['add', navigationExtension]);

  // Build Ghostery!
  run('yarn', ['run', 'build.dev']);

  process.chdir('../');
  return 'ghostery-extension';
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
  console.log('>>>', ghosteryExtensionPath);

  // Move back to base directory
  process.chdir(baseDirectory);

  // Start tests
  runTests(ghosteryExtensionPath);
}

main();
