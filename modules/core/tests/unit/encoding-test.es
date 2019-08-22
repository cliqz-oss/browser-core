/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;

const encodingData = require('./encoding-data');

const b641 = encodingData.b641;
const b642 = encodingData.b642;
const b643 = encodingData.b643;
const bin1 = encodingData.bin1;
const bin2 = encodingData.bin2;
const bin3 = encodingData.bin3;
const h641 = encodingData.h641;
const h642 = encodingData.h642;
const h643 = encodingData.h643;

function arrayEquals(a, b) {
  if (typeof a.length !== 'number' || typeof b.length !== 'number') {
    return false;
  }
  if (!a.BYTES_PER_ELEMENT || !b.BYTES_PER_ELEMENT) {
    return false;
  }
  if (a.length !== b.length || a.BYTES_PER_ELEMENT !== b.BYTES_PER_ELEMENT) {
    return false;
  }
  const n = a.length;
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

const s = '四川菜好辣啊';
const utf8 = new Uint8Array(
  [229, 155, 155, 229, 183, 157, 232, 143, 156, 229, 165, 189, 232, 190, 163, 229, 149, 138]
);

export default describeModule('core/encoding',
  () => ({}),
  () => {
    describe('Encoding tests', function () {
      it('base64', function () {
        expect(this.module().toBase64(bin1)).to.equal(b641);
        chai.expect(this.module().toBase64(bin2)).to.equal(b642);
        chai.expect(this.module().toBase64(bin3)).to.equal(b643);

        chai.expect(arrayEquals(this.module().fromBase64(b641), bin1)).to.equal(true);
        chai.expect(arrayEquals(this.module().fromBase64(b642), bin2)).to.equal(true);
        chai.expect(arrayEquals(this.module().fromBase64(b643), bin3)).to.equal(true);
      });

      it('hex', function () {
        chai.expect(this.module().toHex(bin1)).to.equal(h641.toLowerCase());
        chai.expect(this.module().toHex(bin2)).to.equal(h642.toLowerCase());
        chai.expect(this.module().toHex(bin3)).to.equal(h643.toLowerCase());

        chai.expect(arrayEquals(this.module().fromHex(h641), bin1)).to.equal(true);
        chai.expect(arrayEquals(this.module().fromHex(h642), bin2)).to.equal(true);
        chai.expect(arrayEquals(this.module().fromHex(h643), bin3)).to.equal(true);
      });

      it('utf8', function () {
        chai.expect(this.module().fromUTF8(utf8)).to.equal(s);
        chai.expect(arrayEquals(this.module().toUTF8(s), utf8)).to.equal(true);
      });
    });
  });
