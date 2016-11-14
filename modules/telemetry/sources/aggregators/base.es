// TODO: could be static
export default class {
  constructor(keyBlackList = ['id', 'ts', 'session', 'seq', '_id', '_rev']) {
    // TODO: use hashmap for efficiency
    this.keyBlacklist = keyBlackList;
  }

  getAllKeys(objects, { blacklist = [] } = { }) {
    const keys = new Set();
    objects.forEach(o => Object.keys(o).forEach(key => keys.add(key)));
    blacklist.forEach(key => keys.delete(key));
    return keys;
  }
}
