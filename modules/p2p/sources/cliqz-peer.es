import CliqzPeer from './internal/cliqz-peer';

export default CliqzPeer;

// In Firefox extension, a window providing WebRTC APIs, as well as WebSocket, is needed.

// Do it like this:

// import CliqzPeer from 'p2p/cliqz-peer';
// import { createHiddenWindow, destroyHiddenWindow } from 'p2p/utils';

// createHiddenWindow().then(window => {
//   const peer =  new CliqzPeer(window, ...);
// });
