/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule, sinon  */

let getMessage;

export default describeModule('core/content/i18n',
  () => ({
    'platform/content/globals': {
      chrome: {
        i18n: {
          getMessage: (...args) => getMessage(...args),
        },
      },
    },
  }),
  () => {
    describe('#getMessage', function () {
      let i18n;

      beforeEach(function () {
        i18n = this.module().default;
      });

      it('getMessage without substitutions correctly', function () {
        getMessage = () => 'en';
        chai.expect(i18n.getMessage('lang_code')).to.equal('en');
      });

      it('getMessage with number as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', 1);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with string as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', '1');
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with 1-element array as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', [1]);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with multi-elements array as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', [1, 2]);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1', '2']);
      });
    });
  });
