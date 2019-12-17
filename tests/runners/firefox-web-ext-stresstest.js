const runner = require('./test-runner-common');
const FirefoxBrowser = require('./launchers/firefox-web-ext').Browser;

runner.run(new FirefoxBrowser({
}));
