"use strict";

var expect = chai.expect;
var assert = chai.assert;

var CliqzPeer, createHiddenWindow, destroyHiddenWindow;

function mockSignaling(p1, p2) {
    p1.onsignaling = function(to, data) {
      if (to === p2.peerID) {
        p2.applySignalingMessage(data);
      }
    };
    p2.onsignaling = function(to, data) {
      if (to === p1.peerID) {
        p1.applySignalingMessage(data);
      }
    };
}

function doTests() {
    it('small message - string', function() {
        var ok = false;
        var win;
        return createHiddenWindow()
        .then(function(w) {
          win = w;
        })
        .then(function() {
            var p1 = new CliqzPeer(win, 'faustino', { signalingEnabled: false });
            var p2 = new CliqzPeer(win, 'rufino', { signalingEnabled: false });
            after(function() {
                destroyHiddenWindow(win);
                return Promise.all[p1.destroy(), p2.destroy()];
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, 'hello p2', 'label1');
            p2.onmessage = function(data, label, peerID) {
                if (data === 'hello p2' && peerID === 'faustino' && label === 'label1') {
                    p2.send(p1.peerID, 'hello p1', 'label2');
                } else {
                    p2.send(p1.peerID, 'wrong', 'labelwrong');
                }
            };
            return new Promise(function(resolve, reject) {
                p1.onmessage = function(data, label, peerID) {
                    if (data === 'hello p1' && peerID === 'rufino' && label === 'label2') {
                        resolve();
                    } else {
                        reject();
                    }
                };
            });
        });
    });

    it('small message - JSON', function() {
        var ok = false;
        var win;
        return createHiddenWindow()
        .then(function(w) {
          win = w;
        })
        .then(function() {
            var p1 = new CliqzPeer(win, 'faustino', { signalingEnabled: false });
            var p2 = new CliqzPeer(win, 'rufino', { signalingEnabled: false });
            after(function() {
                destroyHiddenWindow(win);
                return Promise.all[p1.destroy(), p2.destroy()];
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, { good: 'morning' }, 'label1');
            p2.onmessage = function(data) {
              if (data && typeof data === 'object' && data.good === 'morning') {
                p2.send(p1.peerID, { good: 'bye' });
              } else {
                p2.send(p1.peerID, { oh: 'no' });
              }
            };
            return new Promise(function(resolve, reject) {
              p1.onmessage = function(data) {
                if (data && typeof data === 'object' && data.good === 'bye') {
                    resolve();
                } else {
                    reject();
                }
              };
            });
        });
    });

    it('big message - Uint8Array', function() {
        var ok = false;
        var win;
        return createHiddenWindow()
        .then(function(w) {
          win = w;
        })
        .then(function() {
            function fillRandom(a) {
              for (var i = 0; i < a.length; ++i) {
                a[i] = Math.floor(Math.random() * 256);
              }
            }
            function arraysEqual(a, b) {
              if (a.length !== b.length) {
                return false;
              }
              for (var i = 0; i < a.length; ++i) {
                if (a[i] !== b[i]) return false;
              }
              return true;
            }
            var numBytes = 1024*1024;
            var bytes1 = new Uint8Array(numBytes);
            var bytes2 = new Uint8Array(numBytes);
            fillRandom(bytes1);
            fillRandom(bytes2);
            var p1 = new CliqzPeer(win, 'faustino', { signalingEnabled: false });
            var p2 = new CliqzPeer(win, 'rufino', { signalingEnabled: false });
            after(function() {
                destroyHiddenWindow(win);
                return Promise.all[p1.destroy(), p2.destroy()];
            });
            mockSignaling(p1, p2);
            p1.send(p2.peerID, bytes1);
            p2.onmessage = function(data) {
                if (arraysEqual(new Uint8Array(data), bytes1)) {
                  p2.send(p1.peerID, bytes2);
                } else {
                  p2.send(p1.peerID, 'ko');
                }
            };
            return new Promise(function(resolve, reject) {
                p1.onmessage = function(data) {
                  if (arraysEqual(new Uint8Array(data), bytes2)) {
                    resolve();
                  } else {
                    reject();
                  }
                };
            });
        });
    });
}


DEPS.CliqzPeerTest = ["core/utils"];
TESTS.CliqzPeerTest = function(CliqzUtils) {
  var modules = [
    'p2p/cliqz-peer',
    'p2p/utils',
  ];

  before(function() {
    return Promise.all(modules.map(function(x) {
      return CliqzUtils.importModule(x);
    }))
    .then(function(modules) {
      CliqzPeer = modules[0].default;
      createHiddenWindow = modules[1].createHiddenWindow;
      destroyHiddenWindow = modules[1].destroyHiddenWindow;
    });
  });

  describe('CliqzPeer', function() {
    this.timeout(10000); // TODO: Should do it in config...

    describe('simple functionality', function () {
      return doTests();
    });
  });
};

TESTS.CliqzPeerTest.MIN_BROWSER_VERSION = 37;
