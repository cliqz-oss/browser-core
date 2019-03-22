import { NativeModules } from 'react-native';

const PERMISSIONS = {
  ACCESS_FINE_LOCATION: 'geolocation',
  WEB_REQUEST: 'webRequest',
  WEB_REQUEST_BLOCKING: 'webRequestBlocking'
};
const RESULTS = {
  GRANTED: 'granted',
  REJECTED: 'rejectd'
};

export default {
  PERMISSIONS,
  RESULTS,
  ...(NativeModules.PermissionManagerModule || {}),
  contains: () => Promise.resolve(false)
};
