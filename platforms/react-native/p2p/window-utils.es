import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';

const window = {
  WebSocket,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription
};

export function getBackgroundWindow() {
  return Promise.resolve(window);
}

export function destroyBackgroundWindow() {
}
