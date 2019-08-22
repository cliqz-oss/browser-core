/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;

export default describeModule('core/helpers/md5',
  function () {
    return {
      './console': {
        default: {}
      },
    };
  },
  function () {
    context('MD5 Hex-encoding tests', function () {
      let md5;

      beforeEach(function () {
        md5 = this.module().default;
      });

      it('should create a hex-encoded MD5 hash of an ASCII value', function () {
        expect(md5('cliqz')).to.equal('b0142f2841340cb81463761e4c1af118');
      });

      it('should create a hex-encoded MD5 hash of an ASCII value', function () {
        expect(md5('value')).to.equal('2063c1608d6e0baf80249c42e2be5804');
      });

      it('should create a hex-encoded MD5 hash of an UTF-8 value', function () {
        expect(md5('日本')).to.equal('4dbed2e657457884e67137d3514119b3');
      });
    });
  });
