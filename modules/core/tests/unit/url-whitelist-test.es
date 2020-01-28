/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
/* eslint no-param-reassign: off */

class MockPersistantObject {
  load() {
    return Promise.resolve({});
  }

  setValue() {}
}

export default describeModule('core/url-whitelist',
  () => ({
    'core/prefs': {
      default: {
        get() {},
      },
    },
    'core/persistent-state': {
      LazyPersistentObject: MockPersistantObject,
    },
    'platform/environment': {},
    'platform/globals': {
      chrome: {},
    },
    'platform/platform': {
      default: {},
      isBetaVersion: () => false,
    },
  }), function () {
    let urlWhitelist;

    beforeEach(function () {
      const UrlWhitelist = this.module().default;
      urlWhitelist = new UrlWhitelist('test');
      return urlWhitelist.init();
    });

    it('returns false for non whitelisted domain', function () {
      chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
    });

    describe('add domain to url whitelist', function () {
      afterEach(function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
      });

      it('adds a source domain to the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.true;
      });

      it('does not add any other domains to the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        chai.expect(urlWhitelist.isWhitelisted('https://another.example.com')).to.be.false;
      });
    });

    describe('remove domain from url whitelist', function () {
      afterEach(function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
        urlWhitelist.changeState('https://another.example.com', 'hostname', 'remove');
      });

      it('removes a domain from the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
      });

      it('does not remove other domains', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://another.example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');

        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
        chai.expect(urlWhitelist.isWhitelisted('https://another.example.com')).to.be.true;
      });
    });
  });
