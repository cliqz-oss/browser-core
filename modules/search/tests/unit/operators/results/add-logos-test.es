/* global chai, describeModule */

const mock = {
  'core/services/logos': { default: { getLogoDetails: url => url } },
  'core/url': { getDetailsFromUrl: url => url },
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
