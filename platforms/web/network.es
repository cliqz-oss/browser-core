import window from './window';
// TODO: get connection type
export default {
  type: window.onLine ? 'unknown' : 'none'
};

export function addConnectionChangeListener() {
}

export function removeConnectionChangeListener() {
}
