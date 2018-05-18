import { NativeModules } from 'react-native';

const geoLocationModule = NativeModules.GeoLocation;

export default function () {
  return geoLocationModule.getCurrentPosition()
          .catch(() => Promise.reject('Unable to retrieve location'));
};
