import { NetInfo } from 'react-native';

const networkStatus = {
  type: 'unknown', // types: none, wifi, cellular, unknown
};

const onConnectionChange = (connectionInfo) => {
  networkStatus.type = connectionInfo.type;
};

export function addConnectionChangeListener() {
  NetInfo.addEventListener(
    'connectionChange',
    onConnectionChange
  );
}

export function removeConnectionChangeListener() {
  NetInfo.removeEventListener(
    'connectionChange',
    onConnectionChange
  );
}


export default networkStatus;
