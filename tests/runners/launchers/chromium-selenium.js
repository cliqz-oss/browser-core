/* eslint-disable no-await-in-loop */

const chrome = require('selenium-webdriver/chrome');
const getOptionsUrl = require('./test-options');

async function switchToTestPage(driver) {
  let index = 0;
  let handles = [];
  while (!(await driver.getCurrentUrl()).startsWith('chrome-extension')) {
    // Refresh list of windows/tabs
    if (index >= handles.length) {
      index = 0;
      handles = await driver.getAllWindowHandles();
    }

    const handle = handles[index];
    await driver.switchTo().window(handle);

    index += 1;
  }
}

exports.Browser = class ChromiumBrowser {
  constructor() {
    this.driver = null;
  }

  async run() {
    const chromeOptions = new chrome.Options()
      .addArguments('--no-sandbox')
      .addExtensions('./ext.zip');

    const service = new chrome.ServiceBuilder('./chromedriver').build();
    this.driver = chrome.Driver.createSession(chromeOptions, service);

    this.driver.get(getOptionsUrl());

    await switchToTestPage(this.driver);
  }

  async unload() {
    try {
      await this.driver.quit();
    } catch (ex) {
      /* Ignore */
    }
  }
};
