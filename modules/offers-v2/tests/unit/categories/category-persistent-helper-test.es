/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');
const fixture = require('../utils/offers/data');
const persistenceMocks = require('../utils/persistence');

export default describeModule('offers-v2/categories/category-persistent-helper',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('/category-persistence', function () {
      let catPers;
      let Category;
      let buildResources;

      beforeEach(async function () {
        await persistenceMocks.lib.dexieReset(this.system);
        Category = (await this.system.import('offers-v2/categories/category')).default;
        const BuildResources = (await this.system.import('offers-v2/categories/temporary-build-resources')).default;
        buildResources = new BuildResources();
        const Persistence = this.module().default;
        catPers = new Persistence();
        await catPers._init();
      });

      function mkCategory(overrides) {
        const cat = { ...fixture.VALID_CATEGORY, ...overrides };
        return new Category(
          cat.name,
          cat.patterns,
          cat.version,
          cat.timeRangeSecs,
          cat.activationData
        );
      }

      it('/store and restore a category', async () => {
        const cat = mkCategory();
        const expected = cat.serialize();
        buildResources.addCategory(cat, cat.patterns);

        await catPers.commitBuild(buildResources);
        const cats = await catPers.loadCategories();
        chai.expect(cats).to.have.length(1);

        const loaded = cats[0].serialize();
        chai.expect(loaded).to.eql(expected);
      });

      it('/drop orphaned category parts', async () => {
        const cat1 = mkCategory({ name: 'c1' });
        const cat2 = mkCategory({ name: 'c2' });
        const cat3 = mkCategory({ name: 'c3' });
        buildResources.addCategory(cat1, cat1.patterns);
        buildResources.addCategory(cat2, cat2.patterns);
        buildResources.addCategory(cat3, cat3.patterns);
        await catPers.commitBuild(buildResources);
        // remove parts from the database
        await catPers.categoriesDb.delete('c1');
        await catPers.patternsDb.delete('c3');

        const cats = await catPers.loadCategories();

        chai.expect(cats).to.have.length(1);
        chai.expect(cats[0]).to.have.property('name', 'c2');
      });
    });
  });
