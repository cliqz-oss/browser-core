/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;

export default describeModule('human-web-lite/human-web-lite',
  () => ({
    'platform/fetch': {},
    'core/zlib': {},
    'webextension-polyfill': {},
    'core/crypto/random': {},
  }),
  () => {
    describe('#HumanWebLite', function () {
      let HumanWeb;
      let uut;

      beforeEach(async function () {
        HumanWeb = this.module().default;
        const config = {
          HUMAN_WEB_LITE_COLLECTOR: 'https://example.test/',
          ALLOWED_COUNTRY_CODES: ['us', 'de'],
          HW_CHANNEL: 'test',
        };
        const storage = {
          get: () => undefined, // assume nothing was stored yet
          flush: () => {},
        };
        uut = new HumanWeb({ config, storage });
      });

      afterEach(function () {
        uut.unload();
        uut = null;
      });

      describe('should load and unload correctly', function () {
        it('happy path', async () => {
          expect(uut.isActive).to.be.false;
          await uut.init();
          expect(uut.isActive).to.be.true;
          uut.unload();
          expect(uut.isActive).to.be.false;
        });

        it('multiple inits should be OK', async () => {
          await Promise.all([uut.init(), uut.init(), uut.init()]);
          expect(uut.isActive).to.be.true;
        });

        it('multiple unloads should be OK', async () => {
          uut.unload();
          uut.unload();
          uut.unload();
        });

        it('multiple mixed init/unloads should be OK', async () => {
          const pending = [];
          pending.push(uut.init());
          pending.push(uut.init());
          pending.push(uut.init());

          uut.unload();
          expect(uut.isActive).to.be.false;

          pending.push(uut.init());
          uut.unload();
          expect(uut.isActive).to.be.false;

          uut.unload();
          expect(uut.isActive).to.be.false;

          await Promise.all(pending);
          uut.unload();
          expect(uut.isActive).to.be.false;

          await uut.init();
          expect(uut.isActive).to.be.true;

          uut.unload();
          expect(uut.isActive).to.be.false;
        });
      });
    });
  });
