const Browser = require('./launchers/chromium-headless').Browser;
require('./test-runner-common').run(new Browser());
