/* eslint-disable global-require */
import { NativeModules } from 'react-native';
import console from './console';

let fs;

if (NativeModules.RNFSManager) {
  fs = require('./fs-native');
} else {
  console.debug('fs: Falling back to async storage implementation');
  fs = require('./fs-async-storage');
}

export const readFile = fs.readFile;
export const readFileAssets = fs.readFileAssets;
export const writeFile = fs.writeFile;
