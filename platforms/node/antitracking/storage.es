import { readFile, writeFile } from '../fs';

const PREFIX = 'attrack-store';

export default {

  getItem(id) {
    return readFile(`${PREFIX}/${id}`).catch(() => '{}');
  },

  setItem(id, value) {
    return writeFile(`${PREFIX}/${id}`, value);
  },

  removeItem() {
    return Promise.resolve();
  },

  clear() {
  }
};
