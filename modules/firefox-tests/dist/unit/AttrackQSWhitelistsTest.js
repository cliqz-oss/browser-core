DEPS.AttrackQSWhitelistTest = ["core/utils", "core/events"];
TESTS.AttrackQSWhitelistTest = function (CliqzUtils, CliqzEvents) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      QSWhitelist = System.get('antitracking/qs-whitelists').default,
      md5 = System.get('antitracking/md5').default,
      persist = System.get('antitracking/persistent-state'),
      datetime = System.get('antitracking/time'),
      pacemaker = System.get('antitracking/pacemaker').default,
      CliqzAttrack = System.get('antitracking/attrack').default;

  // kill config updating during the test
  CliqzAttrack.VERSIONCHECK_URL = "http://localhost/null"

  before(function() {
    // stop the pacemaker to avoid possible race conditions on events.
    pacemaker.stop()
  });

  after(function() {
    pacemaker.start();
  });

  describe('QSWhitelist', function() {
    var whitelist;

    beforeEach(function() {
      whitelist = new QSWhitelist();
    });

    it('token whitelist URL is correct', function() {
      chai.expect(whitelist.TOKEN_WHITELIST_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/whitelist_tokens.json');
    });

    it('tracer domain list URL is correct', function() {
      chai.expect(whitelist.TRACKER_DM_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/tracker_domains.json');
    });

    it('safekey list URL is correct', function() {
      chai.expect(whitelist.SAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json');
    });

    it('unsafekey list URL is correct', function() {
      chai.expect(whitelist.UNSAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_unsafe_key.json');
    });

    describe('isTrackerDomain', function() {

      var domain = md5('example.com');

      it('returns false if domain not in tokens list', function() {
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
      });

      it('returns true if domain in tokens list', function() {
        whitelist.addSafeToken(domain, '');
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
      });

      it('returns false if domain is only in safe key list', function() {
        whitelist.addSafeKey(domain, '');
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
      });

    });

    describe('addSafeKey', function() {
      var domain = md5('example.com'),
          key = md5('callback');

      it('adds a key to the safekey list', function() {
        whitelist.addSafeKey(domain, key);
        chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
      });

    });

    describe('addUnsafeKey', function() {
      var domain = md5('example.com'),
          key = md5('callback');

      it('adds a key to the unsafekey list', function() {
        whitelist.addSafeToken(domain, '');
        whitelist.addUnsafeKey(domain, key);
        chai.expect(whitelist.isUnsafeKey(domain, key)).to.be.true;
      });
    })

    describe('addSafeToken', function() {
      var domain = md5('example.com'),
          token = md5('safe');

      it('adds a key to the token list', function() {
        whitelist.addSafeToken(domain, token);
        chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
      });
    });

    describe('isUpToDate', function() {

      it('returns false if lists have not been updated', function() {
        chai.expect(whitelist.isUpToDate()).to.be.false;
      });

      describe('after list update', function() {
        this.timeout(25000);
        var mock_token_string = '{"7269d282a42ce53e58c7b3f66ca19bac": true}\n',
          mock_tracker_string = '{"f528764d624db129": true}\n',
          mock_token_hash = '60c6923a50683b5a9c4643d82e6195ef',
          mock_tracker_hash = 'ad9ce25e234a817f450e452088dac9f4',
          mock_safekey_string = '{\"f528764d624db129\": {\"924a8ceeac17f54d3be3f8cdf1c04eb2\": \"20200101\"}}\n',
          mock_safekey_hash = '3e82cf3535f01bfb960e826f1ad8ec2d';
          mock_unsafekey_string = '{"9dd5ed5535c6a873":{"d279186428a75016b17e4df5ea43d080": true}}\n';
          mock_unsafekey_hash = '734be41a8fdf93dbcb802dd3a1973d25';

        beforeEach(function() {
          testServer.registerPathHandler('/token_whitelist.json', function(request, response) {
            response.write(mock_token_string);
          });
          testServer.registerPathHandler('/safekey.json', function(request, response) {
            response.write(mock_safekey_string);
          });
          testServer.registerPathHandler('/unsafekey.json', function(request, response) {
            response.write(mock_unsafekey_string);
          });
          testServer.registerPathHandler('/tracker_domain.json', function(request, response) {
            response.write(mock_tracker_string);
          });

          whitelist.SAFE_KEY_URL = 'http://localhost:' + testServer.port + '/safekey.json';
          persist.setValue('safeKeyExtVersion', '');
          whitelist.TOKEN_WHITELIST_URL = 'http://localhost:' + testServer.port + '/token_whitelist.json';
          persist.setValue('tokenWhitelistVersion', '');
          whitelist.UNSAFE_KEY_URL = 'http://localhost:' + testServer.port + '/unsafekey.json';
          persist.setValue('unsafeKeyExtVersion', '');
          whitelist.TRACKER_DM_URL = 'http://localhost:' + testServer.port + '/tracker_domain.json';
          persist.setValue('trackerDomainsversion', '');

          return whitelist.init().then(function () {
            whitelist.onConfigUpdate({
              safekey_version: true,
              token_whitelist_version: true,
              tracker_domain_version: true,
            });
          });
        });

        afterEach(function () {
          whitelist.destroy();
        });

        it('returns true', function() {
          return waitFor(function() {
            return whitelist.isUpToDate();
          });
        });
      });

    });

    describe('_loadRemoteTokenWhitelist', function() {
      var mock_token_string = '{"7269d282a42ce53e58c7b3f66ca19bac": true}\n',
          mock_tracker_string = '{"f528764d624db129": true}\n',
          mock_token_hash = '60c6923a50683b5a9c4643d82e6195ef',
          mock_tracker_hash = 'ad9ce25e234a817f450e452088dac9f4',
          mock_token_url, mock_tracker_url;

      beforeEach(function() {
        testServer.registerPathHandler('/token_whitelist.json', function(request, response) {
          response.write(mock_token_string);
        });
        mock_token_url = 'http://localhost:' + testServer.port + '/token_whitelist.json';

        testServer.registerPathHandler('/tracker_domain.json', function(request, response) {
          response.write(mock_tracker_string);
        });
        mock_tracker_url = 'http://localhost:' + testServer.port + '/tracker_domain.json';
        // mock token whitelist URL
        whitelist.TOKEN_WHITELIST_URL = mock_token_url;
        whitelist.TRACKER_DM_URL = mock_tracker_url;
        persist.setValue('tokenWhitelistVersion', '');
        persist.setValue('trackerDomainsversion', '');
      });

      it('fires an event with the new list version number', function(done) {
        var testEventVersion = function(version) {
          try {
            chai.expect(version).to.equal(mock_token_hash);
            done();
          } catch(e) {
            done(e);
          } finally {
            CliqzEvents.un_sub('attrack:token_whitelist_updated', testEventVersion);
          }
        };
        CliqzEvents.sub('attrack:token_whitelist_updated', testEventVersion);
        whitelist._loadRemoteTokenWhitelist();
      });

      context('load token and tracker lists', function() {

        beforeEach( function() {
          this.timeout(25000)
          var today = datetime.getTime();
          whitelist._loadRemoteTokenWhitelist();
          whitelist._loadRemoteTrackerDomainList();
          return waitFor(function() {
            return whitelist.lastUpdate[1] === today && whitelist.lastUpdate[3] === today;
          });
        });

        it('loads remote token and tracker list', function() {
          chai.expect(persist.getValue('tokenWhitelistVersion')).to.equal(mock_token_hash);
          chai.expect(whitelist.isTrackerDomain('f528764d624db129')).to.be.true;
          chai.expect(whitelist.isSafeToken('f528764d624db129', '7269d282a42ce53e58c7b3f66ca19bac')).to.be.true;
        });
      });

    });

    describe('_loadRemoteSafeKey', function() {
      var mock_safekey_string = '{\"f528764d624db129\": {\"924a8ceeac17f54d3be3f8cdf1c04eb2\": \"20200101\"}}\n',
          mock_safekey_url = '/safekey.json',
          mock_safekey_hash = '3e82cf3535f01bfb960e826f1ad8ec2d';

      beforeEach(function() {
        testServer.registerPathHandler('/safekey.json', function(request, response) {
          response.write(mock_safekey_string);
        });
        mock_safekey_url = 'http://localhost:' + testServer.port + '/safekey.json';

        whitelist.SAFE_KEY_URL = mock_safekey_url;
        persist.setValue('safeKeyExtVersion', '');
      });

      it('fires an event with the new list version number', function(done) {
        var testEventVersion = function(version) {
          try {
            chai.expect(version).to.equal(mock_safekey_hash);
            done();
          } catch(e) {
            done(e);
          } finally {
            CliqzEvents.un_sub('attrack:safekeys_updated', testEventVersion);
          }
        };
        CliqzEvents.sub('attrack:safekeys_updated', testEventVersion);
        whitelist._loadRemoteSafeKey();
      });

      it('loads remote safekeys', function() {
        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
            chai.expect(whitelist.isSafeKey('f528764d624db129', '924a8ceeac17f54d3be3f8cdf1c04eb2'));
            done();
          } catch(e) { done(e); }
        });
      });

      context('with existing safekeys', function() {
        var domain1_hash = 'f528764d624db129',
          domain2_hash = '9776604f86ca9f6a',
          key_hash = '4a8a08f09d37b73795649038408b5f33';

        beforeEach( function() {
          var today = datetime.getTime();

          whitelist.addSafeKey(domain1_hash, key_hash);
          whitelist.addSafeKey(domain2_hash, key_hash);

          whitelist._loadRemoteSafeKey();
          return waitFor(function() {
            return whitelist.lastUpdate[0] === today
          });
        });

        it('merges with existing safekeys', function() {
          chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);

          chai.expect(whitelist.isSafeKey(domain1_hash, key_hash)).to.be.true;
          chai.expect(whitelist.isSafeKey(domain1_hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.true;
          chai.expect(whitelist.isSafeKey(domain2_hash, key_hash)).to.be.true;
          chai.expect(whitelist.isSafeKey(domain2_hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.false;
        });
      });

      context('old local key', function() {
        var domain1_hash = 'f528764d624db129',
          key_hash = '924a8ceeac17f54d3be3f8cdf1c04eb2';

        beforeEach(function() {
          var today = datetime.getTime();
          var safeKeys = whitelist.safeKeys.value;
          safeKeys[domain1_hash] = {};
          safeKeys[domain1_hash][key_hash] = [today.substring(0, 8), 'l'];

          whitelist._loadRemoteSafeKey();
          return waitFor(function() {
            return whitelist.lastUpdate[0] === today
          });
        });

        it('replaces local key with remote if remote is more recent', function() {
          var safeKeys = whitelist.safeKeys.value;
          chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
          chai.expect(safeKeys[domain1_hash]).to.have.property(key_hash);
          chai.expect(safeKeys[domain1_hash][key_hash]).to.eql(['20200101', 'r']);
        });
      });

      context('new local key', function() {
        var domain1_hash = 'f528764d624db129',
          key_hash = '924a8ceeac17f54d3be3f8cdf1c04eb2',
          day = '20200102';

        beforeEach(function() {
          var today = datetime.getTime();
          var safeKeys = whitelist.safeKeys.value;
          safeKeys[domain1_hash] = {};
          safeKeys[domain1_hash][key_hash] = [day, 'l'];

          whitelist._loadRemoteSafeKey();
          return waitFor(function() {
            return whitelist.lastUpdate[0] === today
          });
        });

        it('leaves local key if it is more recent than remote', function() {
          var safeKeys = whitelist.safeKeys.value;
          chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
          chai.expect(safeKeys[domain1_hash]).to.have.property(key_hash);
          chai.expect(safeKeys[domain1_hash][key_hash]).to.eql([day, 'l']);
        });

      });

      context('7 day old key', function() {
        var domain1_hash = 'f528764d624db129',
          key_hash = '4a8a08f09d37b73795649038408b5f33',
          day = new Date(),
          daystr = null,
          d = '',
          m = '';
        day.setDate(day.getDate() - 8);
        d = (day.getDate()  < 10 ? '0' : '' ) + day.getDate();
        m = (day.getMonth() < 9 ? '0' : '' ) + parseInt(day.getMonth() + 1);
        daystr = '' + day.getFullYear() + m + d;

        beforeEach(function() {
          var today = datetime.getTime();
          var safeKeys = whitelist.safeKeys.value;
          safeKeys[domain1_hash] = {};
          safeKeys[domain1_hash][key_hash] = [daystr, 'l'];

          whitelist._loadRemoteSafeKey();
          return waitFor(function() {
            return whitelist.lastUpdate[0] === today
          });
        });

        it('prunes keys more than 7 days old', function() {
          var safeKeys = whitelist.safeKeys.value;
          chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
          chai.expect(safeKeys[domain1_hash]).to.not.have.property(key_hash);
        });
      });

    });

    describe('after init', function() {

      beforeEach(function() {
        return whitelist.init();
      });

      afterEach(function() {
        whitelist.destroy();
      });

      describe('onConfigUpdate', function() {

        var tokenCallCount,
            safekeyCallCount;

        beforeEach(function() {
          tokenCallCount = 0;
          whitelist._loadRemoteTokenWhitelist = function() {
            tokenCallCount++;
          };
          safekeyCallCount = 0;
          whitelist._loadRemoteSafeKey = function() {
            safekeyCallCount++;
          };
        });

        it('triggers _loadRemoteTokenWhitelist if version is different', function() {
          whitelist.onConfigUpdate({ token_whitelist_version: 'new_version' });
          chai.expect(tokenCallCount).to.equal(1);
          chai.expect(safekeyCallCount).to.equal(0);
        });

        it('does not load if token version is same', function() {
          whitelist.onConfigUpdate({ whitelist_token_version: persist.getValue('tokenWhitelistVersion') });
          chai.expect(tokenCallCount).to.equal(0);
          chai.expect(safekeyCallCount).to.equal(0);
        });

        it('triggers _loadRemoteSafeKey if safekey version is different', function() {
          whitelist.onConfigUpdate({ safekey_version: 'new_version' });
          chai.expect(tokenCallCount).to.equal(0);
          chai.expect(safekeyCallCount).to.equal(1);
        });

        it('does not load if safekey version is same', function() {
          whitelist.onConfigUpdate({ safekey_version: persist.getValue('safeKeyExtVersion') });
          chai.expect(safekeyCallCount).to.equal(0);
          chai.expect(tokenCallCount).to.equal(0);
        });

        it('loads both lists if both have new versions', function() {
          whitelist.onConfigUpdate({ token_whitelist_version: 'new_version', safekey_version: 'new_version' });
          chai.expect(tokenCallCount).to.equal(1);
          chai.expect(safekeyCallCount).to.equal(1);
        });
      });
    });

  });
};
