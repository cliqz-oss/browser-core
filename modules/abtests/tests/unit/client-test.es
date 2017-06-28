let fetch = () => {};

const MOCK = {
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

export default describeModule('abtests/client',
  () => MOCK,
  () => {
    describe('#getAvailableTests', () => {
      let client;

      beforeEach(function () {
        const Client = this.module().default;
        client = new Client();
      });

      it('returns tests', () => {
        const result = [ { 'id': '1' }, { 'id': '2' } ];
        mockFetch(result);
        return chai.expect(client.getAvailableTests()).to.eventually.equal(result);
      });

      it('could not query backend', () => {
        mockFetchFail(500);
        return chai.expect(client.getAvailableTests()).to.be.rejected;
      });
    });
    describe('Enter test', () => {
      let client;

      beforeEach(function () {
        const Client = this.module().default;
        client = new Client();
      });

      it('enters test', () => {
        const result = { success: true };
        mockFetch(result);
        return chai.expect(client.enterTest()).to.eventually.be.true;
      });

      it('could not enter test', () => {
        const result = { success: false };
        mockFetch(result);
        return chai.expect(client.enterTest()).to.eventually.be.false;
      });

      it('could not query backend', () => {
        mockFetchFail(500);
        return chai.expect(client.enterTest()).to.be.rejected;
      });
    });
    describe('Leave test', () => {
      let client;

      beforeEach(function () {
        const Client = this.module().default;
        client = new Client();
      });

      it('leaves test', () => {
        const result = { success: true };
        mockFetch(result);
        return chai.expect(client.leaveTest()).to.eventually.be.true;
      });

      it('could not leave test', () => {
        const result = { success: false };
        mockFetch(result);
        return chai.expect(client.leaveTest()).to.eventually.be.false;
      });

      it('could not query backend', () => {
        mockFetchFail(500);
        return chai.expect(client.leaveTest()).to.be.rejected;
      });
    });
  },
);
