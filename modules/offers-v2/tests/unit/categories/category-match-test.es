/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');

function p(rawPattern) {
  return { rawPattern, tokenCount: 1 };
}

export default describeModule('offers-v2/categories/category-match',
  () => ({
    ...commonMocks
  }),
  () => {
    describe('Match offer against active categories', () => {
      let CategoryMatch;
      let CategoriesMatchTraits;
      let UrlData;
      const offerCategories = ['software.development.cpp', 'games.tetris', 'xxx'];

      beforeEach(async function () {
        CategoriesMatchTraits = this.module().CategoriesMatchTraits;
        CategoryMatch = this.module().CategoryMatch;
        UrlData = (await this.system.import('offers-v2/common/url_data')).default;
      });

      // ==================================================

      function getUserCatsForNoMatches() {
        return new CategoriesMatchTraits(new Map([
          ['hobby', [p('pattern')]],
          ['foo', [p('bar')]],
        ]));
      }

      function getUserCatsForExactMatches() {
        return new CategoriesMatchTraits(new Map([
          ['software.development.cpp', [p('pattern')]],
          ['xxx', [p('bar')]],
          ['extra', [p('buz')]],
        ]));
      }

      function getUserCatsForGenericMatches() {
        return new CategoriesMatchTraits(new Map([
          ['software', [p('pattern')]],
        ]));
      }

      // --

      describe('/score', () => {
        it('table tests', () => {
          const fixture = [
            [{}, 1],
            [{ tokenCount: 1 }, Math.E],
            [{ tokenCount: 4 }, Math.E ** 4],
            [{ tokenCount: 100 }, Math.E ** 10],
          ];
          fixture.forEach(([pattern, expectedScore]) => {
            const score = CategoriesMatchTraits._scoreCatMatch('', pattern, '');

            chai.expect(score).to.eq(expectedScore, `Score for ${pattern.tokenCount} tokens`);
          });
        });

        it('inexact match', () => {
          const calcScore = CategoriesMatchTraits._scoreCatMatch;
          const exactScore = calcScore('aa', 'pattern', 'aa');
          const inexactScore = calcScore('aa', 'pattern', 'aa.bb');

          chai.expect(exactScore).to.be.above(inexactScore);
        });

        it('with URL pattern', () => {
          const cm = new CategoryMatch();
          // Three tokens, we want that '.de' is ignored
          cm.addCategoryPatterns('c1', ['||amazon.de/dp/12345^$script']);
          cm.build();
          const urlData = new UrlData('https://www.amazon.de/dp/12345/extra/path');

          const cmt = cm.checkMatches(urlData.getPatternRequest());
          const weights = cmt.weights(['c1']);

          chai.expect([...weights]).to.eql([['c1', Math.E ** 3]]);
        });

        it('with search pattern', () => {
          const cm = new CategoryMatch();
          cm.addCategoryPatterns('c1', ['buy elephant$fuzzy']);
          cm.build();
          const urlData = new UrlData('http://google.com/search?q=let us buy an elephant');

          const cmt = cm.checkMatches(urlData.getPatternRequest());
          const weights = cmt.weights(['c1']);

          chai.expect([...weights]).to.eql([['c1', Math.E ** 2]]);
        });
      });

      // --

      describe('/ weights', () => {
        it('/ no matches no weights', () => {
          const userCats = getUserCatsForNoMatches();

          const weights = userCats.weights(offerCategories);

          const weightedCats = [...weights.keys()];
          chai.expect(weightedCats).to.be.empty;
        });

        it('/ several exact matches', () => {
          const userCats = getUserCatsForExactMatches();

          const weights = userCats.weights(offerCategories);

          const weightedCats = [...weights.keys()];
          chai.expect(weightedCats).to.eql(['software.development.cpp', 'xxx']);
        });

        it('/ specialized category fits to more generic', () => {
          const userCats = getUserCatsForGenericMatches();

          const weights = userCats.weights(offerCategories);

          const weightedCats = [...weights.keys()];
          chai.expect(weightedCats).to.eql(['software.development.cpp']);
        });

        it('/ specialized category scores more than generic', () => {
          const userCats = new CategoriesMatchTraits(new Map([
            ['software', [p('pattern')]]]));
          const offerCats = ['software', 'software.development.cpp'];

          const weights = userCats.weights(offerCats);

          const exactScore = weights.get('software');
          const ancestorScore = weights.get('software.development.cpp');
          chai.expect(exactScore).to.be.above(ancestorScore);
        });

        it('/sum weights of several matched patterns', () => {
          const userCats1 = getUserCatsForGenericMatches();
          const userCats3 = getUserCatsForGenericMatches();
          const patterns3 = userCats3.matches.get('software');
          patterns3.push(patterns3[0]);
          patterns3.push(patterns3[0]);

          const weights1 = userCats1.weights(['software']);
          const weights3 = userCats3.weights(['software']);

          const score1 = weights1.get('software');
          const score3 = weights3.get('software');
          chai.expect(score1 * 3).to.eq(score3);
        });
      });

      describe('/ have common', () => {
        it('/ no matches nothing common', () => {
          const userCats = getUserCatsForNoMatches();

          const haveCommon = userCats.haveCommonWith(offerCategories);

          chai.expect(haveCommon).to.be.false;
        });

        it('/ exact matches', () => {
          const userCats = getUserCatsForExactMatches();

          const haveCommon = userCats.haveCommonWith(offerCategories);

          chai.expect(haveCommon).to.be.true;
        });

        it('/ inexact matches', () => {
          const userCats = getUserCatsForGenericMatches();

          const haveCommon = userCats.haveCommonWith(offerCategories);

          chai.expect(haveCommon).to.be.true;
        });
      });

      describe('/ get patterns', () => {
        it('/exact', () => {
          const userCats = getUserCatsForExactMatches();

          const patterns = userCats.getMatchPatterns(offerCategories);

          chai.expect([...patterns]).to.eql(['pattern', 'bar']);
        });

        it('/inexact', () => {
          const userCats = getUserCatsForGenericMatches();

          const patterns = userCats.getMatchPatterns(offerCategories);

          chai.expect([...patterns]).to.eql(['pattern']);
        });
      });
    });

    describe('Remember why an offer was matched', () => {
      let CategoriesMatchTraits;
      let OfferMatchTraits;

      beforeEach(function () {
        CategoriesMatchTraits = this.module().CategoriesMatchTraits;
        OfferMatchTraits = this.module().OfferMatchTraits;
      });

      it('/Patterns are stored', () => {
        const catMatches = new CategoriesMatchTraits(new Map([
          ['cat1', [p('p1')]],
          ['cat2', [p('pat2')]],
          ['cat3', [p('pattern3')]]
        ]));
        const offerCategories = ['cat1', 'cat2'];

        const reason = new OfferMatchTraits(catMatches, offerCategories);

        const expected = [{ pattern: 'p1', domainHash: undefined },
          { pattern: 'pat2', domainHash: undefined }];
        chai.expect(reason.getReason()).to.eql(expected);
      });

      it('/missed categories matches is not an error', () => {
        this._ = new OfferMatchTraits(null, ['cat1']);

        chai.expect(true).to.be.true;
      });

      it('/missed offer categories is not an error', () => {
        const catMatches = new CategoriesMatchTraits(new Map());

        this._ = new OfferMatchTraits(catMatches, null);

        chai.expect(true).to.be.true;
      });

      it('/take all patterns from a category that matched several times', () => {
        const catMatches = new CategoriesMatchTraits(new Map([
          ['cat1', [p('p1'), p('p2')]],
          ['cat2', [p('p3')]]
        ]));
        const offerCategories = ['cat1', 'cat2'];

        const reason = new OfferMatchTraits(catMatches, offerCategories);
        const expected = [{ pattern: 'p1', domainHash: undefined },
          { pattern: 'p2', domainHash: undefined },
          { pattern: 'p3', domainHash: undefined }];

        chai.expect(reason.getReason()).to.eql(expected);
      });

      it('/Store only unique patterns', () => {
        const catMatches = new CategoriesMatchTraits(new Map(
          [['cat1', [p('spam'), p('spam'), p('more spam'), p('spam')]]]
        ));
        const offerCategories = ['cat1'];

        const reason = new OfferMatchTraits(catMatches, offerCategories);
        const expected = [{ pattern: 'spam', domainHash: undefined },
          { pattern: 'more spam', domainHash: undefined }];

        chai.expect(reason.getReason()).to.eql(expected);
      });
    });
  });
