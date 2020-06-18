/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  expect,
  prefs,
  testServer,
  waitForPrefChange,
} from '../test-helpers';

const expectedConfigs = [
  'backends',
  'language_whitelist',
  'locale_whitelist',
  'location',
  'location.city',
  'logoVersion',
  'png_logoVersion',
  'ts',
];

function mockConfigReponse(response) {
  return testServer.registerPathHandler('/api/v1/config', {
    result: JSON.stringify(response),
  }).then(function () {
    app.config.settings.CONFIG_PROVIDER = testServer.getBaseUrl('/api/v1/config');
    app.settings.CONFIG_PROVIDER = app.config.settings.CONFIG_PROVIDER;
  });
}

export default function () {
  describe('config tests', function () {
    context('whitelist configs', function () {
      const response = {
        backends: ['test1', 'test2'],
        language_whitelist: ['test_de', 'test_en'],
        locale_whitelist: ['test_de-DE', 'test_en-US'],
        location: 'test_location',
        'location.city': 'test_location_city',
        logoVersion: 'test_logoVersion',
        png_logoVersion: 'test_png_logoVersion',
        ts: 'test_ts'
      };

      let expectedConfigsWithValues;

      beforeEach(async function () {
        // save the prefs which will be changed
        expectedConfigsWithValues = expectedConfigs.map(config =>
          ({
            config,
            value: prefs.get(`config_${config}`)
          }));

        // clean these prefs
        expectedConfigs.forEach(function (config) {
          prefs.clear(`config_${config}`);
        });

        const p = waitForPrefChange('config_backends');
        await mockConfigReponse(response);
        await app.services['cliqz-config']._initializer(app);
        await p;
      });

      afterEach(function () {
        // restore all the changed prefs
        expectedConfigsWithValues.forEach(function (el) {
          prefs.set(`config_${el.config}`, el.value);
        });
      });

      it('all the prefs were added', function () {
        Object.keys(response).forEach(function (key) {
          if (typeof response[key] === 'string') {
            expect(prefs.get(`config_${key}`)).to.equal(response[key]);
          } else {
            expect(prefs.get(`config_${key}`)).to.equal(JSON.stringify(response[key]));
          }
        });
      });
    });

    context('unexpected configs', function () {
      beforeEach(async function () {
        await mockConfigReponse({ test_configs: 'test' });
        await app.services['cliqz-config']._initializer(app);
      });

      it('the prefs were not added', function () {
        expect(prefs.get('config_test_configs')).to.not.exist;
      });
    });
  });
}
