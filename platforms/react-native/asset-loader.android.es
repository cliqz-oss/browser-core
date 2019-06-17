import { readFileAssets } from './fs';

export default {
  get(path) {
    return readFileAssets(`assets/${path}`);
  }
};
