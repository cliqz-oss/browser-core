const spawn = require('child_process').spawn;
const TapStreamer = require('./tap-result-streamer').TapStreamer;

exports.run = async function run(browser) {
  // Test-server is used as a mock server from the tests. It can be useful
  // whenever you expect the extension to make request http requests to a
  // server, while being able to mock the response beforehand, as well as
  // getting information about requests made to the test server afterward.
  const server = spawn('node', ['./tests/test-server.js'] /* , { stdio: 'inherit' } */);

  // This WebSocket server is used to stream the TAP test results from the
  // extension to the runner. It will forward all messages received to STDOUT so
  // that the results can be handled by testem.
  const tapStreamer = new TapStreamer();

  // Close test server and browser on exit.
  const tearDown = () => {
    // Try to kill TAP result streamer
    try {
      tapStreamer.unload();
    } catch (ex) {
      /* Ignore */
    }

    // Try to kill test http server
    try {
      server.kill();
    } catch (ex) {
      /* Ignore */
    }

    // Try to kill browser
    try {
      return browser.unload();
    } catch (ex) {
      /* Ignore */
    }

    return Promise.resolve();
  };

  // If test runner is killed via CTRL-C, then still close test server
  process.on('SIGTERM', tearDown);

  /**
   * TAP Streamer will emit the `close` event whenever the browser signals that
   * tests finished running or if the remote socket is closed for whatever
   * reason.
   */
  tapStreamer.onclose = async () => {
    // Do not tear down the test runner if specified
    if (process.env.KEEP_OPEN !== undefined) {
      return;
    }

    try {
      await tearDown();
    } catch (ex) {
      /* Ignore */
    }

    process.exit(0);
  };

  // Start browser
  await browser.run();
};
