/* eslint { "no-return-assign": "off" } */

import moment from '../platform/lib/moment';
import momentRange from '../platform/lib/moment-range';

import getDemographics from '../core/demographics';
import getSynchronizedDate from '../core/synchronized-time';
import random from '../core/crypto/random';

import getCoreVersion from './demographics';
import logger from './logger';

momentRange.extendMoment(moment);

// only visible to this module
const MODULE_STORAGE_RUNNING_KEY = 'abtests.running';
const MODULE_STORAGE_COMPLETED_KEY = 'abtests.completed';
// visible to other modules
const SHARED_STORAGE_KEY = 'abtests_running';
const DATE_FORMAT = 'YYYY/MM/DD';

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const now = () => getSynchronizedDate().format(DATE_FORMAT);


// TODO:
// * support unlimited treatment lengths (?)

/*
 * Manages AB tests.
 */
export default class Manager {
  constructor(client, moduleStorage, sharedStorage) {
    this.client = client;
    this.moduleStorage = moduleStorage;
    this.sharedStorage = sharedStorage;
    this.runningTests = { };
    this.completedTests = { };
  }

  /*
   * Loads tests from persistent storage.
   */
  loadTests() {
    return Promise.all([
      this.moduleStorage.get(MODULE_STORAGE_RUNNING_KEY, { })
        .then(tests => this.runningTests = tests),
      this.moduleStorage.get(MODULE_STORAGE_COMPLETED_KEY, { })
        .then(tests => this.completedTests = tests),
    ]);
  }

  /*
   * Saves tests to persistent storage.
   */
  saveTests() {
    return Promise.all([
      this.moduleStorage.set(MODULE_STORAGE_RUNNING_KEY,
        this.runningTests),
      this.moduleStorage.set(MODULE_STORAGE_COMPLETED_KEY,
        this.completedTests),
      this.sharedStorage.set(SHARED_STORAGE_KEY,
        JSON.stringify(Object.keys(this.runningTests).map(id => `${id}_${this.runningTests[id].group}`))),
    ]);
  }

  /*
   * Fetches tests from remote, starts new tests, and stops expired tests.
   */
  updateTests() {
    // (1) get available tests from remote
    return this.client.getAvailableTests()
      .then((availableTests) => {
        // (2) update running tests
        this.updateRunningTests(availableTests);
        // (3) get new tests
        const newTests = this.getNewTests(availableTests);

        // (4) decide which tests to start and stop
        return Promise.all([
          this.getExpiredTests(),
          // `getUpcomingTests` calls `client.enterTest`
          this.getUpcomingTests(newTests),
        ]);
      })
      // (5) start and stop selected tests; tell remote about stopped tests
      .then(async ([expiredTests, upcomingTests]) => {
        await Promise.all(expiredTests
          .map(async (test) => {
            const stoppedTest = await this.stopTest(test);
            try {
              await this.client.leaveTest(stoppedTest);
            } catch (e) {
              logger.error('Calling `leaveTest` on remote failed', test);
            }
          })
        );

        await Promise.all(upcomingTests
          .map(test => this.startTest(test))
        );
      })
      // (6) persist state
      .then(() => {
        this.saveTests();
        logger.log('Updated tests');
      });
  }

  /*
   * Sets test-specific prefs and adds test to running tests. Does not check
   * for eligibility and does not communicate with remote server. Overwrites
   * data if test with same id already exists.
   *
   * @param {Object} test - The test to start.
   * @returns {Object} test - The started test.
   */
  startTest(test) {
    const prefs = test.groups[test.group];
    return Promise.all(
      Object.keys(prefs)
        .map(key => this.sharedStorage.set(key, prefs[key]))
    ).then(() => {
      this.runningTests[test.id] = { ...test, started: now() };
      logger.log(`Started test ${test.id} (${test.name}) in group ${test.group}`);
      return test;
    });
  }

  /*
   * Clears test-specific prefs, removes test from running tests, and adds
   * test to completed tests. Does not check if test was actually running and
   * does not communicate with remote server.
   *
   * @param {Object} test - The test to stop.
   * @returns {Object} test - The stopped test.
   */
  stopTest(test) {
    const prefs = test.groups[test.group];
    return Promise.all(
      Object.keys(prefs)
        .map(key => this.sharedStorage.remove(key))
    ).then(() => {
      delete this.runningTests[test.id];
      this.completedTests[test.id] = { ...test, completed: now() };
      logger.log(`Stopped test ${test.id} (${test.name}) in group ${test.group}`);
      return test;
    });
  }

  /*
   * Updates 'status' and 'end date' of running tests from available tests.
   *
   * @param {Object[]} availableTests - The list of available tests.
   * @returns {Object} - The dictionary of running tests after updating.
   */
  updateRunningTests(availableTests) {
    availableTests.forEach((test) => {
      if (has(this.runningTests, test.id)) {
        this.runningTests[test.id].status = test.status;
        this.runningTests[test.id].end_date = test.end_date;
      }
    });
  }

  /*
   * Gets tests from available tests that are neither currently running nor
   * have been running before (i.e., are not amongst the completed tests.)
   *
   * @param {Object[]} availableTests - The list of available tests.
   * @returns {Object[]} - The list of new tests.
   */
  getNewTests(availableTests) {
    return availableTests.filter(test =>
      !has(this.runningTests, test.id) && !has(this.completedTests, test.id));
  }

  /*
   * Finds running tests that need to be stopped (e.g., because they have been
   * completed).
   *
   * @returns {Object[]} - The list of tests to leave.
   */
  getExpiredTests() {
    return Object.keys(this.runningTests)
      .map(id => this.runningTests[id])
      .filter(test => this.shouldStopTest(test));
  }

  /**
   * Retrieves running legacy AB tests so that new AB tests can be excluded
   * from starting if they competed with legacy tests. For now, only the
   * SERP AB test 1114 is considered.
   *
   * @function getRunningLegacyTests
   * @returns The object of running legacy AB tests with test IDs keys.
   */
  async getRunningLegacyTests() {
    // The SERP AB test 1114 is a special test as only new users are assigned
    // to it. They are assigned in code (right on first browser start) rather
    // than through the AB testing backend. Also, this test is not listed with
    // the other AB tests, but is only marked by setting the 'serp_test' pref.
    const group = await this.sharedStorage.get('serp_test');

    if (!group) {
      return {};
    }

    return {
      1114: {},
    };
  }

  /*
   * Gets tests to start from new tests. A test is to be started if (1) all
   * local test criteria are fulfilled (see `shouldStartTest`) and (2) the
   * remote server accepts this user (see `client.enterTest`). Note that--when
   * this method returns--the remote server has already counted tests as
   * started, even though the tests have not yet been started locally.
   *
   * @param {Object[]} newTests - The list of new tests.
   * @returns {Object[]} - The list of tests to start.
   */
  getUpcomingTests(newTests) {
    return Promise.all(
      // (1) check (locally) which tests should start
      newTests.map(test =>
        this.shouldStartTest(test)
          .then(shouldStart => ({ test, shouldStart })))
    )
      .then(async (reports) => {
        const pendingTests = {};
        const runningLegacyTests = await this.getRunningLegacyTests();
        const upcomingTests =
          reports
            // (2) remove tests that should not start
            .filter(({ shouldStart }) => shouldStart)
            .map(({ test }) => test)
            // (3) remove competing tests
            .filter((test) => {
              const isCompeting = this.isTestCompeting(test, {
                ...pendingTests,
                ...this.runningTests,
                ...this.completedTests,
                ...runningLegacyTests,
              });
              if (!isCompeting) {
                pendingTests[test.id] = test;
              }
              return !isCompeting;
            })
            // (4) assign test groups
            .map(test => ({ ...test, group: this.chooseTestGroup(test) }));

        // (5) check (remotely) which tests can be entered
        return Promise.all(
          upcomingTests.map(test =>
            this.client.enterTest(test.id, test.group)
              .then(success => ({ test, success }))
              .catch(() => ({ test, success: false }))
          ));
      })
      // (6) remove tests that were not entered
      .then(reports => reports
        .filter(({ success }) => success)
        .map(({ test }) => test));
  }

  /*
   * Chooses from available test groups with equal probability.
   *
   * @param {Object} test - The test.
   */
  chooseTestGroup(test) {
    const groups = Object.keys(test.groups);
    const index = parseInt(random() * groups.length, 10);
    return groups[index];
  }

  /*
   * Checks if user should start the rest based on user demographics, test-
   * -specfic enter probability, etc. Does not check remote or if user is
   * already in test.
   *
   * @param {Object} test - The test.
   * @returns {Boolean} - True, if the test should be started.
   */
  shouldStartTest(test) {
    if (!this.isTestActive(test) || !this.isVersionMatch(test)) {
      return Promise.resolve(false);
    }

    return this.isDemographicsMatch(test)
      .then((isDemographicsMatch) => {
        if (!isDemographicsMatch) {
          return false;
        }

        const shouldStart = random() < test.probability;
        return shouldStart;
      });
  }

  /*
   * Checks if a running test should be stopped because it is not marked as
   * 'Active' anymore or because its treatment period is over (i.e., it has)
   * been running long enough.
   *
   * @param {Object} test - The test.
   * @returns {Boolean} - True, if the test should be stopped.
   */
  shouldStopTest(test) {
    if (!this.isTestActive(test)) {
      return true;
    }

    const expirationDate = moment(test.started, DATE_FORMAT)
      .add(test.treatment_length, 'days');
    if (!getSynchronizedDate().isBefore(expirationDate)) {
      return true;
    }

    return false;
  }

  /*
   * A test is active if its status is 'Active' and if its end date is in the
   * future.
   *
   * @param {Object} - The test to inspect.
   * @returns {Boolean} - True, if the test is active.
   */
  isTestActive(test) {
    return (test.status === 'Active') &&
      getSynchronizedDate().isBefore(moment(test.end_date, DATE_FORMAT));
  }

  /*
   * Checks if the client's core version matches the core version
   * required by the test.
   *
   * @param {Object} - The test.
   * @returns {Boolean} – True, if the core version matches.
   */
  isVersionMatch(test) {
    const version = getCoreVersion();
    return (version || '').startsWith(test.core_version || '');
  }

  /*
   * Uses demographics to check for match.
   *
   * @param {Object} test - The test.
   * @returns {Boolean} - True, if the test has matching demographics.
   */
  isDemographicsMatch(test) {
    return getDemographics()
      .catch((ex) => {
        logger.error('Error while retrieving demographics', ex);
        return {};
      })
      .then(userDemographics =>
        Object.keys(test.demographic).every((factor) => {
          const userValue = userDemographics[factor];
          const testValue = test.demographic[factor];

          if (factor === 'install_date') {
            const userDate = moment(userValue, DATE_FORMAT);
            const [testFirstDate, testLastDate] =
              testValue.split('-').map(date => moment(date));
            const testDateRange = moment.range(testFirstDate, testLastDate || testFirstDate);

            return testDateRange.contains(userDate);
          }

          return (userValue || '').startsWith(testValue);
        })
      );
  }

  /*
   * Checks if this test is competing because it lists another test as
   * competing or it is listed as competing by another test.
   *
   * @param {Object} test - The test.
   * @returns {Boolean} - True, if the test is competing.
   */
  isTestCompeting(test, otherTests) {
    // check if current tests lists a competing test
    const isListing = (test.competitors || [])
      .some(id => has(otherTests, id));

    // check if current test is listed as competing
    const isListed = Object.keys(otherTests).some(key =>
      (otherTests[key].competitors || []).some(id => id === test.id));

    return isListing || isListed;
  }
}
