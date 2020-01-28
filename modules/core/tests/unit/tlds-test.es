/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

export default describeModule('core/tlds',
  () => ({}),
  () => {
    let sameGeneralDomain;
    let getGeneralDomain;

    beforeEach(function () {
      sameGeneralDomain = this.module().sameGeneralDomain;
      getGeneralDomain = this.module().getGeneralDomain;
    });

    describe('#sameGeneralDomain', () => {
      [
        ['a.cliqz.com', 'b.cliqz.com'],
        ['x.y.cliqz.com', 'cliqz.com'],
        ['domain.with.co.uk', 'other.subdomain.with.co.uk'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`'${a}' is same general domain as '${b}'`, () => {
          chai.expect(sameGeneralDomain(a, b)).to.be.true;
        });
      });

      [
        ['', 'example.com'],
        [undefined, 'example.com'],
        ['localhost', '127.0.0.1'],
        ['a.cliqz.com', 'b.kliqz.com'],
        ['same.registered.co.uk', 'other.registered.com'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`'${a}' is not same general domain as '${b}'`, () => {
          chai.expect(sameGeneralDomain(a, b)).to.be.false;
        });
      });
    });

    describe('#getGeneralDomain', () => {
      const spec = {
        'cliqz.com': ['cliqz.com', 'www.cliqz.com', 'a.b.cliqz.com'],
        'example.co.uk': ['example.co.uk', 'test.example.co.uk'],
        '127.0.0.1': ['127.0.0.1'],
        '1.2.3.4': ['1.2.3.4']
      };

      Object.keys(spec).forEach((generalDomain) => {
        spec[generalDomain].forEach((subDomain) => {
          it(`${subDomain} has general domain ${generalDomain}`, () => {
            chai.expect(getGeneralDomain(subDomain)).to.equal(generalDomain);
          });
        });
      });
    });
  });
