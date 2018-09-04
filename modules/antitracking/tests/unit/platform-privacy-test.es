
const prefs = new Map();

const mockPrefs = {
  getPref: (name) => {
    return prefs.get(name);
  },
  setPref: (name, value) => {
    prefs.set(name, value);
  },
  clearPref: (name) => {
    prefs.delete(name);
  },
}

export default describeModule('platform/privacy', () => ({
  'platform/prefs': mockPrefs,
}), function () {

  let privacy;

  beforeEach(function () {
    prefs.clear();
    privacy = this.module().default;
  });

  it('has network property', () => {
    chai.expect(privacy.network).to.exist;
  });

  it('has services property', () => {
    chai.expect(privacy.services).to.exist;
  });

  it('has websites property', () => {
    chai.expect(privacy.websites).to.exist;
  });

  describe('privacy.websites', function () {

    it('has cookieConfig property', () => {
      chai.expect(privacy.websites.cookieConfig).to.exist;
    });

    it('has firstPartyIsolate property', () => {
      chai.expect(privacy.websites.firstPartyIsolate).to.exist;
    });

    describe('firstPartyIsolate', () => {

      it('read (undefined)', async () => {
        chai.expect(await privacy.websites.firstPartyIsolate.get()).to.eql({
          levelOfControl: 'controllable_by_this_extension',
          value: undefined,
        });
      });

      it('read (externally set)', async () => {
        prefs.set('privacy.firstparty.isolate', false);
        chai.expect(await privacy.websites.firstPartyIsolate.get()).to.eql({
          levelOfControl: 'controllable_by_this_extension',
          value: false,
        });
      });

      it('write + read (set by self)', async () => {
        await privacy.websites.firstPartyIsolate.set({ value: true });
        chai.expect(await privacy.websites.firstPartyIsolate.get()).to.eql({
          levelOfControl: 'controlled_by_this_extension',
          value: true,
        });
        chai.expect(prefs.get('privacy.firstparty.isolate')).to.be.true;
      });
    });

    describe('cookieConfig', () => {

      it('read (undefined)', async () => {
        chai.expect(await privacy.websites.cookieConfig.get()).to.eql({
          levelOfControl: 'controllable_by_this_extension',
          value: {
            behavior: undefined,
            nonPersistentCookies: undefined,
          },
        });
      });

      it('read (externally set)', async () => {
        prefs.set('privacy.clearOnShutdown.cookies', true);
        prefs.set('network.cookie.cookieBehavior', 0);
        chai.expect(await privacy.websites.cookieConfig.get()).to.eql({
          levelOfControl: 'controllable_by_this_extension',
          value: {
            behavior: 'allow_all',
            nonPersistentCookies: true,
          },
        });
      });

      it('write + read (set by self)', async () => {
        await privacy.websites.cookieConfig.set({
          value: {
            behavior: 'allow_visited',
            nonPersistentCookies: false,
          }
        });
        chai.expect(await privacy.websites.cookieConfig.get()).to.eql({
          levelOfControl: 'controlled_by_this_extension',
          value: {
            behavior: 'allow_visited',
            nonPersistentCookies: false,
          },
        });
        chai.expect(prefs.get('privacy.clearOnShutdown.cookies')).to.be.false;
        chai.expect(prefs.get('network.cookie.cookieBehavior')).to.equal(3);
      });
    });
  });
});