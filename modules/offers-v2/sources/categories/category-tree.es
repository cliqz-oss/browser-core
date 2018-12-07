const getNodeNamesFromCatName = catName => (catName ? catName.split('.') : []);
const getParentNodeFromCatName = (catName) => {
  const nodeNames = getNodeNamesFromCatName(catName) || [];
  nodeNames.pop();
  return nodeNames;
};

/**
 * Category node on the tree
 */
class CategoryNode {
  constructor(cname, category) {
    this.name = cname;
    this.category = category;
    this.children = new Map();
  }

  setCategory(cat) {
    this.category = cat;
  }

  hasCategory() {
    return !!this.category;
  }

  getCategory() {
    return this.category;
  }

  getName() {
    return this.name;
  }

  addChild(cnode) {
    this.children.set(cnode.name, cnode);
  }

  removeChild(name) {
    this.children.delete(name);
  }

  hasChildName(cnodeName) {
    return this.children.has(cnodeName);
  }

  getChild(cname) {
    return this.children.get(cname);
  }

  getChildren() {
    return [...this.children.values()];
  }
}

/**
 * category tree for easy access
 */
export default class CategoryTree {
  constructor() {
    this.root = new CategoryNode('');
  }

  addCategory(category) {
    const cname = category.getName();
    const catNames = getNodeNamesFromCatName(cname);
    const node = this._getOrCreateNode(catNames);
    node.setCategory(category);
  }

  hasCategory(cname) {
    return this._getNode(getNodeNamesFromCatName(cname)) !== null;
  }

  clear() {
    this.root = new CategoryNode('');
  }

  removeCategory(cname) {
    // we will remove all the children here?
    const parentNode = this._getNode(getParentNodeFromCatName(cname));
    if (parentNode !== null) {
      parentNode.removeChild(cname);
    }
  }

  getCategoryNode(cname) {
    return this._getNode(getNodeNamesFromCatName(cname));
  }

  getSubCategories(cname) {
    const node = this._getNode(getNodeNamesFromCatName(cname));
    if (node === null) {
      return [];
    }
    return node.getChildren();
  }

  getAllSubCategories(cname) {
    return this._filterSubCategoriesWithStop(cname, () => false).result;
  }

  someSubCategory(cname, f) {
    return this._filterSubCategoriesWithStop(cname, f).cond;
  }

  _filterSubCategoriesWithStop(cname, stopCond = null) {
    const result = [];
    const toProcess = [this._getNode(getNodeNamesFromCatName(cname))];
    while (toProcess.length > 0) {
      const top = toProcess.pop();
      if (top !== null) {
        if (stopCond(top)) {
          return { result, cond: true };
        }
        result.push(top);
        // else we will evaluate the children
        top.getChildren().forEach(c => toProcess.push(c));
      }
    }
    return { result, cond: false };
  }

  _getOrCreateNode(catNameList) {
    let currentParent = this.root;
    for (let i = 0; i < catNameList.length; i += 1) {
      const childName = catNameList[i];
      if (!currentParent.hasChildName(childName)) {
        const childNode = new CategoryNode(childName);
        currentParent.addChild(childNode);
        currentParent = childNode;
      } else {
        currentParent = currentParent.getChild(childName);
      }
    }
    return currentParent;
  }

  _getNode(catNameList) {
    let currentParent = this.root;
    for (let i = 0; i < catNameList.length && currentParent !== null; i += 1) {
      const childName = catNameList[i];
      if (childName === currentParent.getName()) {
        return currentParent;
      }
      currentParent = currentParent.hasChildName(childName)
        ? currentParent.getChild(childName)
        : null;
    }
    return currentParent;
  }
}
