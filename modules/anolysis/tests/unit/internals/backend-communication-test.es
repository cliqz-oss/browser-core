/* global chai */
/* global describeModule */


const moment = require('moment');

const DEFAULT_DATE = '2017-01-02';
const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment(DEFAULT_DATE, DATE_FORMAT);


let httpPost = () => {};


function mockHttpPost(returnValue) {
  let response;
  try {
    response = JSON.stringify(returnValue);
  } catch (ex) {
    response = returnValue;
  }

  httpPost = (url, resolve) => resolve({ response });
}


function mockHttpPostFail() {
  httpPost = (url, resolve, payload, reject) => reject();
}


const MOCK = {
  'core/http': {
    httpPost(url, callback, data, onerror, timeout) {
      return httpPost(
        url,
        callback,
        data,
        onerror,
        timeout,
      );
    },
  },
  'core/crypto/random': {
    randomInt() { return 0; },
  },
  'core/prefs': {
    default: {
      get: (k, d) => {
        if (k === 'developer') {
          return true;
        }
        if (k === 'session') {
          return 'session';
        }
        return d;
      },
      set() {},
      has() {},
      clear() {},
    },
  },
  'anolysis/internals/synchronized-date': {
    DATE_FORMAT,
    getSynchronizedDateFormatted: () => getCurrentMoment().format(DATE_FORMAT),
    default: getCurrentMoment,
  },
  'anolysis/internals/logger': {
    default: {
      // debug(...args) { console.log('DEBUG', ...args); },
      // log(...args) { console.log('LOG', ...args); },
      // error(...args) { console.log('ERROR', ...args); },
      debug() {},
      log() {},
      error() {},
    },
  },
};


export default describeModule('anolysis/internals/backend-communication',
  () => MOCK,
  () => {
    let backend = null;

    beforeEach(function () {
      const Backend = this.module().default;
      backend = new Backend(new Map());
    });

    describe('Send demographics', () => {
      let sendDemographics;

      beforeEach(function () {
        sendDemographics = (...args) => backend.sendDemographics(...args);
      });

      it('rejects if backend cannot be reached', () => {
        mockHttpPostFail(500);
        return chai.expect(sendDemographics('{ "a": 42, "b": 1 }')).to.be.rejected;
      });

      it('accepts the correct id back', () => {
        const result = '{ "b": 1, "a": 42 }';
        mockHttpPost({ id: result });
        return chai.expect(sendDemographics({
          demographics: '{ "a": 42, "b": 1 }',
        })).to.eventually.equal(result);
      });

      it('accepts the correct id back with strange format', () => {
        const result = '{ "b": 1,                 "a"    : 42      }';
        mockHttpPost({ id: result });
        return chai.expect(sendDemographics({
          demographics: '{ "a": 42, "b": 1 }',
        })).to.eventually.equal(result);
      });

      // see comment in backend-communication.es
      // it('rejects the id with missing field', () => {
      //   mockHttpPost({ id: '{ "b": 1 }' });
      //   return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      // });
      // it('rejects the id with different value', () => {
      //   mockHttpPost({ id: '{ "b": 1, "a": 2 }' });
      //   return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      // });
      // it('rejects the id with extra fields', () => {
      //   mockHttpPost({ id: '{ "b": 1, "a": 2, "c": 3 }' });
      //   return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      // });
    });

    describe('Update GID', () => {
      let updateGID;

      beforeEach(function () {
        updateGID = (...args) => backend.updateGID(...args);
      });

      it('receives one correct GID', () => {
        mockHttpPost({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4b', gid: 'gid' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.eventually.equal('gid');
      });

      it('receives several candidates GID', () => {
        mockHttpPost({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4d', gid: 'gid1' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4c', gid: 'gid2' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4b', gid: 'gid3' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.eventually.equal('gid3');
      });

      it('receives incorrect GID', () => {
        mockHttpPost({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4d', gid: 'gid1' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4c', gid: 'gid2' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4a', gid: 'gid3' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('could not query backend', () => {
        mockHttpPostFail(500);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives no GID', () => {
        mockHttpPost({ candidates: [] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response ("candidates" is obj instead of list)', () => {
        mockHttpPost({ candidates: { hash: 1, gid: 'gid' } });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (no "candidates" field)', () => {
        mockHttpPost({ c: { hash: 1, gid: 'gid' } });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (response is just a list)', () => {
        mockHttpPost([]);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (response is undefined)', () => {
        mockHttpPost(undefined);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });
    });

    describe('Send telemetry', () => {
      let sendSignal;

      beforeEach(function () {
        sendSignal = (...args) => backend.sendSignal(...args);
      });

      it('sends signal receives illformed response (response is undefined)', () => {
        mockHttpPost(undefined);
        return chai.expect(sendSignal({ behavior: 42 })).to.be.rejected;
      });

      it('sends signal correctly', () => {
        const result = { status: 'OK' };
        mockHttpPost(result);
        return chai.expect(sendSignal({ behavior: 42 })).to.eventually.eql(result);
      });

      it('cannot query backend', () => {
        mockHttpPostFail(500);
        return chai.expect(sendSignal({ behavior: 42 })).to.be.rejected;
      });
    });
  });
