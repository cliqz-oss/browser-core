/* global chai */
/* global describeModule */
/* global require */
/* global describe */


let httpGet = () => {};
let load = () => {};
let save = () => {};

const MOCK = {
  'core/console': {
    default: {
      error() {
      }
    },
  },
  'core/cliqz': {
    utils: {
      setInterval() {},
      getPref(pref, defaultValue) {
        return defaultValue;
      },
      setPref() {},
      httpGet(url, resolve, reject) {
        return httpGet(url, resolve, reject);
      },
    },
  },
  'platform/resource-loader-storage': {
    default: class {
      save() { return save(); }
      load() { return load(); }
    }
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
  httpGet = (url, resolve, reject) => {
    const response = { response: getMockData(testCase) };

    if (url.startsWith('chrome://')) {
      // Handle chrome loading
      if (testCase.inChrome) {
        resolve(response);
      } else {
        reject('Error while fetching from chrome://');
      }
    } else {
      // Handle remote loading
      if (testCase.inRemote) {
        resolve(response);
      } else {
        reject('Error while fetching from remote');
      }
    }
  };

  load = () => {
    if (testCase.inProfile) {
      return Promise.resolve(getMockData(testCase));
    }
    return Promise.reject('Error while reading from profile');
  };

  save = () => {
    if (testCase.persistSuccess) {
      return Promise.resolve();
    }
    return Promise.reject('Error while writing to profile');
  };
}


export default describeModule('core/resource-loader',
  () => MOCK,
  () => {
    describe('#load', () => {
      let Resource;

      beforeEach(function importResource() {
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
            })
          );
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
            })
          );
        });
      });
    });

    describe('#updateFromRemote', () => {
      let Resource;

      beforeEach(function importResource() {
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
            })
          );
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
            })
          );
        });
      });
    });
  }
);
