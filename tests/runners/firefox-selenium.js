const fs = require('fs-extra');
const rimraf = require('rimraf');
const path = require('path');

const selenium = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const logging = require('selenium-webdriver/lib/logging');

const autoConfig = require('./autoconfig.js').settings;

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

  // Configure profile
  Object.keys(autoConfig).forEach((pref) => {
    console.log(`Set pref ${pref} to ${autoConfig[pref]}`);
    // profile.setPreference(pref, autoConfig[pref]);
  });

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
    clearInterval(logInterval);
    try {
      driver.quit().catch(() => { /* Browser already killed */ });
    } catch (ex) {
      /* Ignore any other exception */
    }
  };

  // Graceful shutdown
  process.on('SIGTERM', tearDown);

  driver.get('resource://cliqz/firefox-tests/run-testem.html');

  // Get logs from firefox
  logInterval = setInterval(
    () => {
      // Check if the browser is closed
      driver.getTitle()
        .then(() => {
          // browser is open
          driver.manage().logs().get(logging.Type.BROWSER).then((entries) => {
            entries.forEach((entry) => {
              const message = entry.message;
              if (message.startsWith('TAP:  ')) {
                console.log(message
                  .substr(6)                        // Remove 'TAP:  ' prefix
                  .split('\n')                      // Remove empty lines
                  .filter(l => l.trim().length > 0) // ^
                  .map((line) => {
                    if (line.startsWith('TAP:  ')) {
                      return line.substr(6);
                    }
                    return line;
                  })
                  .join('\n')
                );
              }
            });
          });
        })
        .catch(() => {
          // browser is closed
          tearDown();
        });
    },
    1000
  );
}


function main() {
  // Create folders
  rimraf.sync(distributionDir);
  fs.mkdirSync(distributionDir);
  fs.mkdirSync(extensionsDir);

  rimraf.sync(profileDir);
  fs.mkdirSync(profileDir);

  // Install Cliqz extension
  fs.copySync(`${buildDir}/cliqz@cliqz.com`, `${extensionsDir}/cliqz@cliqz.com`);

  runSeleniumTests();
}


main();
