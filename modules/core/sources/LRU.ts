/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

interface Node<K, V> {
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
  key: K;
  value: V;
}

/* Create a new node (key, value) to store in the cache */
function newNode<K, V>(key: K, value: V): Node<K, V> {
    return {
      prev: null,
      next: null,
      key,
      value,
    };
}

export default class LRU<K, V> {
  public readonly maxSize: number;

  private head: null | Node<K, V> = null;
  private tail: null | Node<K, V> = null;
  private size: number = 0;
  private readonly cache: Map<K, Node<K, V>> = new Map();

  private readonly reset: () => void = () => {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.size = 0;
  };

  constructor(size: number) {
    this.maxSize = size;
    this.reset();
  }

  /*
   * Check if value associated with `key` is stored in cache.
   * Does not update position of the entry.
   *
   * @param key
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /* Retrieve value associated with `key` from cache. If it doesn't
   * exist, return `undefined`, otherwise, update position of the
   * entry to "most recent seen".
   *
   * @param key - Key of value we want to get.
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (node !== undefined) {
      this.touch(node);
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
  set(key: K, value: V): void {
    let node = this.cache.get(key);

    if (node !== undefined) {
      // Hit - update value
      node.value = value;
      this.touch(node);
    } else {
      // Miss - Create a new node
      node = newNode(key, value);

      // Forget about oldest node
      if (this.size >= this.maxSize && this.tail !== null) {
        this.cache.delete(this.tail.key);
        this.remove(this.tail);
      }

      this.cache.set(key, node);
      this.pushFront(node);
    }
  }

  toMap(): Map<K, V> {
    return new Map(Array.from(this.cache.values()).map(({ key, value }) => [key, value]));
  }

  // Private interface (Linked List)

  /* Refresh timestamp of `node` by moving it to the front of the list.
   * It the becomes the (key, value) seen most recently.
   */
  private touch(node: Node<K, V>): void {
    this.remove(node);
    this.pushFront(node);
  }

  /* Remove `node` from the list. */
  private remove(node: Node<K, V>): void {
    if (node !== null) {
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
  private pushFront(node: Node<K, V>): void {
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
