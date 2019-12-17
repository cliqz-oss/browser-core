/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
  'core/services/logos': { default: { getLogoDetails: url => url } },
};

export default describeModule('search/operators/results/add-logos',
  () => mock,
  () => {
    describe('#addLogos', function () {
      let addLogos;
      const fakeUrl = 'https://fakeUrl.com/';
      const fakeExtraUrl = 'https://fakeExtraUrl.com/';
      const fakeExtraWebsite = 'https://fakeExtraWebsite.com/';
      const results = [
        {
          links: [
            {
              url: fakeUrl,
              extra: {
                list: [
                  {
                    address: '',
                    undefined: undefined,
                    null: null,
                    website: fakeExtraWebsite
                  },
                ],
                url: fakeExtraUrl,
              }
            }
          ]
        }
      ];

      beforeEach(function () {
        addLogos = this.module().default;
      });

      it('adds main logo', function () {
        const firstLink = addLogos(results)[0].links[0];
        chai.expect(firstLink.meta.logo).to.equal(fakeUrl);
      });

      // TODO: @khaled
      // it('adds extra urls', function () {
      //   const firstLink = addLogos(results)[0].links[0];
      //   chai.expect(firstLink.meta.extraLogos).to.haveOwnProperty(fakeExtraUrl);
      //   chai.expect(firstLink.meta.extraLogos).to.haveOwnProperty(fakeExtraWebsite);
      // });
    });
  });
