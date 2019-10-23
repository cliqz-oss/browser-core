/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */
/* eslint no-bitwise: 'off' */

const { deflate } = require('pako');
const { inflateSync: inflate } = require('zlib');

// Generate "random" seeded Uint8Array
function _(length, _seed) {
  let seed = _seed;
  const x = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 16807) % 2147483647;
    x[i] = seed;
  }
  return x;
}

const testCases = [
  { msg: _(0, 1), length: 1024 },
  { msg: _(1, 1), length: 1024 },
  { msg: _(100, 1), length: 1024 },
  { msg: _(100, 2), length: 1024 },
  { msg: _(100, 3), length: 1024 },
  { msg: _(1000, 1), length: 1024 },
  { msg: _(1000, 2), length: 1024 },
  { msg: _(1000, 3), length: 1024 },

  { msg: _(1012, 1), length: 2048 },
  { msg: _(1012, 2), length: 2048 },
  { msg: _(1012, 3), length: 2048 },
  { msg: _(2030, 1), length: 2048 },
  { msg: _(2030, 2), length: 2048 },
  { msg: _(2030, 3), length: 2048 },

  { msg: _(2040, 1), length: 4096 },
  { msg: _(2040, 2), length: 4096 },
  { msg: _(2040, 3), length: 4096 },
  { msg: _(4080, 1), length: 4096 },
  { msg: _(4080, 2), length: 4096 },
  { msg: _(4080, 3), length: 4096 },

  { msg: _(4090, 1), length: 8192 },
  { msg: _(4090, 2), length: 8192 },
  { msg: _(4090, 3), length: 8192 },
  { msg: _(8170, 1), length: 8192 },
  { msg: _(8170, 2), length: 8192 },
  { msg: _(8170, 3), length: 8192 },

  { msg: _(8180, 1), length: 16384 },
  { msg: _(8180, 2), length: 16384 },
  { msg: _(8180, 3), length: 16384 },
  { msg: _(16364, 1), length: 16384 },
  { msg: _(16364, 2), length: 16384 },
  { msg: _(16364, 3), length: 16384 },

  { msg: _(16374, 1), length: 32768 },
  { msg: _(16374, 2), length: 32768 },
  { msg: _(16374, 3), length: 32768 },
  { msg: _(32748, 1), length: 32768 },
  { msg: _(32748, 2), length: 32768 },
  { msg: _(32748, 3), length: 32768 },

  { msg: _(32758, 1), throws: true },
  { msg: _(32758, 2), throws: true },
  { msg: _(32758, 3), throws: true },

  // all zeros, highly compressible
  { msg: _(1000000, 0), length: 1024 },
  { msg: _(2000000, 0), length: 2048 },
  { msg: _(3000000, 0), length: 4096 },
  { msg: _(5000000, 0), length: 8192 },
  { msg: _(10000000, 0), length: 16384 },
  { msg: _(20000000, 0), length: 32768 },
  { msg: _(40000000, 0), throws: true },
];

export default describeModule('hpnv2/utils',
  function () {
    return {
      'core/zlib': {
        inflate,
        deflate,
      },
    };
  },

  () => {
    const expect = chai.expect;
    let encodeWithPadding;
    let decodeWithPadding;

    describe('encodeMessage', () => {
      beforeEach(function () {
        encodeWithPadding = this.module().encodeWithPadding;
        decodeWithPadding = this.module().decodeWithPadding;
      });

      it('simple encodeWithPadding', function () {
        this.timeout(20000);
        testCases.forEach(({ msg, throws, length }) => {
          if (throws) {
            expect(() => encodeWithPadding(msg)).to.throw('Message is too big');
          } else {
            const encoded = encodeWithPadding(msg);
            expect(encoded.length).to.equal(length);
            expect(decodeWithPadding(encoded)).to.deep.equal(msg);
          }
        });
      });
    });
  });
