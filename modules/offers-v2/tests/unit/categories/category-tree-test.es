/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/categories/category-tree',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('#category-tree', function () {
      let CategoryTree;

      beforeEach(function () {
        CategoryTree = this.module().default;
      });

      class CategoryMock {
        constructor(n) {
          this.name = n;
          this.uniqueID = Math.random();
        }

        getName() { return this.name; }

        eql(o) { return this.name === o.name && this.uniqueID === o.uniqueID; }
      }

      function buildCategories(cnameList) {
        const catList = [];
        cnameList.forEach(cn => catList.push(new CategoryMock(cn)));
        return catList;
      }

      function buildTreeFromCatNameList(ct, cnameList) {
        const catList = buildCategories(cnameList);
        catList.forEach(c => ct.addCategory(c));
        return catList;
      }

      // checks = [ {n: name, r: expected result (true / false) }, ...]
      function checkCatNameExistence(ct, checks) {
        checks.forEach((c) => {
          const shouldExists = c.r === undefined ? true : c.r;
          chai.expect(ct.hasCategory(c.n), `checking existence of cat ${c.n}`).eql(shouldExists);
        });
      }

      function checkCatListExistInTree(ct, catList) {
        catList.forEach((c) => {
          chai.expect(ct.hasCategory(c.name), `cat ${c.name} not found in tree`).eql(true);
          const node = ct.getCategoryNode(c.name);
          chai.expect(node).to.exist;
          chai.expect(node.hasCategory()).eql(true);
          chai.expect(c.eql(node.getCategory()), 'comparing categories').eql(true);
        });
      }

      context('basic tests', function () {
        let ct;

        beforeEach(function () {
          ct = new CategoryTree();
        });

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/element exists', function () {
          chai.expect(ct).to.exist;
          const cm = new CategoryMock('');
          chai.expect(cm).to.exist;
        });

        it('/element exists works 1', function () {
          const catSample = [
            'C1',
            'C2',
            'C3',
            'C4',
          ];
          buildTreeFromCatNameList(ct, catSample);
          checkCatNameExistence(ct, catSample);
        });

        it('/element exists works 2', function () {
          const catSample = [
            'C1',
            'C2',
            'C3',
            'C4',
          ];
          buildTreeFromCatNameList(ct, catSample);
          const check = [
            { n: 'C1', r: true },
            { n: 'C2', r: true },
            { n: 'C5', r: false },
            { n: 'C3', r: true },
            { n: 'C4', r: true },
            { n: 'C', r: false },
          ];
          checkCatNameExistence(ct, check);
        });

        it('/adding sub categories build the higher categories', function () {
          const catSample = [
            'C1.c11.c111',
            'C2.c22.c222',
            'C3.c33.c333',
            'C4.c44.c444',
          ];
          buildTreeFromCatNameList(ct, catSample);
          const check = [
            { n: 'C1', r: true },
            { n: 'C1.c11', r: true },
            { n: 'C1.c11.c111', r: true },
            { n: 'C2', r: true },
            { n: 'C2.c22', r: true },
            { n: 'C2.c22.c222', r: true },
            { n: 'C3', r: true },
            { n: 'C3.c33', r: true },
            { n: 'C3.c33.c333', r: true },
            { n: 'C4', r: true },
            { n: 'C4.c44', r: true },
            { n: 'C4.c44.c444', r: true },
            { n: 'C44', r: false },
            { n: 'C44.c4444', r: false },
            { n: 'C44.c4444.c444444', r: false },
            { n: 'C1.c22', r: false },
            { n: 'C1.C2', r: false },
            { n: 'C1.c333', r: false },
            { n: 'C1.c111', r: false },
          ];
          checkCatNameExistence(ct, check);
        });

        it('/element exists works 1', function () {
          const catSample = [
            'C1',
            'C2.c22',
            'C3.c33.c333',
            'C4.c44.c444.c4444',
          ];
          const cats = buildTreeFromCatNameList(ct, catSample);
          checkCatNameExistence(ct, catSample);
          checkCatListExistInTree(ct, cats);
        });

        it('/someSubCategory exists works 1', function () {
          const catSample = [
            'C1',
            'C2.c22',
            'C3.c33.c333',
            'C4.c44.c444.c4444',
            'C4.c44.c444.c4445',
            'C4.c44.c444.c4446',
          ];
          buildTreeFromCatNameList(ct, catSample);

          let result = ct.someSubCategory('C1', c => c.getName() === 'C1.1');
          chai.expect(result).eql(false);
          result = ct.someSubCategory('C1', c => c.getName() === 'C1');
          chai.expect(result).eql(true);

          result = ct.someSubCategory('C2', c => c.getName() === 'C2');
          chai.expect(result).eql(true);
          result = ct.someSubCategory('C2', c => c.getName() === 'C2.2');
          chai.expect(result).eql(false);
          result = ct.someSubCategory('C2', c => c.getName() === 'c22');
          chai.expect(result).eql(true);

          result = ct.someSubCategory('C4', c => c.getName() === 'c444');
          chai.expect(result).eql(true);
          result = ct.someSubCategory('C4', c => c.getName() === 'c4444');
          chai.expect(result).eql(true);
          result = ct.someSubCategory('C4', c => c.getName() === 'c4445');
          chai.expect(result).eql(true);
          result = ct.someSubCategory('C4', c => c.getName() === 'c4446');
          chai.expect(result).eql(true);
          result = ct.someSubCategory('C4', c => c.getName() === 'c4447');
          chai.expect(result).eql(false);
        });
      });
    });
  });
