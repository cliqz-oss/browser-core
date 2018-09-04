const fs = require('fs');

const archiver = require('archiver');

const runner = require('./test-runner-common');
const ChromiumBrowser = require('./launchers/chromium-selenium').Browser;

function main() {
  // Package chromium extension into a zip archive
  const output = fs.createWriteStream('./ext.zip');
  const archive = archiver('zip', {
    zlib: { level: 1 },
  });

  // listen for all archive data to be written
  output.on('close', () => {
    runner.run(new ChromiumBrowser());
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
