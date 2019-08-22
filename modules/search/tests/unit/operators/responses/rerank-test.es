/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const { resultsBeforeRerank, resultsAfterRerank } = require('./rerank-fixture');

const mock = {
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0],
  },
};

export default describeModule('search/operators/responses/rerank',
  () => mock,
  () => {
    describe('#rerank', function () {
      let rerank;

      beforeEach(function () {
        rerank = this.module().default;
      });

      it('rerank results should remove news story results if any', function () {
        chai.expect(rerank({ results: resultsBeforeRerank }))
          .to.deep.equal({ results: resultsAfterRerank });
      });
    });
  });
