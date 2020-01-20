/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const XmlDom = require('xmldom');

function Reporter(silent, out) {
  this.out = out || process.stdout;
  this.stoppedOnError = null;
  this.id = 1;
  this.total = 0;
  this.pass = 0;
  this.skipped = 0;
  this.results = [];
  this.startTime = new Date();
  this.endTime = null;
}

Reporter.prototype = {
  report(prefix, data) {
    this.results.push({
      launcher: prefix,
      result: data
    });
    this.display(prefix, data);
    this.total += 1;
    if (data.skipped) {
      this.skipped += 1;
    } else if (data.passed) {
      this.pass += 1;
    }
  },
  finish() {
    this.endTime = new Date();
    this.out.write(this.summaryDisplay());
    this.out.write('\n');
  },
  summaryDisplay() {
    const doc = new XmlDom.DOMImplementation().createDocument('', 'testsuite');

    const rootNode = doc.documentElement;
    rootNode.setAttribute('name', 'Testem Tests');
    rootNode.setAttribute('tests', this.total);
    rootNode.setAttribute('skipped', this.skipped);
    rootNode.setAttribute('failures', this.failures());
    rootNode.setAttribute('timestamp', new Date());
    rootNode.setAttribute('time', this.duration());

    for (let i = 0, len = this.results.length; i < len; i += 1) {
      const testcaseNode = this.getTestResultNode(doc, this.results[i]);
      rootNode.appendChild(testcaseNode);
    }
    return doc.documentElement.toString();
  },
  display() {
    // As the output is XML, the Reporter can only write its results after all
    // tests have finished.
  },
  getTestResultNode(document, options) {
    const result = options.result;
    const launcher = options.launcher;

    const resultNode = document.createElement('testcase');
    resultNode.setAttribute('classname', launcher);
    resultNode.setAttribute('name', result.name);
    resultNode.setAttribute('time', this._durationFromMs(result.runDuration));

    const error = result.items && result.items[0];
    if (error) {
      const errorNode = document.createElement('error');
      if (error.stack) {
        const cdata = document.createCDATASection(error.stack);
        errorNode.appendChild(cdata);
      }
      resultNode.appendChild(errorNode);
    } else if (result.skipped) {
      const skippedNode = document.createElement('skipped');
      resultNode.appendChild(skippedNode);
    } else if (!result.passed) {
      const failureNode = document.createElement('failure');
      resultNode.appendChild(failureNode);
    }

    return resultNode;
  },
  failures() {
    return this.total - this.pass - this.skipped;
  },
  duration() {
    return this._durationFromMs(this.endTime - this.startTime);
  },
  _durationFromMs(ms) {
    if (ms) {
      return (ms / 1000).toFixed(3);
    }

    return 0;
  }
};

module.exports = Reporter;
