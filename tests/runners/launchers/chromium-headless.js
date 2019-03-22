/* eslint-disable import/no-extraneous-dependencies */

const puppeteer = require('puppeteer');
const getOptionsUrl = require('./test-options');

exports.Browser = class ChromiumBrowser {
  constructor() {
    this.driver = null;
  }

  async run() {
    this.driver = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-extensions-except=./build',
        '--load-extension=./build'
      ]
    });

    const page = await this.driver.newPage();
    await page.goto(getOptionsUrl());
    await page.bringToFront();
  }

  async unload() {
    try {
      await this.driver.close();
    } catch (ex) {
      /* Ignore */
    }
  }
};
