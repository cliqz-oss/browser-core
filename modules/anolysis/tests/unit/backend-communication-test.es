/* global chai */
/* global describeModule */


let fetch = () => {};


function mockFetch(returnValue) {
  fetch = () => Promise.resolve({
    ok: true,
    status: 200,
    json() { return Promise.resolve(returnValue); },
  });
}


function mockFetchFail(status) {
  fetch = () => Promise.resolve({
    ok: false,
    status,
    json() { return Promise.reject(); },
  });
}


const MOCK = {
  'anolysis/logging': {
    default: () => {},
  },
  'core/http': {
    fetch(req) { return fetch(req); },
    Headers: () => ({
      append() {},
    }),
    Request: (url, options) => ({
      url,
      options,
    }),
  },
};


export default describeModule('anolysis/backend-communication',
  () => MOCK,
  () => {
    describe('Send new install signal', () => {
      let newInstall;

      beforeEach(function importNewInstall() {
        newInstall = this.module().default.newInstall;
      });

      it('accepts the correct id back', () => {
        const result = '{ "b": 1, "a": 42 }';
        mockFetch({ id: result });
        return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.eventually.equal(result);
      });

      it('accepts the correct id back with strange format', () => {
        const result = '{ "b": 1,                 "a"    : 42      }';
        mockFetch({ id: result });
        return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.eventually.equal(result);
      });

      it('rejects the id with missing field', () => {
        mockFetch({ id: '{ "b": 1 }' });
        return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      });

      it('rejects the id with different value', () => {
        mockFetch({ id: '{ "b": 1, "a": 2 }' });
        return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      });

      it('rejects the id with extra fields', () => {
        mockFetch({ id: '{ "b": 1, "a": 2, "c": 3 }' });
        return chai.expect(newInstall('{ "a": 42, "b": 1 }')).to.be.rejected;
      });
    });

    describe('Update GID', () => {
      let updateGID;

      beforeEach(function importUpdateGID() {
        updateGID = this.module().default.updateGID;
      });

      it('receives one correct GID', () => {
        mockFetch({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4b', gid: 'gid' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.eventually.equal('gid');
      });

      it('receives several candidates GID', () => {
        mockFetch({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4d', gid: 'gid1' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4c', gid: 'gid2' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4b', gid: 'gid3' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.eventually.equal('gid3');
      });

      it('receives incorrect GID', () => {
        mockFetch({ candidates: [
          { hash: '6d0ecec25e03a065a6bcde889502ff4d', gid: 'gid1' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4c', gid: 'gid2' },
          { hash: '6d0ecec25e03a065a6bcde889502ff4a', gid: 'gid3' },
        ] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('could not query backend', () => {
        mockFetchFail(500);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives no GID', () => {
        mockFetch({ candidates: [] });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response ("candidates" is obj instead of list)', () => {
        mockFetch({ candidates: { hash: 1, gid: 'gid' } });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (no "candidates" field)', () => {
        mockFetch({ c: { hash: 1, gid: 'gid' } });
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (response is just a list)', () => {
        mockFetch([]);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });

      it('receives illformed response (response is undefined)', () => {
        mockFetch(undefined);
        return chai.expect(updateGID('{ "a": 1, "b": 2 }')).to.be.rejected;
      });
    });

    describe('Send telemetry', () => {
      let sendSignal;

      beforeEach(function importSendSignal() {
        sendSignal = this.module().default.sendSignal;
      });

      it('sends signal correctly', () => {
        mockFetch(undefined);
        return chai.expect(sendSignal({ behavior: 42 })).to.eventually.equal(undefined);
      });

      it('sends signal correctly', () => {
        const result = { status: 'OK' };
        mockFetch(result);
        return chai.expect(sendSignal({ behavior: 42 })).to.eventually.eql(result);
      });

      it('cannot query backend', () => {
        mockFetchFail(500);
        return chai.expect(sendSignal({ behavior: 42 })).to.be.rejected;
      });
    });
  },
);
