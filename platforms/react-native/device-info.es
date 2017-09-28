import DeviceInfo from 'react-native-device-info';

function getDeviceName() {
  return DeviceInfo.getDeviceName();
}

function getUserAgent() {
  return DeviceInfo.getUserAgent();
}

export { getDeviceName, getUserAgent };
