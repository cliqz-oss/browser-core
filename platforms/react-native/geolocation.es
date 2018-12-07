import { NativeModules } from 'react-native';

const geoLocationModule = NativeModules.GeoLocation;

export default function () {
  return geoLocationModule.getCurrentPosition()
    .catch(() => Promise.reject(new Error('Unable to retrieve location')));
}
