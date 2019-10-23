/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule */
/* eslint no-param-reassign: off */


let fetch = () => Promise.reject();
let load = () => {};
let save = () => {};

function fetchResponseWrapper(response) {
  return {
    ok: true,
    text() {
      return Promise.resolve(response);
    },
  };
}

const MOCK = {
  'core/logger': {
    default: { get() {
      return {
        debug() {},
        log() {},
        error() {},
      };
    } },
  },
  'core/prefs': {
    default: {
      get(pref, defaultValue) {
        return defaultValue;
      },
      set() {}
    }
  },
  'platform/resource-loader-storage': {
    default: class {
      save() { return save(); }

      load() { return load(); }
    }
  },
  'core/zlib': {
    inflate: x => x,
    deflate: x => x,
  },
  'core/platform': {
    isWebExtension: false,
  },
  'core/encoding': {
    fromUTF8: function (d) {
      return d;
    },
  },
  'core/http': {
    fetch: url => fetch(url),
  }
};


/**
 * Given a dict with
 */
function iterateCases(testCase, idx = 0) {
  // console.log(`${idx} ${JSON.stringify(testCase)}`);
  const keys = Object.keys(testCase);

  if (idx >= keys.length) {
    return [Object.assign(Object.create(null), testCase)];
  }

  const cases = [];
  const key = keys[idx];
  let values = testCase[key];

  if (!(values instanceof Array)) {
    values = [values];
  }

  values.forEach((value) => {
    testCase[key] = value;
    iterateCases(testCase, idx + 1).forEach((c) => {
      cases.push(c);
    });
    testCase[key] = values;
  });

  return cases;
}


function createResource(testCase, Resource) {
  return new Resource('name', {
    remoteURL: 'https://url',
    chromeURL: 'chrome://url',
    dataType: testCase.dataType,
  });
}


function getMockData(testCase) {
  if (testCase.dataType === 'json') {
    if (testCase.parsingSuccess) {
      // json + parse success
      return JSON.stringify({ data: 'data' });
    }

    // json + parse error
    return '{wrong json';
  }

  // not json
  return 'data';
}


function mockModule(testCase) {
  fetch = url =>
    new Promise((resolve, reject) => {
      const response = getMockData(testCase);

      if (url.startsWith('chrome://')) {
        // Handle chrome loading
        if (testCase.inChrome) {
          resolve(fetchResponseWrapper(response));
        } else {
          reject(new Error('Error while fetching from chrome://'));
        }
      } else if (testCase.inRemote) {
        // Handle remote loading
        resolve(fetchResponseWrapper(response));
      } else {
        reject(new Error('Error while fetching from remote'));
      }
    });

  load = () => {
    if (testCase.inProfile) {
      return Promise.resolve(getMockData(testCase));
    }
    return Promise.reject(new Error('Error while reading from profile'));
  };

  save = () => {
    if (testCase.persistSuccess) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Error while writing to profile'));
  };
}


export default describeModule('core/resource-loader',
  () => MOCK,
  () => {
    describe('#load', () => {
      let Resource;

      beforeEach(function () {
        Resource = this.module().Resource;
      });

      // Every cases except:
      // 1. parsingSuccess === false && dataType === true (since there is no parsing then)
      // 2. inProfile === true && persistSuccess === false (since there is no persisting then)

      const FAILING_CASES = [
        { inProfile: false, inChrome: false, inRemote: false, parsingSuccess: [true, false], dataType: ['json', 'plain'], persistSuccess: [true, false] },
        { inProfile: [false, true], inChrome: [true, false], inRemote: [true, false], parsingSuccess: false, dataType: 'json', persistSuccess: [true, false] },
      ];

      FAILING_CASES.forEach((pattern) => {
        iterateCases(pattern).forEach((testCase) => {
          it(`loading should fail ${JSON.stringify(testCase)}`,
            () => new Promise((resolve, reject) => {
              mockModule(testCase);
              const resource = createResource(testCase, Resource);
              resource.load()
                .then(reject)
                .catch(resolve);
            }));
        });
      });

      const SUCCESS_CASES = [
        { inProfile: true, inChrome: [true, false], inRemote: [true, false], parsingSuccess: true, dataType: ['plain', 'json'], persistSuccess: [true, false] },
        { inProfile: false, inChrome: true, inRemote: [true, false], parsingSuccess: true, dataType: ['plain', 'json'], persistSuccess: [true, false] },
        { inProfile: false, inChrome: false, inRemote: true, parsingSuccess: true, dataType: ['plain', 'json'], persistSuccess: [true, false] },
      ];

      SUCCESS_CASES.forEach((pattern) => {
        iterateCases(pattern).forEach((testCase) => {
          it(`loading should succeed ${JSON.stringify(testCase)}`,
            () => new Promise((resolve, reject) => {
              mockModule(testCase);
              const resource = createResource(testCase, Resource);
              resource.load()
                .then(resolve)
                .catch(reject);
            }));
        });
      });
    });

    describe('#updateFromRemote', () => {
      let Resource;

      beforeEach(function () {
        Resource = this.module().Resource;
      });

      // Every cases except:
      // 1. parsingSuccess === false && dataType === true (since there is no parsing then)
      // 2. inProfile === true && persistSuccess === false (since there is no persisting then)

      const FAILING_CASES = [
        { inProfile: [true, false], inChrome: [false, true], inRemote: false, parsingSuccess: [true, false], dataType: ['plain', 'json'], persistSuccess: true },
        { inProfile: [true, false], inChrome: [false, true], inRemote: true, parsingSuccess: false, dataType: 'json', persistSuccess: true },
      ];

      FAILING_CASES.forEach((pattern) => {
        iterateCases(pattern).forEach((testCase) => {
          it(`loading should fail ${JSON.stringify(testCase)}`,
            () => new Promise((resolve, reject) => {
              mockModule(testCase);
              const resource = createResource(testCase, Resource);
              resource.updateFromRemote()
                .then(reject)
                .catch(resolve);
            }));
        });
      });

      const SUCCESS_CASES = [
        { inProfile: [true, false], inChrome: [false, true], inRemote: true, parsingSuccess: true, dataType: ['plain', 'json'], persistSuccess: [true, false] },
      ];

      SUCCESS_CASES.forEach((pattern) => {
        iterateCases(pattern).forEach((testCase) => {
          it(`loading should succeed ${JSON.stringify(testCase)}`,
            () => new Promise((resolve, reject) => {
              mockModule(testCase);
              const resource = createResource(testCase, Resource);
              resource.updateFromRemote()
                .then(resolve)
                .catch(reject);
            }));
        });
      });
    });
  });
