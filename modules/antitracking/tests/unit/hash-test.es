/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
const nonNumeric = ['', 'ithinkthereis1numberhere', '1240abcd'];
const mostlyNumeric = ['4902', '1024x768'];

const probData = require('../../../antitracking/prob.json');

export default describeModule('antitracking/hash', function () {
  return {
    'core/resource-loader': {
      BundledResource: class BundledResource {
        load() {
          return Promise.resolve(probData);
        }
      },
    },
  };
},
function () {
  describe('#isMostlyNumeric', function () {
    let isMostlyNumeric;

    beforeEach(function () {
      isMostlyNumeric = this.module().isMostlyNumeric;
    });

    nonNumeric.forEach((testInput) => {
      it(`returns false for "${testInput}"`, function () {
        chai.expect(isMostlyNumeric(testInput)).to.eql(false);
      });
    });

    mostlyNumeric.forEach((testInput) => {
      it(`returns true for "${testInput}"`, function () {
        chai.expect(isMostlyNumeric(testInput)).to.eql(true);
      });
    });
  });

  describe('HashProb', function () {
    let hashProb;

    beforeEach(function () {
      const HashProb = this.module().HashProb;
      hashProb = new HashProb();
      hashProb._update(probData);
    });

    const notHash = [
      '', 'Firefox', 'cliqz.com', // a url
      'anti-tracking',
      'front/ng',
      'javascript',
      'callback',
      'compress-format-enhance',
      'compress%2Cformat%2Cenhance',
    ];

    const hashes = [
      '04C2EAD03B',
      '54f5095c96e',
      'B62a15974a93',
      '22163a4ff903',
      '468x742',
      '1021x952',
      '1024x768',
      '1440x900'
    ];

    notHash.forEach(function (str) {
      it(`'${str}' is not a hash`, function () {
        chai.expect(hashProb.isHash(str)).to.be.false;
      });
    });

    hashes.forEach(function (str) {
      it(`'${str}' is a hash`, function () {
        chai.expect(hashProb.isHash(str)).to.be.true;
      });
    });

    describe('shouldCheckToken', function () {
      let shouldCheckToken;
      beforeEach(function () {
        shouldCheckToken = this.module().shouldCheckToken;
      });

      it('returns false for short tokens', () => {
        chai.expect(shouldCheckToken(hashProb, 6, '1234')).to.be.false;
      });

      it('returns false for timestamps', () => {
        chai.expect(shouldCheckToken(hashProb, 6, `${Date.now()}`)).to.be.false;
      });

      it('returns false for IP addresses', () => {
        chai.expect(shouldCheckToken(hashProb, 6, '192.168.3.4')).to.be.false;
      });

      notHash.forEach(function (str) {
        it(`should not check '${str}'`, function () {
          chai.expect(shouldCheckToken(hashProb, 6, str)).to.be.false;
        });
      });

      hashes.forEach(function (str) {
        it(`should check '${str}'`, function () {
          chai.expect(shouldCheckToken(hashProb, 6, str)).to.be.true;
        });
      });
    });
  });
});
