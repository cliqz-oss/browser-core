import { readFile, writeFile } from 'core/fs';

export default class {
  constructor() {
    this.reset();
  }

  reset() {
    this.nodes = Object.create(null);
    this.root = undefined;
  }

  load(filename) {
    return readFile(filename, { isText: true }).then((data) => {
      const nodes = JSON.parse(data);
      this.reset();
      this.insertNodes(nodes);
      return Promise.resolve('loaded');
    });
  }

  save(filename) {
    return writeFile(filename, JSON.stringify(this.nodes), { isText: true });
  }

  insertNodes(nodes) {
    nodes.forEach((node) => {
      const { value, k, parent } = node;

      if (value === parent) {
        throw new Error('cycle detected');
      }

      let currentNode = this.nodes[value];
      if (!currentNode) {
        currentNode = this.createNode(value, k);
        this.nodes[value] = currentNode;
      } else {
        currentNode.k += k;
      }

      let parentNode;
      if (parent) {
        parentNode = this.nodes[parent];
        if (!parentNode) {
          parentNode = this.createNode(parent);
          this.nodes[parent] = parentNode;
        }
        parentNode.children.push(currentNode);
        currentNode.parent = parentNode;
      }
    });

    this.root = undefined;
  }

  isEmpty() {
    return !Object.keys(this.nodes).length;
  }

  getRoot() {
    if (this.isEmpty()) {
      return undefined;
    }

    if (this.root) {
      return this.root;
    }

    // TODO: any = (d) => { for (let k in d) { if (d.hasOwnProperty(k)) return d[k]; } }
    let node = this.nodes[Object.keys(this.nodes)[0]];
    while (node.parent) {
      node = node.parent;
    }
    this.root = node;

    return this.root;
  }

  // TODO: add test
  createNode(value, k = 0, parent = undefined, children = []) {
    return Object.assign(Object.create(null), { value, k, parent, children });
  }

  anonymize(value, safeK) {
    if (this.isEmpty()) {
      throw new Error('empty tree');
    }

    if (!this.nodes[value]) {
      return '_na';
    }

    let node = this.nodes[value];
    let currentK = node.k;
    while (node.parent && currentK < safeK) {
      node.parent.children.forEach(child => {
        if (child.k < safeK && child.value !== node.value) {
          currentK += child.k;
        }
      });
      node = node.parent;
    }

    // node === root (otherwise we would have gone further up)
    if (currentK < safeK) {
      return '_na';
    }

    return node.value;
  }
}
