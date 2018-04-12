/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-unused-expressions: 'off' */
/* globals testServer */
/* global chai */
/* global waitFor */

import { events } from '../core/cliqz';
import * as datetime from '../antitracking/time';
import * as persist from '../core/persistent-state';
import Attrack from '../antitracking/attrack';
import Config from '../antitracking/config';
import QSWhitelist from '../antitracking/qs-whitelists';
import md5 from '../core/helpers/md5';
import pacemaker from '../core/pacemaker';

import { setGlobal } from '../core/kord/inject';
import WebRequestPipeline from '../webrequest-pipeline/background';

// kill config updating during the test
let attrack;

before(function () {
  // stop the pacemaker to avoid possible race conditions on events.
  pacemaker.stop();
});

beforeEach(() => {
  WebRequestPipeline.unload();
  return WebRequestPipeline.init()
    .then(() => setGlobal({
      modules: {
        'webrequest-pipeline': {
          isEnabled: true,
          isReady() { return Promise.resolve(true); },
          background: {
            actions: {
              addPipelineStep: WebRequestPipeline.actions.addPipelineStep,
              removePipelineStep: WebRequestPipeline.actions.removePipelineStep,
            }
          }
        }
      }
    }))
    .then(() => {
      attrack = new Attrack();
      attrack.VERSIONCHECK_URL = 'http://localhost/null';
    })
    .then(() => attrack.init(new Config({})));
});

after(function () {
  pacemaker.start();
});

afterEach(() =>
  Promise.resolve(attrack.unload())
    .then(() => WebRequestPipeline.unload()));


describe('QSWhitelist', function () {
  let whitelist;

  beforeEach(function () {
    whitelist = new QSWhitelist();
  });

  it('token whitelist URL is correct', function () {
    chai.expect(whitelist.TOKEN_WHITELIST_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/whitelist_tokens.json');
  });

  it('tracer domain list URL is correct', function () {
    chai.expect(whitelist.TRACKER_DM_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/tracker_domains.json');
  });

  it('safekey list URL is correct', function () {
    chai.expect(whitelist.SAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json');
  });

  it('unsafekey list URL is correct', function () {
    chai.expect(whitelist.UNSAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_unsafe_key.json');
  });

  describe('isTrackerDomain', function () {
    const domain = md5('example.com');

    it('returns false if domain not in tokens list', function () {
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

    it('returns true if domain in tokens list', function () {
      whitelist.addSafeToken(domain, '');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
    });

    it('returns false if domain is only in safe key list', function () {
      whitelist.addSafeKey(domain, '');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });
  });

  describe('addSafeKey', function () {
    const domain = md5('example.com');
    const key = md5('callback');

    it('adds a key to the safekey list', function () {
      whitelist.addSafeKey(domain, key);
      chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
    });
  });

  describe('addUnsafeKey', function () {
    const domain = md5('example.com');
    const key = md5('callback');

    it('adds a key to the unsafekey list', function () {
      whitelist.addSafeToken(domain, '');
      whitelist.addUnsafeKey(domain, key);
      chai.expect(whitelist.isUnsafeKey(domain, key)).to.be.true;
    });
  });

  describe('addSafeToken', function () {
    const domain = md5('example.com');
    const token = md5('safe');

    it('adds a key to the token list', function () {
      whitelist.addSafeToken(domain, token);
      chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
    });
  });

  describe('isUpToDate', function () {
    it('returns false if lists have not been updated', function () {
      chai.expect(whitelist.isUpToDate()).to.be.false;
    });

    describe('after list update', function () {
      this.timeout(25000);
      const mockTokenString = '{"7269d282a42ce53e58c7b3f66ca19bac": true}\n';
      const mockTrackerString = '{"f528764d624db129": true}\n';
      const mockSafekeyString = '{"f528764d624db129": {"924a8ceeac17f54d3be3f8cdf1c04eb2": "20200101"}}\n';
      const mockUnsafekeyString = '{"9dd5ed5535c6a873":{"d279186428a75016b17e4df5ea43d080": true}}\n';

      beforeEach(function () {
        whitelist.SAFE_KEY_URL = testServer.getBaseUrl('safekey.json');
        persist.setValue('safeKeyExtVersion', '');
        whitelist.TOKEN_WHITELIST_URL = testServer.getBaseUrl('token_whitelist.json');
        persist.setValue('tokenWhitelistVersion', '');
        whitelist.UNSAFE_KEY_URL = testServer.getBaseUrl('unsafekey.json');
        persist.setValue('unsafeKeyExtVersion', '');
        whitelist.TRACKER_DM_URL = testServer.getBaseUrl('tracker_domain.json');
        persist.setValue('trackerDomainsversion', '');

        return Promise.all([
          testServer.registerPathHandler('/token_whitelist.json', mockTokenString),
          testServer.registerPathHandler('/safekey.json', mockSafekeyString),
          testServer.registerPathHandler('/unsafekey.json', mockUnsafekeyString),
          testServer.registerPathHandler('/tracker_domain.json', mockTrackerString),
        ])
          .then(() => whitelist.init())
          .then(() => whitelist.onConfigUpdate({
            safekey_version: true,
            token_whitelist_version: true,
            tracker_domain_version: true,
          }));
      });

      afterEach(function () {
        whitelist.destroy();
      });

      it('returns true', function () {
        return waitFor(() => whitelist.isUpToDate());
      });
    });
  });

  describe('_loadRemoteTokenWhitelist', function () {
    const mockTokenString = '{"7269d282a42ce53e58c7b3f66ca19bac": true}\n';
    const mockTrackerString = '{"f528764d624db129": true}\n';
    const mockTokenHash = '60c6923a50683b5a9c4643d82e6195ef';
    let mockTokenUrl;
    let mockTrackerUrl;

    beforeEach(function () {
      mockTokenUrl = testServer.getBaseUrl('token_whitelist.json');
      mockTrackerUrl = testServer.getBaseUrl('tracker_domain.json');
      // mock token whitelist URL
      whitelist.TOKEN_WHITELIST_URL = mockTokenUrl;
      whitelist.TRACKER_DM_URL = mockTrackerUrl;
      persist.setValue('tokenWhitelistVersion', '');
      persist.setValue('trackerDomainsversion', '');

      return Promise.all([
        testServer.registerPathHandler('/token_whitelist.json', mockTokenString),
        testServer.registerPathHandler('/tracker_domain.json', mockTrackerString),
      ]);
    });

    it('fires an event with the new list version number', function (done) {
      const testEventVersion = function (version) {
        try {
          chai.expect(version).to.equal(mockTokenHash);
          done();
        } catch (e) {
          done(e);
        } finally {
          events.un_sub('attrack:token_whitelist_updated', testEventVersion);
        }
      };
      events.sub('attrack:token_whitelist_updated', testEventVersion);
      whitelist._loadRemoteTokenWhitelist();
    });

    context('load token and tracker lists', function () {
      beforeEach(function () {
        const today = datetime.getTime();
        whitelist._loadRemoteTokenWhitelist();
        whitelist._loadRemoteTrackerDomainList();
        return waitFor(function () {
          return whitelist.lastUpdate[1] === today && whitelist.lastUpdate[3] === today;
        });
      });

      it('loads remote token and tracker list', function () {
        chai.expect(persist.getValue('tokenWhitelistVersion')).to.equal(mockTokenHash);
        chai.expect(whitelist.isTrackerDomain('f528764d624db129')).to.be.true;
        chai.expect(whitelist.isSafeToken('f528764d624db129', '7269d282a42ce53e58c7b3f66ca19bac')).to.be.true;
      });
    });
  });

  describe('_loadRemoteSafeKey', function () {
    const mockSafekeyString = '{"f528764d624db129": {"924a8ceeac17f54d3be3f8cdf1c04eb2": "20200101"}}\n';
    let mockSafekeyUrl = '/safekey.json';
    const mockSafekeyHash = '3e82cf3535f01bfb960e826f1ad8ec2d';

    beforeEach(function () {
      mockSafekeyUrl = testServer.getBaseUrl('safekey.json');
      whitelist.SAFE_KEY_URL = mockSafekeyUrl;
      persist.setValue('safeKeyExtVersion', '');
      return testServer.registerPathHandler('/safekey.json', mockSafekeyString);
    });

    it('fires an event with the new list version number', function (done) {
      const testEventVersion = function (version) {
        try {
          chai.expect(version).to.equal(mockSafekeyHash);
          done();
        } catch (e) {
          done(e);
        } finally {
          events.un_sub('attrack:safekeys_updated', testEventVersion);
        }
      };
      events.sub('attrack:safekeys_updated', testEventVersion);
      whitelist._loadRemoteSafeKey();
    });

    it('loads remote safekeys', function () {
      whitelist._loadRemoteSafeKey();
      return waitFor(function () {
        return persist.getValue('safeKeyExtVersion', '').length > 0;
      }).then(function () {
        chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mockSafekeyHash);
        chai.expect(whitelist.isSafeKey('f528764d624db129', '924a8ceeac17f54d3be3f8cdf1c04eb2'));
      });
    });

    context('with existing safekeys', function () {
      const domain1Hash = 'f528764d624db129';
      const domain2Hash = '9776604f86ca9f6a';
      const keyHash = '4a8a08f09d37b73795649038408b5f33';

      beforeEach(function () {
        const today = datetime.getTime();

        whitelist.addSafeKey(domain1Hash, keyHash);
        whitelist.addSafeKey(domain2Hash, keyHash);

        whitelist._loadRemoteSafeKey();
        return waitFor(function () {
          return whitelist.lastUpdate[0] === today;
        });
      });

      it('merges with existing safekeys', function () {
        chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mockSafekeyHash);

        chai.expect(whitelist.isSafeKey(domain1Hash, keyHash)).to.be.true;
        chai.expect(whitelist.isSafeKey(domain1Hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.true;
        chai.expect(whitelist.isSafeKey(domain2Hash, keyHash)).to.be.true;
        chai.expect(whitelist.isSafeKey(domain2Hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.false;
      });
    });

    context('old local key', function () {
      const domain1Hash = 'f528764d624db129';
      const keyHash = '924a8ceeac17f54d3be3f8cdf1c04eb2';

      beforeEach(function () {
        const today = datetime.getTime();
        const safeKeys = whitelist.safeKeys.value;
        safeKeys[domain1Hash] = {};
        safeKeys[domain1Hash][keyHash] = [today.substring(0, 8), 'l'];

        whitelist._loadRemoteSafeKey();
        return waitFor(function () {
          return whitelist.lastUpdate[0] === today;
        });
      });

      it('replaces local key with remote if remote is more recent', function () {
        const safeKeys = whitelist.safeKeys.value;
        chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mockSafekeyHash);
        chai.expect(safeKeys[domain1Hash]).to.have.property(keyHash);
        chai.expect(safeKeys[domain1Hash][keyHash]).to.eql(['20200101', 'r']);
      });
    });

    context('new local key', function () {
      const domain1Hash = 'f528764d624db129';
      const keyHash = '924a8ceeac17f54d3be3f8cdf1c04eb2';
      const day = '20200102';

      beforeEach(function () {
        const today = datetime.getTime();
        const safeKeys = whitelist.safeKeys.value;
        safeKeys[domain1Hash] = {};
        safeKeys[domain1Hash][keyHash] = [day, 'l'];

        whitelist._loadRemoteSafeKey();
        return waitFor(function () {
          return whitelist.lastUpdate[0] === today;
        });
      });

      it('leaves local key if it is more recent than remote', function () {
        const safeKeys = whitelist.safeKeys.value;
        chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mockSafekeyHash);
        chai.expect(safeKeys[domain1Hash]).to.have.property(keyHash);
        chai.expect(safeKeys[domain1Hash][keyHash]).to.eql([day, 'l']);
      });
    });

    context('7 day old key', function () {
      const domain1Hash = 'f528764d624db129';
      const keyHash = '4a8a08f09d37b73795649038408b5f33';
      const day = new Date();
      let daystr = null;
      let d = '';
      let m = '';
      day.setDate(day.getDate() - 8);
      d = (day.getDate() < 10 ? '0' : '') + day.getDate();
      m = (day.getMonth() < 9 ? '0' : '') + parseInt(day.getMonth() + 1, 10);
      // eslint-disable-next-line prefer-template
      daystr = '' + day.getFullYear() + m + d;

      beforeEach(function () {
        const today = datetime.getTime();
        const safeKeys = whitelist.safeKeys.value;
        safeKeys[domain1Hash] = {};
        safeKeys[domain1Hash][keyHash] = [daystr, 'l'];

        whitelist._loadRemoteSafeKey();
        return waitFor(function () {
          return whitelist.lastUpdate[0] === today;
        });
      });

      it('prunes keys more than 7 days old', function () {
        const safeKeys = whitelist.safeKeys.value;
        chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mockSafekeyHash);
        chai.expect(safeKeys[domain1Hash]).to.not.have.property(keyHash);
      });
    });
  });

  describe('after init', function () {
    beforeEach(function () {
      return whitelist.init();
    });

    afterEach(function () {
      whitelist.destroy();
    });

    describe('onConfigUpdate', function () {
      let tokenCallCount;
      let safekeyCallCount;

      beforeEach(function () {
        tokenCallCount = 0;
        whitelist._loadRemoteTokenWhitelist = function () {
          tokenCallCount += 1;
        };
        safekeyCallCount = 0;
        whitelist._loadRemoteSafeKey = function () {
          safekeyCallCount += 1;
        };
      });

      it('triggers _loadRemoteTokenWhitelist if version is different', function () {
        whitelist.onConfigUpdate({ token_whitelist_version: 'new_version' });
        chai.expect(tokenCallCount).to.equal(1);
        chai.expect(safekeyCallCount).to.equal(0);
      });

      it('does not load if token version is same', function () {
        whitelist.onConfigUpdate({ whitelist_token_version: persist.getValue('tokenWhitelistVersion') });
        chai.expect(tokenCallCount).to.equal(0);
        chai.expect(safekeyCallCount).to.equal(0);
      });

      it('triggers _loadRemoteSafeKey if safekey version is different', function () {
        whitelist.onConfigUpdate({ safekey_version: 'new_version' });
        chai.expect(tokenCallCount).to.equal(0);
        chai.expect(safekeyCallCount).to.equal(1);
      });

      it('does not load if safekey version is same', function () {
        whitelist.onConfigUpdate({ safekey_version: persist.getValue('safeKeyExtVersion') });
        chai.expect(safekeyCallCount).to.equal(0);
        chai.expect(tokenCallCount).to.equal(0);
      });

      it('loads both lists if both have new versions', function () {
        whitelist.onConfigUpdate({ token_whitelist_version: 'new_version', safekey_version: 'new_version' });
        chai.expect(tokenCallCount).to.equal(1);
        chai.expect(safekeyCallCount).to.equal(1);
      });
    });
  });
});
