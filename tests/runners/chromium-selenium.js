const fs = require('fs');
const spawn = require('child_process').spawn;
const path = require('path');

const archiver = require('archiver');
const selenium = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const logging = require('selenium-webdriver/lib/logging');


function runSeleniumTests() {
  // console.log('Running selenium tests...');

  // Prepare chromium webdriver
  const chromeOptions = new chrome.Options();
  chromeOptions.addExtensions(path.join(__dirname, 'ext.zip'));
  chromeOptions.addArguments('--temp-profile --no-sandbox');

  // Enable verbose logging
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  const caps = selenium.Capabilities.chrome();
  caps.setLoggingPrefs(prefs);

  // Create webdriver
  const driver = new selenium.Builder()
    .forBrowser('chrome')
    .withCapabilities(caps)
    .setChromeOptions(chromeOptions)
    .build();

  const server = spawn('node', ['./tests/test-server.js']);
  let logInterval;

  const tearDown = () => {
    driver.quit();
    server.kill();
    clearInterval(logInterval);
  };

  // Graceful shutdown
  process.on('SIGTERM', tearDown);

  // Run mock http server needed for tests
  driver.get('chrome-extension://ekfhhggnbajmjdmgihoageagkeklhema/modules/chromium-tests/test.html');

  // Get logs from firefox
  logInterval = setInterval(
    () => {
      driver.manage().logs().get(logging.Type.BROWSER).then((entries) => {
        entries.forEach((entry) => {
          const message = entry.message;
          if (message.includes('TAP:  END')) {
            tearDown();
          } else if (message.includes('TAP:  ')) {
            const index = message.indexOf('TAP:  ');
            const cleaned = message.substr(index + 6).replace(/[\s"]+$/g, '');
            console.log(cleaned);
          }
        });
      });
    },
    1000
  );
}


function main() {
  // Package chromium extension into a zip archive
  // console.log('Package extension...')
  const output = fs.createWriteStream(path.join(__dirname, 'ext.zip'));
  const archive = archiver('zip', {
    zlib: { level: 1 } // Sets the compression level.
  });

  // listen for all archive data to be written
  output.on('close', () => {
    // console.log('Created ext.zip file');
    runSeleniumTests();
  });

  // good practice to catch this error explicitly
  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory('build/', false);
  archive.finalize();
}


main();
