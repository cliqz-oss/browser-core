/* eslint-disable no-await-in-loop */

const chrome = require('selenium-webdriver/chrome');

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

    // Open fake data-url to allow passing options to mocha
    const options = {
      grep: process.env.MOCHA_GREP || '',
    };
    this.driver.get(`data:text/plain,${JSON.stringify(options)}`);

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
