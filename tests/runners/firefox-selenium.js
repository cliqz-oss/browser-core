const fs = require('fs-extra');
const rimraf = require('rimraf');
const path = require('path');

const selenium = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const logging = require('selenium-webdriver/lib/logging');


// PATHS
const prefix = path.join(process.env.OUTPUT_PATH, '..');
const buildDir = path.join(prefix, 'build');

const firefoxDir = path.join(process.env.FIREFOX_PATH, '..');
const profileDir = path.join(firefoxDir, 'profile');
const distributionDir = path.join(firefoxDir, 'distribution');
const extensionsDir = path.join(distributionDir, 'extensions');
const firefoxBin = path.join(firefoxDir, 'firefox');


function runSeleniumTests() {
  const profile = new firefox.Profile(profileDir);

  // Prepare chromium webdriver
  const firefoxOptions = new firefox.Options()
    .setProfile(profile)
    .setBinary(firefoxBin);

  // Enable verbose logging
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

  const caps = selenium.Capabilities.firefox();
  caps.setLoggingPrefs(prefs);

  // Create webdriver
  const driver = new selenium.Builder()
    .forBrowser('firefox')
    .withCapabilities(caps)
    .setFirefoxOptions(firefoxOptions)
    .build();

  let logInterval;

  const tearDown = () => {
    driver.quit();
    clearInterval(logInterval);
  };

  // Graceful shutdown
  process.on('SIGTERM', tearDown);

  // Run mock http server needed for tests
  driver.get('resource://cliqz/firefox-tests/run-testem.html');

  // Get logs from firefox
  logInterval = setInterval(
    () => {
      driver.manage().logs().get(logging.Type.BROWSER).then((entries) => {
        entries.forEach((entry) => {
          const message = entry.message;
          if (message.startsWith('TAP:  END')) {
            console.log('TEAR DOWN');
            tearDown();
          } else if (message.startsWith('TAP:  ')) {
            console.log(message.substr(6).trim());
          }
        });
      });
    },
    1000
  );
}


function copyFile(source, target, cb) {
  let cbCalled = false;
  const done = (err) => {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  };

  const rd = fs.createReadStream(source);
  rd.on('error', done);

  const wr = fs.createWriteStream(target);
  wr.on('error', done);
  wr.on('close', done);
  rd.pipe(wr);
}


function main() {
  // Create folders
  rimraf.sync(distributionDir);
  fs.mkdirSync(distributionDir);
  fs.mkdirSync(extensionsDir);

  rimraf.sync(profileDir);
  fs.mkdirSync(profileDir);

  // Configure firefox globally
  copyFile('firefox-autoconfigs/autoconfig.js', `${firefoxDir}/defaults/pref/autoconfig.js`, () => {});
  copyFile('firefox-autoconfigs/firefox.cfg', `${firefoxDir}/firefox.cfg`, () => {});

  // Install Cliqz extension
  fs.copySync(`${buildDir}/cliqz@cliqz.com`, `${extensionsDir}/cliqz@cliqz.com`);

  runSeleniumTests();
}


main();
