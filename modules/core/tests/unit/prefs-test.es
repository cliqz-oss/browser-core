/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

export default describeModule('core/prefs',
  function () {
    return {
      '../platform/prefs': {
        getAllCliqzPrefs: '[dynamic]',
        getPref: '[dynamic]',
      },
      './config': {
        default: {
          default_prefs: {},
        },
      },
    };
  },
  function () {
    let subject;

    describe('#get', function () {
      const key = 'test';

      beforeEach(function () {
        subject = this.module().default.get;
        this.deps('../platform/prefs').getPref = (_, defaultValue) => defaultValue;
      });

      context('with not value stored', function () {
        const defaultValue = 'defaultValue';

        it('returns undefined', function () {
          chai.expect(subject(key)).to.equal(undefined);
        });

        it('returns defaultValue if provided', function () {
          chai.expect(subject(key, defaultValue)).to.equal(defaultValue);
        });

        context('with config default prefs', function () {
          it('return default prefs from config', function () {
            const defaultPrefValue = 'defaultPrefValue';
            this.deps('./config').default.default_prefs[key] = defaultPrefValue;
            chai.expect(subject(key)).to.equal(defaultPrefValue);
            chai.expect(subject(key, defaultValue)).to.equal(defaultPrefValue);
          });
        });
      });
    });

    context('core/prefs tests', function () {
      describe('#getCliqzPrefs', function () {
        beforeEach(function () {
          subject = this.module().getCliqzPrefs;
          this.deps('../platform/prefs').getPref = function () {};
        });

        it('includes whitelist keys', function () {
          this.deps('../platform/prefs').getAllCliqzPrefs = function () {
            return ['session'];
          };
          chai.expect(subject()).to.have.property('session');
        });

        it('does not include unexpected keys', function () {
          this.deps('../platform/prefs').getAllCliqzPrefs = function () {
            return ['test'];
          };
          chai.expect(subject()).to.not.have.property('test');
        });
      });
    });
  });
