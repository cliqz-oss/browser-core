/* eslint no-bitwise: 'off' */
import config from '../core/config';
import { toArrayBuffer } from '../core/crypto/utils';
import { Resource } from '../core/resource-loader';

export function ipv4ToBinaryString(ip) {
  if (!ip) {
    throw new Error('ip cannot be falsy');
  }
  const ipParts = ip.split('.')
    .map(n => parseInt(n, 10));
  if (ipParts.some(n => isNaN(n))) {
    throw new Error('ip must contain only numbers');
  }
  return ipParts
    .map(n => n.toString(2))
    .map(bs => Array(9 - bs.length).join('0') + bs)
    .join('');
}

export function ipv6ToBinaryString(ip) {
  if (!ip) {
    throw new Error('ip cannot be falsy');
  }
  const ipParts = ip.split(':');
  const length = ipParts.length;
  if (length < 8) {
    const insertPos = ipParts.findIndex(grp => grp === '');
    ipParts.splice(insertPos, 0, ...Array(8 - length).fill('0'));
  }
  return ipParts
    .map(v => parseInt(`0${v}`, 16))
    .map(n => n.toString(2))
    .map(bs => Array(16 - bs.length).fill('0').join('') + bs)
    .join('');
}

function countStates(tree) {
  if (tree === null || typeof tree === 'number') {
    return 1;
  }
  return countStates(tree[0]) + countStates(tree[1]);
}

export class BinaryTree {
  constructor(tree, leafValues, frameWidth) {
    this.leafValues = leafValues;
    this.tree = tree;
    this.frameWidth = frameWidth;
  }

  static fromArray(arrayTree, leafValues) {
    /* eslint no-use-before-define: 'off' */
    // construct
    const nStates = countStates(arrayTree);
    // determine state frame width (in bytes) based on the number of states in the tree.
    // We need enough bits to index all states, plus an extra bit to flag leaf nodes.
    // Note, it should not be possible for the leaf values to need more bits than the state
    // indices, because then you have more values than states!
    const frameWidth = [2, 3, 4].find(w => 2 ** ((w * 8) - 1) > nStates);
    // The buffer has 2 frames for each state in the tree
    const tree = new ArrayBuffer(nStates * frameWidth * 2);

    let stateIndex = 0;
    // isLeaf for the arrayTree
    const isLeaf = v => v === null || typeof v === 'number';
    // encode a state to binary representation
    // Leaf nodes are encoded with the top bit 1, then the value (representing a element in the
    // leafValues) array.
    // Other nodes contain the index of the next state in the tree (recursively calculated)
    const stateValue = (node) => {
      if (isLeaf(node)) {
        return (node !== null ? node : 255) + (1 << ((frameWidth * 8) - 1));
      }
      return fillTree(node);
    };
    // write a frame of state into the array buffer
    const writeFrame = (val, dataView) => {
      for (let i = 0; i < frameWidth; i += 1) {
        // shift down width - i - 1 bytes, then mask all but bottom byte
        dataView.setUint8(i, (val >> ((frameWidth - i - 1) * 8)) & 255);
      }
    };
    // recursive tree construction
    const fillTree = (node) => {
      const ind = stateIndex;
      stateIndex += 1;
      const valLeft = stateValue(node[0]);
      const valRight = stateValue(node[1]);
      writeFrame(valLeft, new DataView(tree, ind * frameWidth * 2, frameWidth));
      writeFrame(valRight, new DataView(tree, (ind * frameWidth * 2) + frameWidth, frameWidth));
      return ind;
    };

    fillTree(arrayTree);
    return new BinaryTree(tree, leafValues, frameWidth);
  }

  /**
   * Read the binary tree state an index. Returns a pair of values for left and right states.
   * A value is either the index of the next state on this branch, or the value of a leaf. What
   * kind of value this is can be checked using the isLeaf method.
   * @param index
   */
  readState(index) {
    const view = new DataView(this.tree, index * this.frameWidth * 2, this.frameWidth * 2);
    let left = 0;
    let right = 0;
    for (let i = 0; i < this.frameWidth; i += 1) {
      left += view.getUint8(i) << ((this.frameWidth - i - 1) * 8);
    }
    for (let i = 0; i < this.frameWidth; i += 1) {
      right += view.getUint8(i + this.frameWidth) << ((this.frameWidth - i - 1) * 8);
    }
    return [left, right];
  }

  /**
   * Check if the value in a a frame represents a leaf node.
   * Leaf nodes are represented by values with first bit set to 1.
   * @param v
   */
  isLeaf(v) {
    return v >= 2 ** ((this.frameWidth * 8) - 1);
  }

  lookup(addr) {
    let ind = 0;
    let n = this.readState(ind);
    for (let i = 0; i < addr.length; i += 1) {
      ind = n[addr[i]];
      if (this.isLeaf(ind)) {
        const leafVal = ind & 255;
        return leafVal === 255 ? null : this.leafValues[leafVal];
      }
      n = this.readState(ind);
    }
    return null;
  }
}

export default class GeoIp {
  constructor() {
    this._tree = [null, null];
    this._countries = [];
    this._loader = new Resource(
      ['antitracking', 'ipv4_btree_packed.json'],
      {
        remoteURL: `${config.settings.CDN_BASEURL}/anti-tracking/geoip/ip_btree_packed_20180501.json.gz`,
        remoteOnly: true,
      }
    );
  }

  load() {
    return this._loader.load().then((data) => {
      this.tree = new BinaryTree(toArrayBuffer(data.tree, 'b64'), data.countries, data.width);
    });
  }

  lookup4(ip) {
    const binAddr = ipv4ToBinaryString(ip);
    return this.tree.lookup(`0${binAddr}`);
  }

  lookup6(ip) {
    const v6binAddr = ipv6ToBinaryString(ip);
    return this.tree.lookup(`1${v6binAddr}`);
  }

  lookup(ip) {
    if (ip.indexOf('.') > 0) {
      return this.lookup4(ip);
    }
    if (ip.indexOf(':') > -1) {
      return this.lookup6(ip);
    }
    throw new Error('Not an ip address');
  }
}
