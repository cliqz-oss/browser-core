/**
 * Short-term living object to collect changes in categories
 */
export default class TemporaryBuildResources {
  constructor() {
    // No need to cleanup fields manually, as the code that creates
    // the object also sets the object to `null`. The garbage collector
    // cleanups the object together with its fields.
    this.categories = new Map();
    this.patterns = new Map();
    this.removeCategoriesIDs = [];
  }

  removeCategory(category) {
    const cname = category.getName();
    this.removeCategoriesIDs.push(cname);
    this.patterns.delete(cname);
  }

  addCategory(category, patterns) {
    const cname = category.getName();
    this.categories.set(cname, category);
    this.patterns.set(cname, patterns);
  }
}
