import WebRTC from 'react-native-webrtc';

const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} = WebRTC;

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
