import Category from './category';
import logger from '../common/offers_v2_logger';
import persistentMapFactory from '../../core/persistence/map';

function extractCategoryData(category) {
  return category.serialize();
}

function buildCategoryFromDataAndPatterns(catData, catPatterns) {
  const category = new Category();
  category.deserialize(catData);
  category.patterns = catPatterns;
  return category;
}

/**
 * The categories storage is split on two parts:
 *
 * - categories itself without patterns (used for accounting), and
 * - patterns.
 *
 * The first one is used for accounting, so the database should be alive
 * all the times. The table with patterns is needed only during
 * synchronization between memory and persistence. In some refactoring,
 * it should be possible to open this database only on demand.
 *
 * *Important*. An object of this class must be a singleton.
 * At least in unit tests, it was a problem to read data from a second
 * instance of `categoreisDb` or `patternsDb` even if the first
 * instance was closed: the data were never read until test finished.
 */
export default class CategoryPersistentDataHelper {
  constructor() {
    this.categoriesDb = null;
    this.patternsDb = null;
  }

  /**
   * Called from `loadCategories`, no need to call directly.
   * And application logic is to call `loadCategories` as soon as possible.
   */
  async _init() {
    if (!this.categoriesDb) {
      const PersistentMap = await persistentMapFactory();
      this.categoriesDb = new PersistentMap('cliqz-categories-data');
      this.patternsDb = new PersistentMap('cliqz-categories-patterns');
      await Promise.all([
        this.categoriesDb.init(),
        this.patternsDb.init()
      ]);
    }
  }

  destroy() {
    if (this.categoriesDb) {
      this.categoriesDb.unload();
      this.categoriesDb = null;
      this.patternsDb.unload();
      this.patternsDb = null;
    }
  }

  _isInitialized(where) {
    if (!this.categoriesDb || !this.patternsDb) {
      logger.error(`Categories storage is not initialized (${where})`);
      return false;
    }
    return true;
  }

  /**
   * will return a promise with a list of all the categories already built
   */
  async loadCategories() {
    await this._init();
    //
    // Reconstruct categories
    // Track orphaned IDs on the fly
    //
    const allCategories = await this.categoriesDb.entries();
    const allPatterns = new Map(await this.patternsDb.entries());
    const orphanCatIDs = [];

    const result = [];
    for (const [cname, cat] of allCategories) {
      const patterns = allPatterns.get(cname);
      if (patterns === undefined) {
        orphanCatIDs.push(cname);
      } else {
        result.push(buildCategoryFromDataAndPatterns(cat, patterns));
        allPatterns.delete(cname);
      }
    }

    //
    // Fix possible de-synchronization of tables
    //
    const removeInvalidEntries = async (currentIDs, db) => {
      if (currentIDs.length) {
        await db.bulkDelete(currentIDs);
      }
    };
    await removeInvalidEntries(orphanCatIDs, this.categoriesDb);
    await removeInvalidEntries([...allPatterns.keys()], this.patternsDb);

    return result;
  }

  // only the data is modified
  async categoryAccountingModified(category) {
    if (!this._isInitialized('categoryAccountingModified')) {
      return;
    }
    // Don't use `this.smth` as it set be can to `null` during await
    const categoriesDb = this.categoriesDb;
    const cname = category && category.getName();
    if (!cname || !(await categoriesDb.has(cname))) {
      logger.error('Invalid category modified', cname);
      return;
    }
    // store only the data
    categoriesDb.set(cname, extractCategoryData(category));
  }

  async commitBuild(buildResources) {
    if (!this._isInitialized('commitBuild')) {
      return;
    }
    // Don't use `this.smth` as it set be can to `null` during await
    const categoriesDb = this.categoriesDb;
    const patternsDb = this.patternsDb;
    // Delete categories
    await Promise.all([
      categoriesDb.bulkDelete(buildResources.removeCategoriesIDs),
      patternsDb.bulkDelete(buildResources.removeCategoriesIDs)
    ]);
    // Set new categories
    const cats = new Map();
    buildResources.categories.forEach((cat, cname) =>
      cats.set(cname, extractCategoryData(cat)));
    await Promise.all([
      categoriesDb.bulkSetFromMap(cats),
      patternsDb.bulkSetFromMap(buildResources.patterns)
    ]);
  }
}
