/* eslint-disable no-param-reassign */

import {
  app,
} from '../../../tests/core/integration/helpers';


export default function () {
  function mockSignaling(p1, p2) {
    p1.onsignaling = function (to, data) {
      if (to === p2.peerID) {
        p2.applySignalingMessage(data);
      }
    };
    p2.onsignaling = function (to, data) {
      if (to === p1.peerID) {
        p1.applySignalingMessage(data);
      }
    };
  }

  const p2p = app.modules.p2p;
  if (!p2p || !p2p.isEnabled) {
    return;
  }

  describe('Peer 2 Peer', function () {
    describe('simple functionality', function () {
      it('small message - string', function () {
        let p1 = p2p.action('createPeer', 'faustino', { signalingEnabled: false });
        let p2 = p2p.action('createPeer', 'rufino', { signalingEnabled: false });

        return Promise.all([p1, p2])
          .then(function (peers) {
            p1 = peers[0];
            p2 = peers[1];
            after(function () {
              return Promise.all([p1.destroy(), p2.destroy()]);
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, 'hello p2', 'label1');
            p2.onmessage = function (data, label, peerID) {
              if (data === 'hello p2' && peerID === 'faustino' && label === 'label1') {
                p2.send(p1.peerID, 'hello p1', 'label2');
              } else {
                p2.send(p1.peerID, 'wrong', 'labelwrong');
              }
            };
            return new Promise(function (resolve, reject) {
              p1.onmessage = function (data, label, peerID) {
                if (data === 'hello p1' && peerID === 'rufino' && label === 'label2') {
                  resolve();
                } else {
                  reject();
                }
              };
            });
          });
      });

      it('small message - JSON', function () {
        let p1 = p2p.action('createPeer', 'faustino', { signalingEnabled: false });
        let p2 = p2p.action('createPeer', 'rufino', { signalingEnabled: false });
        return Promise.all([p1, p2])
          .then(function (peers) {
            p1 = peers[0];
            p2 = peers[1];
            after(function () {
              return Promise.all([p1.destroy(), p2.destroy()]);
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, { good: 'morning' }, 'label1');
            p2.onmessage = function (data) {
              if (data && typeof data === 'object' && data.good === 'morning') {
                p2.send(p1.peerID, { good: 'bye' });
              } else {
                p2.send(p1.peerID, { oh: 'no' });
              }
            };
            return new Promise(function (resolve, reject) {
              p1.onmessage = function (data) {
                if (data && typeof data === 'object' && data.good === 'bye') {
                  resolve();
                } else {
                  reject();
                }
              };
            });
          });
      });

      it('big message - Uint8Array', function () {
        let p1 = p2p.action('createPeer', 'faustino', { signalingEnabled: false });
        let p2 = p2p.action('createPeer', 'rufino', { signalingEnabled: false });
        return Promise.all([p1, p2])
          .then(function (peers) {
            p1 = peers[0];
            p2 = peers[1];
            function fillRandom(a) {
              for (let i = 0; i < a.length; i += 1) {
                a[i] = Math.floor(Math.random() * 256);
              }
            }
            function arraysEqual(a, b) {
              if (a.length !== b.length) {
                return false;
              }
              for (let i = 0; i < a.length; i += 1) {
                if (a[i] !== b[i]) return false;
              }
              return true;
            }
            const numBytes = 100 * 1024;
            const bytes1 = new Uint8Array(numBytes);
            const bytes2 = new Uint8Array(numBytes);
            fillRandom(bytes1);
            fillRandom(bytes2);
            after(function () {
              return Promise.all([p1.destroy(), p2.destroy()]);
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, bytes1);
            p2.onmessage = function (data) {
              if (arraysEqual(new Uint8Array(data), bytes1)) {
                p2.send(p1.peerID, bytes2);
              } else {
                p2.send(p1.peerID, 'ko');
              }
            };
            return new Promise(function (resolve, reject) {
              p1.onmessage = function (data) {
                if (arraysEqual(new Uint8Array(data), bytes2)) {
                  resolve();
                } else {
                  reject();
                }
              };
            });
          });
      });
    });
  });
}
