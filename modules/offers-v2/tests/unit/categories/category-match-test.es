/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/categories/category-match',
  () => ({
    ...commonMocks
  }),
  () => {
    describe('Match offer against active categories', () => {
      let CategoriesMatchTraits;
      const offerCategories = ['software.development.cpp', 'games.tetris', 'xxx'];

      beforeEach(function () {
        CategoriesMatchTraits = this.module().CategoriesMatchTraits;
      });

      // ==================================================

      function getUserCatsForNoMatches() {
        return new CategoriesMatchTraits(new Map([
          ['hobby', 'pattern'],
          ['foo', 'bar'],
        ]));
      }

      function getUserCatsForExactMatches() {
        return new CategoriesMatchTraits(new Map([
          ['software.development.cpp', 'pattern'],
          ['xxx', 'bar'],
          ['extra', 'buz'],
        ]));
      }

      function getUserCatsForGenericMatches() {
        return new CategoriesMatchTraits(new Map([
          ['software', 'pattern'],
        ]));
      }

      // --

      describe('/score', () => {
        it('table tests', () => {
          const fixture = [
            ['', 0],
            ['1', 1],
            ['1234567890', 10],
            ['$', 0],
            ['1$', 1],
            ['12345$67890', 5],
          ];
          fixture.forEach(([pattern, expectedScore]) => {
            const score = CategoriesMatchTraits._scoreCatMatch('', pattern, '');

            chai.expect(score).to.eq(expectedScore, `Score for '${pattern}'`);
          });
        });

        it('inexact match', () => {
          const calcScore = CategoriesMatchTraits._scoreCatMatch;
          const exactScore = calcScore('aa', 'pattern', 'aa');
          const inexactScore = calcScore('aa', 'pattern', 'aa.bb');

          chai.expect(exactScore).to.be.above(inexactScore);
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
            ['software', 'pattern']]));
          const offerCats = ['software', 'software.development.cpp'];

          const weights = userCats.weights(offerCats);

          const exactScore = weights.get('software');
          const ancestorScore = weights.get('software.development.cpp');
          chai.expect(exactScore).to.be.above(ancestorScore);
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
        const catMatches = new CategoriesMatchTraits(new Map(
          [['cat1', 'p1'], ['cat2', 'pat2'], ['cat3', 'pattern3']]
        ));
        const offerCategories = ['cat1', 'cat2'];

        const reason = new OfferMatchTraits(catMatches, offerCategories);

        chai.expect(reason.getReason()).to.eql(['p1', 'pat2']);
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
    });
  });
