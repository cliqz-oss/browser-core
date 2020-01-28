const webExt = require('web-ext').default;
const path = require('path');
const getOptionsUrl = require('./test-options');

const prefsFromTalos = {
  // From Talos project
  'app.update.enabled': false,
  'browser.bookmarks.max_backups': 0,
  'browser.cache.disk.smart_size.enabled': false,
  'browser.cache.disk.smart_size.first_run': false,
  'browser.chrome.dynamictoolbar': false,
  'browser.dom.window.dump.enabled': true,
  'browser.EULA.override': true,
  // Disable checking if firefox is default browser
  'browser.shell.checkDefaultBrowser': false,
  'browser.warnOnQuit': false,
  'browser.tabs.remote.autostart': false,
  'dom.allow_scripts_to_close_windows': true,
  'dom.disable_open_during_load': false,
  'dom.disable_window_flip': true,
  'dom.disable_window_move_resize': true,
  'dom.max_chrome_script_run_time': 0,
  'dom.max_script_run_time': 0,
  // Allow extensions to be installed without user prompt
  'extensions.autoDisableScopes': 10,
  'extensions.enabledScopes': 5,
  'extensions.checkCompatibility': false,
  'extensions.update.notifyUser': false,
  'hangmonitor.timeout': 0,
  'security.enable_java': false,
  'toolkit.telemetry.prompted': 999,
  'toolkit.telemetry.notifiedOptOut': 999,
  'dom.send_after_paint_to_content': true,
  'security.turn_off_all_security_so_that_viruses_can_take_over_this_computer': true,
  'browser.newtabpage.directory.ping': '',
  'browser.safebrowsing.enabled': false,
  'browser.safebrowsing.malware.enabled': false,
  // Disable self-repair
  'browser.selfsupport.url': '',
  'extensions.blocklist.enabled': false,
  'extensions.update.enabled': false,
  'extensions.getAddons.maxResults': 0,
  'media.navigator.enabled': true,
  'media.peerconnection.enabled': true,
  'media.navigator.permission.disabled': true,
  'media.capturestream_hints.enabled': true,
  'general.useragent.updates.enabled': false,
  'browser.webapps.checkForUpdates': 0,
  'browser.snippets.enabled': false,
  'browser.snippets.syncPromo.enabled': false,
  'network.http.speculative-parallel-limit': 0,
  'browser.displayedE10SPrompt': 9999,
  'browser.displayedE10SPrompt.1': 9999,
  'browser.displayedE10SPrompt.2': 9999,
  'browser.displayedE10SPrompt.3': 9999,
  'browser.displayedE10SPrompt.4': 9999,
  'browser.displayedE10SPrompt.5': 9999,
  'app.update.badge': false,
  'browser.devedition.theme.showCustomizeButton': false,
  'browser.devedition.theme.enabled': false,

  // Disable restoring session
  'browser.sessionstore.resume_from_crash': false,

  // Disable extension signature check
  'xpinstall.signatures.required': false,

  // Make extensions autoupdate false by Default
  'extensions.update.autoUpdateDefault': false,

  // make absolutely sure it is really off
  'app.update.auto': false,
  'app.update.mode': 0,
  'app.update.service.enabled': false,

  // Prevent closing dialogs
  'browser.showQuitWarning': false,
  'browser.tabs.warnOnClose': false,
  'browser.tabs.warnOnCloseOtherTabs': false,

  // Don't show 'know your rights' on first run
  'browser.rights.3.shown': true,

  // Disable plugin checking
  'plugins.hide_infobar_for_outdated_plugin': true,

  // Disable health reporter
  'datareporting.healthreport.service.enabled': false,

  // Disable all data upload (Telemetry and FHR)
  'datareporting.policy.dataSubmissionEnabled': false,

  // Disable crash reporter
  'toolkit.crashreporter.enabled': false,

  // Disable download popup after automatic (script-triggered) downloads
  'browser.download.panel.shown': true,

  // Lower content sandbox to fix resource:// urls from exetnsion
  'security.sandbox.content.level': 2,

  // Allow legacy adddons
  'extensions.legacy.enabled': true,

  // Allow extensions experiments
  'extensions.experiments.enabled': true,

  // Disable system add-on updates
  'extensions.systemAddon.update.enabled': false,
};


exports.Browser = class FirefoxBrowser {
  constructor(prefs = {}) {
    this.prefs = prefs;
    this.firefox = null;
  }

  async run({
    configFilePath = process.env.CLIQZ_CONFIG_PATH,
    config,
    outputPath = process.env.OUTPUT_PATH || './build',
    firefoxPath = process.env.FIREFOX_PATH,
    sourceDir,
    firefoxProfile,
    keepProfileChanges = false,
  } = {}) {
    if (config === undefined) {
      config = require(path.resolve(configFilePath));
    }

    if (sourceDir === undefined) {
      sourceDir = config.platform === 'firefox'
        ? path.resolve(outputPath, config.settings.id)
        : path.resolve(outputPath);
    }

    const options = {
      firefox: firefoxPath,
      noReload: true,
      sourceDir,
      artifactsDir: sourceDir,
      startUrl: getOptionsUrl(),
      keepProfileChanges,
      firefoxProfile,
      pref: {
        ...prefsFromTalos,
        'lightweightThemes.selectedThemeID': 'firefox-compact-light@mozilla.org',
        'browser.link.open_newwindow': 3,
        'dom.min_background_timeout_value': 50,
        ...this.prefs,
      },
    };
    const runner = await webExt.cmd.run(options, {
      getValidatedManifest() {
        return {
          name: '',
          version: '',
        };
      },
    });
    this.firefox = runner.firefox;
    this.reloadAllExtensions = runner.reloadAllExtensions.bind(runner);
  }

  unload() {
    if (this.firefox) {
      this.firefox.kill('SIGKILL');
      this.firefox = null;
    }
  }
};
