"use strict";

// TODO: mock signaling as in CliqzPeer tests?

function MockStorage() {
  this.obj = {};
}

MockStorage.prototype.setItem = function(key, value) {
  this.obj[key] = value;
};

MockStorage.prototype.getItem = function(key) {
  return this.obj[key];
};

MockStorage.prototype.removeItem = function(key) {
  delete this.obj[key];
};

DEPS.PairingTest = ["core/utils"];
TESTS.PairingTest = function(CliqzUtils) {
  var expect = chai.expect;
  var PeerMaster, CliqzPeer, PeerSlave, SimpleStorage;
  var System = CliqzUtils.getWindow().CLIQZ.System;
  var modules = [
    'p2p/cliqz-peer',
    'pairing/peer-master',
    'pairing/peer-slave',
    'core/simple-storage',
  ];

  before(function() {
    return Promise.all(modules.map(x => System.import(x)))
      .then(modules => {
        CliqzPeer = modules[0].CliqzPeer;
        PeerMaster = modules[1].default;
        PeerSlave = modules[2].default;
        SimpleStorage = modules[3].default;
      });
  });

  describe('Pairing', function() {
    this.timeout(15000);
    // it("Key generation and persistence", function () {
    //   var testprefix = 'test_' + Math.round(Math.random()*1000000);
    //   var CliqzMasterComm = new PeerMaster();
    //   var CliqzSlaveComm = new PeerSlave();
    //   var pkmaster, pkslave;
    //   return Promise.all([
    //     CliqzMasterComm.init(window, testprefix + 'master'),
    //     CliqzSlaveComm.init(window, testprefix + 'slave'),
    //   ])
    //   .then(() => {
    //     pkmaster = CliqzMasterComm.privateKey;
    //     pkslave = CliqzSlaveComm.keypair[0];
    //     expect(pkmaster).to.not.equal(null);
    //     expect(pkslave).to.not.equal(null);
    //     expect(pkmaster).to.not.equal(undefined);
    //     expect(pkslave).to.not.equal(undefined);
    //     return Promise.all([CliqzMasterComm.unload(), CliqzSlaveComm.unload()]);
    //   })
    //   .then(() => {
    //     CliqzMasterComm = new PeerMaster();
    //     CliqzSlaveComm = new PeerSlave();
    //     return Promise.all([
    //       CliqzMasterComm.init(window, testprefix + 'master'),
    //       CliqzSlaveComm.init(window, testprefix + 'slave'),
    //     ]);
    //   })
    //   .then(() => {
    //     expect(CliqzMasterComm.privateKey).to.equal(pkmaster);
    //     expect(CliqzSlaveComm.keypair[0]).to.equal(pkslave);
    //     return Promise.all([CliqzMasterComm.destroy(), CliqzSlaveComm.destroy()]);
    //   })
    //   .then(() => {
    //     CliqzMasterComm = new PeerMaster();
    //     CliqzSlaveComm = new PeerSlave();
    //     return Promise.all([
    //       CliqzMasterComm.init(window, testprefix + 'master'),
    //       CliqzSlaveComm.init(window, testprefix + 'slave'),
    //     ]);
    //   })
    //   .then(() => {
    //     expect(CliqzMasterComm.privateKey).to.not.equal(pkmaster);
    //     expect(CliqzSlaveComm.keypair[0]).to.not.equal(pkslave);
    //     return Promise.all([CliqzMasterComm.destroy(), CliqzSlaveComm.destroy()]);
    //   });
    // });

    it("Simple pairing and message passing", function () {
      var testprefix = 'test_' + Math.round(Math.random()*1000000);
      var CliqzMasterComm = new PeerMaster();
      var CliqzSlaveComm = new PeerSlave();
      var storage = new MockStorage();
      var simpleStorage = new SimpleStorage(true);
      var pkmaster, pkslave;
      return Promise.all([
        CliqzMasterComm.init(storage),
        CliqzSlaveComm.init(simpleStorage),
      ])
      .then(() => {
        return new Promise((resolve, reject) => {
          CliqzSlaveComm.addObserver('channel', {
            oninit: function(comm) {
              comm.startPairing('deviceName');
            },
            onpairing: function(token) {
              CliqzMasterComm.qrCodeValue(token);
            },
            onpaired: function(masterID, devices) {
              resolve();
            },
          });
        });
      })
      .then(() => {
        return new Promise(resolve => {
          CliqzSlaveComm.addObserver('MYAPP', {
            oninit: function(comm) {
              this.comm = comm;
              if (this.comm.isPaired) {
                this.comm.send('PING', this.comm.masterID);
              }
            },
            onmessage: function(msg, source, label) {
              if (msg === 'PONG' && source === this.comm.masterID && label === 'MYAPP') {
                resolve();
              }
            },
          });
          CliqzMasterComm.addObserver('MYAPP', {
            oninit: function(comm) {
              this.comm = comm;
            },
            onmessage: function(msg, source, label) {
              if (msg === 'PING' && source === CliqzSlaveComm.deviceID && label === 'MYAPP') {
                this.comm.send('PONG', source);
              }
            },
          });
        });
      })
      .then(() => {
        var p1 = new Promise(resolve => {
          CliqzSlaveComm.addObserver('CHECKUNPAIR', {
            onunpaired: function() {
              resolve();
            },
          });
        });
        var p2 = new Promise(resolve => {
          var oldDeviceID = CliqzSlaveComm.deviceID;
          CliqzMasterComm.addObserver('CHECKUNPAIR', {
            ondeviceremoved: function(device) {
              if (device.id === oldDeviceID) {
                resolve();
              }
            },
          });
        });
        CliqzSlaveComm.unpair();
        return Promise.all([p1, p2]);
      })
      .then(() => {
        expect(Object.keys(CliqzMasterComm.slaves).length).to.equal(0);
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          CliqzSlaveComm.addObserver('channel', {
            oninit: function(comm) {
              comm.startPairing('deviceName');
            },
            onpairing: function(token) {
              CliqzMasterComm.qrCodeValue(token);
            },
            onpaired: function(masterID, devices) {
              resolve();
            },
          });
        });
      })
      .then(() => {
        expect(Object.keys(CliqzMasterComm.slaves).length).to.not.equal(0);
        expect(CliqzMasterComm.masterPeer).to.not.be.null;
      })
      .then(() => {
        return new Promise(resolve => {
          CliqzSlaveComm.addObserver('MYAPP', {
            oninit: function(comm) {
              this.comm = comm;
              if (this.comm.isPaired) {
                this.comm.send('PING', this.comm.masterID);
              }
            },
            onmessage: function(msg, source, label) {
              if (msg === 'PONG' && source === this.comm.masterID && label === 'MYAPP') {
                resolve();
              }
            },
          });
          CliqzMasterComm.addObserver('MYAPP', {
            oninit: function(comm) {
              this.comm = comm;
            },
            onmessage: function(msg, source, label) {
              if (msg === 'PING' && source === CliqzSlaveComm.deviceID && label === 'MYAPP') {
                this.comm.send('PONG', source);
              }
            },
          });
        });
      })
      .then(() => {
        const peerID = CliqzSlaveComm.deviceID;
        return new Promise((resolve, reject) => {
          CliqzMasterComm.addObserver('remove_peer', {
            onmessage: (msg, source, type) => {
              if (type === 'remove_peer' && source === peerID) {
                resolve();
              } else {
                reject();
              }
            },
          });
          CliqzSlaveComm.unpair();
        });
      })
      .then(() => {
        expect(Object.keys(CliqzMasterComm.slaves).length).to.equal(0);
      })
      .then(() => Promise.all([CliqzMasterComm.destroy(), CliqzSlaveComm.destroy()]));
    });

    it("Several devices pairing, master message storage", function () {
      var testprefix = 'test_' + Math.round(Math.random()*1000000);
      var CliqzMasterComm = new PeerMaster();
      var CliqzSlave1 = new PeerSlave();
      var CliqzSlave2 = new PeerSlave();
      var storage = new MockStorage();
      var simpleStorage1 = new SimpleStorage(true);
      var simpleStorage2 = new SimpleStorage(true);

      var TestApp1 = {
        oninit: function(comm) {
          TestApp1.comm = comm;
        },
      };
      var TestApp2 = {
        oninit: function(comm) {
          TestApp2.comm = comm;
        },
      };
      var TestAppMaster = {
        oninit: function(comm) {
          TestAppMaster.comm = comm;
        },
      };
      CliqzSlave1.addObserver('TEST', TestApp1);
      CliqzSlave2.addObserver('TEST', TestApp2);
      CliqzMasterComm.addObserver('TEST', TestAppMaster);
      return Promise.all([
        CliqzMasterComm.init(storage),
        CliqzSlave1.init(simpleStorage1),
        CliqzSlave2.init(simpleStorage2),
      ])
      .then(() => {
        return new Promise(resolve => {
          CliqzSlave1.addObserver('channel', {
            oninit: function(comm) {
              this.comm = comm;
              CliqzSlave1.startPairing('slave1');
            },
            onpairing: function(token) {
              CliqzMasterComm.qrCodeValue(token);
            },
            onpaired: function() {
              resolve();
            },
          });
        });
      })
      // Device added event
      .then(() => {
        return new Promise(resolve => {
          CliqzSlave1.addObserver('ondeviceadded', {
            ondeviceadded: function(device) {
              if (device.id === CliqzSlave2.deviceID) {
                resolve();
              }
            },
          });
          CliqzSlave2.addObserver('channel', {
            oninit: function(comm) {
              this.comm = comm;
              CliqzSlave2.startPairing('slave2');
            },
            onpairing: function(token) {
              CliqzMasterComm.qrCodeValue(token);
            },
          });
        });
      })
      // Message to other (non-master) device
      .then(() => {
        var p1 = new Promise(resolve => {
          TestApp2.onmessage = function(msg, source) {
            resolve();
            if (msg === 'HOLA' && source === TestApp1.deviceID) {
              resolve();
            }
          };
        });
        var p2 = new Promise(resolve => {
          TestAppMaster.onmessage = function(msg, source) {
            if (msg === 'HOLA' && source === CliqzSlave1.deviceID) {
              resolve();
            }
          };
        });
        TestApp1.comm.send('HOLA', [CliqzSlave2.deviceID, CliqzSlave2.masterID]);
        return Promise.all([p1, p2]);
      })
      // Master message storage test (postponed delivery)
      .then(() => {
        var id = CliqzSlave1.deviceID;
        CliqzSlave1.unload();
        return id;
      })
      .then(id => TestApp2.comm.send('HOLA2', id))
      .then(() => {
        CliqzSlave1 = new PeerSlave();
        var p1 = new Promise(resolve => {
          TestApp1.onmasterconnected = resolve;
        });
        var p2 = new Promise(resolve => {
          CliqzSlave1.addObserver('TEST', TestApp1);
          TestApp1.onmessage = function(msg, source) {
            if (msg === 'HOLA2' && source === CliqzSlave2.deviceID) {
              resolve();
            }
          };
          CliqzSlave1.init(simpleStorage1);
        });
        return Promise.all([p1, p2]);
      })
      // Broadcast test
      .then(() => {
        var p1 = TestApp1.comm.send('HOLA3');
        var p2 = new Promise(resolve => {
          TestApp2.onmessage = resolve;
        });
        var p3 = new Promise(resolve => {
          TestAppMaster.onmessage = resolve;
        });
        return Promise.resolve([p3, p2, p1]);
      })
      // Unpair test events
      .then(() => {
        var p1 = new Promise(resolve => {
          TestApp1.onmasterdisconnected = resolve;
        });
        var p2 = new Promise(resolve => {
          var id = CliqzSlave1.deviceID;
          CliqzSlave1.unpair();
          TestApp2.ondeviceremoved = function(device) {
            if (id === device.id) {
              resolve();
            }
          };
        });
        return Promise.all([p1, p2]);
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          const peerID = CliqzSlave2.deviceID;
          CliqzMasterComm.addObserver('remove_peer', {
            onmessage: (msg, source, type) => {
              if (type === 'remove_peer' && source === peerID) {
                resolve();
              } else {
                reject();
              }
            },
          });
          CliqzSlave2.unpair();
        });
      })
      .then(() => {
        expect(Object.keys(CliqzMasterComm.slaves).length).to.equal(0);
      })
      .then(() => Promise.all([CliqzMasterComm.destroy(), CliqzSlave1.destroy(), CliqzSlave2.destroy()]));
    });
  });
};

// TODO: adjust version properly
TESTS.PairingTest.MIN_BROWSER_VERSION = 48;
