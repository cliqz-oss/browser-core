/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style, no-param-reassign */

const commonMocks = require('../utils/common');

export default describeModule('offers-v2/trigger_machine/ops/category_expr',
  () => ({
    ...commonMocks,
    'core/http': {
      default: {}
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'offers-v2/categories/category-handler': {
      default: class {
        constructor() {
          this.clear();
        }

        clear() {
          this.categories = {};
          this.buildCalled = false;
          this.categoriesAdded = [];
        }

        hasCategory(catName) { return !!(this.categories[catName]); }

        addCategory(category) { this.categoriesAdded.push(category); }

        removeCategory() { }

        build() { this.buildCalled = true; }

        cleanUp() { }

        newUrlEvent() {}

        loadPersistentData() {}

        savePersistentData() { }

        getMatchesForCategory() {
          // TODO
        }

        getMaxCountDaysForCategory() {
          // TODO
        }

        getLastMatchTsForCategory() {
          // TODO
        }

        isCategoryActive(catName) { return !!this.categories[catName]; }
      }
    }

  }),
  () => {
    describe('/category-expr operations', () => {
      let buildDataGen;
      let ExpressionBuilder;
      let exprBuilder;
      let CategoryHandler;
      let catHandlerMock;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function checkCategories(toUpdate, toCheck) {
        toUpdate.forEach((c) => {
          const catName = c.name;
          const hasCat = toCheck.some(cat => cat.getName() === catName);
          chai.expect(hasCat, `${catName} not found`).eql(true);
        });
      }

      beforeEach(function () {
        CategoryHandler = this.deps('offers-v2/categories/category-handler').default;
        catHandlerMock = new CategoryHandler();
        buildDataGen = {
          category_handler: catHandlerMock,
        };
        return this.system.import('offers-v2/trigger_machine/exp_builder').then((mod) => {
          ExpressionBuilder = mod.default;
          exprBuilder = new ExpressionBuilder(buildDataGen);
        });
      });

      /**
       * ==================================================
       * $is_category_active operation tests
       * ==================================================
       */
      describe('/is_category_active', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          catHandlerMock.clear();
        });

        it('/invalid args call', () => {
          const o = [
            '$is_category_active', []
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/valid args but not active cat', () => {
          const o = [
            '$is_category_active', [{ catName: 'cat-x' }]
          ];
          op = buildOp(o);
          catHandlerMock.categories = { 'cat-x2': true };
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(false);
          });
        });

        it('/valid args and active cat', () => {
          const o = [
            '$is_category_active', [{ catName: 'cat-x2' }]
          ];
          op = buildOp(o);
          catHandlerMock.categories = { 'cat-x2': true };
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(true);
          });
        });
      });

      /**
       * ==================================================
       * $if_pref add_categories tests
       * ==================================================
       */
      describe('/add_categories', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          catHandlerMock.clear();
        });

        it('/invalid args call', () => {
          const o = [
            '$add_categories', []
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = [
            '$add_categories', [{}]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 3', () => {
          const o = [
            '$add_categories', [{ xyz: {} }]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/update categories properly', () => {
          const toUpdate = [
            { name: 'c1', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
            { name: 'c2', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
            { name: 'c3', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
          ];
          const o = [
            '$add_categories', [{ toUpdate }]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(true);
            chai.expect(catHandlerMock.buildCalled).eql(true);
            checkCategories(toUpdate, catHandlerMock.categoriesAdded);
          });
        });
      });
    });
  });
