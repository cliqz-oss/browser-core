import RNFS from 'react-native-fs';

const BASEDIR = RNFS.MainBundlePath;

export default {
  get(path) {
    if (BASEDIR) {
      // iOS - read from main bundle
      return RNFS.readFile(`${BASEDIR}/assets/${path}`);
    }
    // android - read from assets folder
    return RNFS.readFileAssets(`assets/${path}`);
  }
};
