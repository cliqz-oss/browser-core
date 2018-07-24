import config from '../core/config';

const CLIQZEnvironment = {
  RESULTS_TIMEOUT: config.settings.RESULTS_TIMEOUT,
  historySearch() {},
  // mocked functions
  updateAlias() {},
  getWindow() {},
  isOnPrivateTab() { return false; },
  isPrivate() { return false; },
  Promise,
  telemetry() {},
};

export default CLIQZEnvironment;
