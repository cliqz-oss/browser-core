import RNFS from 'react-native-fs';

const BASEDIR = RNFS.MainBundlePath;

export default {
  get(path) {
    return RNFS.readFile(`${BASEDIR}/assets/${path}`);
  }
};
