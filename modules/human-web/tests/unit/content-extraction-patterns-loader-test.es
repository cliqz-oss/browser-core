/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const expect = chai.expect;

class FakeResourceLoader {
  onUpdate() {}

  load() {
    return Promise.reject();
  }

  updateFromRemote() {
    return Promise.reject();
  }

  stop() {}
}

export default describeModule('human-web/content-extraction-patterns-loader',
  () => ({
    'platform/globals': {
      chrome: {},
    },
    'core/config': {
      default: {
        settings: {
          ENDPOINT_PATTERNSURL: 'http://patterns.cliqz.test',
          ENDPOINT_ANONPATTERNSURL: 'http://anonpatterns.cliqz.test',
        },
      },
    },
    './logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      }
    },
    'core/resource-loader': {
      default: FakeResourceLoader,
    }
  }),
  () => {
    describe('ContentExtractionPatternsLoader', function () {
      let ContentExtractionPatternsLoader;
      let uut;

      function expectLoaded() {
        expect(uut.isLoaded()).to.be.true;
      }

      function expectUnloaded() {
        expect(uut.isLoaded()).to.be.false;
      }

      beforeEach(function () {
        ContentExtractionPatternsLoader = this.module().default;
        uut = new ContentExtractionPatternsLoader();

        // this.timeout(100000000); // TODO: remove me
      });

      afterEach(function () {
        return uut.unload()
          .then(() => { expectUnloaded(); });
      });

      it('should init and unload successfully', function () {
        return Promise.resolve()
          .then(() => { expectUnloaded(); })
          .then(() => uut.init())
          .then(() => { expectLoaded(); })
          .then(() => uut.unload())
          .then(() => { expectUnloaded(); })
          .then(() => uut.init())
          .then(() => { expectLoaded(); });
      });

      it('init/unload should be safe to call multiple times in a row', function () {
        return Promise.resolve()
          .then(() => uut.unload())
          .then(() => uut.unload())
          .then(() => uut.init())
          .then(() => uut.init())
          .then(() => uut.unload())
          .then(() => uut.unload())
          .then(() => uut.init())
          .then(() => { expectLoaded(); })
          .then(() => uut.unload())
          .then(() => { expectUnloaded(); });
      });

      it('should never end up in an inconsistent state', function () {
        const uncoordinatedStartStopAttempts = [
          uut.init(),
          uut.init(),
          uut.unload(),
          uut.init(),
          uut.unload()];

        // should still be able to recover from the mess above
        return Promise.all(uncoordinatedStartStopAttempts)
          .then(() => uut.init())
          .then(() => { expectLoaded(); })
          .then(() => uut.unload())
          .then(() => { expectUnloaded(); });
      });
    });
  });
