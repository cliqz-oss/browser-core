/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule, chai */

export default describeModule('core/helpers/wait',
  () => ({
    'core/console': {
      default: {
        error() {},
      },
    },
  }),
  () => {
    describe('#waitFor', () => {
      let waitFor;
      beforeEach(function () {
        waitFor = this.module().waitFor;
      });

      it('resolves immediatly', async () =>
        chai.expect(await waitFor(() => true)).to.be.true);

      it('resolves with result of function (sync)', async () =>
        chai.expect(await waitFor(() => 'foo')).to.be.eql('foo'));

      it('resolves with result of function (async)', async () =>
        chai.expect(await waitFor(() => Promise.resolve('foo'))).to.be.eql('foo'));

      it('times out', () =>
        chai.expect(waitFor(() => false, 100)).to.eventually.be.rejectedWith('waitFor timeout'));

      it('succeeds after a few tries (sync)', () => {
        let i = 0;
        const fn = () => {
          i += 1;
          return i === 10;
        };

        return waitFor(fn);
      });

      it('succeeds after a few tries (async)', () => {
        let i = 0;
        const fn = async () => {
          i += 1;
          await new Promise(resolve => setTimeout(resolve, 60));
          return i === 10;
        };

        return waitFor(fn);
      });
    });
  });
