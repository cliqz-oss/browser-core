/* eslint no-underscore-dangle: off */
/* eslint no-param-reassign: off */
export default class LRU {
  constructor(size) {
    this.maxSize = size;

    // LRU structure
    this.reset = () => {
      this.cache = new Map();
      this.head = null;
      this.tail = null;
      this.size = 0;
    };
    this.reset();
  }

  /* Retrieve value associated with `key` from cache. If it doesn't
   * exist, return `undefined`, otherwise, update position of the
   * entry to "most recent seen".
   *
   * @param key - Key of value we want to get.
   */
  get(key) {
    const node = this.cache.get(key);

    if (node) {
      this._touch(node);
      return node.value;
    }
    return undefined;
  }

  /* Associate a new `value` to `key` in cache. If `key` isn't already
   * present in cache, create a new node at the position "most recent seen".
   * Otherwise, change the value associated with `key` and refresh the
   * position of the entry to "most recent seen".
   *
   * @param key   - Key add to the cache.
   * @param value - Value associated with key.
   */
  set(key, value) {
    let node = this.cache.get(key);

    if (node) {
      // Hit - update value
      node.value = value;
      this._touch(node);
    } else {
      // Miss - Create a new node
      node = this._newNode(key, value);

      // Forget about oldest node
      if (this.size >= this.maxSize) {
        this.cache.delete(this.tail.key);
        this._remove(this.tail);
      }

      this.cache.set(key, node);
      this._pushFront(node);
    }
  }

  // Private interface (Linked List)

  /* Create a new node (key, value) to store in the cache */
  _newNode(key, value) {
    return {
      prev: null,
      next: null,
      key,
      value,
    };
  }

  /* Refresh timestamp of `node` by moving it to the front of the list.
   * It the becomes the (key, value) seen most recently.
   */
  _touch(node) {
    this._remove(node);
    this._pushFront(node);
  }

  /* Remove `node` from the list. */
  _remove(node) {
    if (node) {
      // Update previous node
      if (node.prev === null) {
        this.head = node.next;
      } else {
        node.prev.next = node.next;
      }

      // Update next node
      if (node.next === null) {
        this.tail = node.prev;
      } else {
        node.next.prev = node.prev;
      }

      this.size -= 1;
    }
  }

  /* Add `node` in front of the list (most recent element). */
  _pushFront(node) {
    if (node) {
      // Replace first node of the list
      node.prev = null;
      node.next = this.head;

      if (this.head !== null) {
        this.head.prev = node;
      }

      this.head = node;

      // Case: List was empty
      if (this.tail === null) {
        this.tail = node;
      }

      this.size += 1;
    }
  }
}
