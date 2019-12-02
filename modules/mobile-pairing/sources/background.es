/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PeerMaster from '../pairing/peer-master';
import YoutubeApp from '../pairing/apps/youtube';
import TabsharingApp from '../pairing/apps/tabsharing';
import PairingObserver from '../pairing/apps/pairing-observer';
import BookmarksImport from '../pairing/apps/bookmarks-import';
import LocalStorage from '../platform/storage';
import window from '../platform/window';
import osAPI from '../platform/os-api';
import background from '../core/base/background';
import { getDeviceName } from '../platform/device-info';
import { openTab, importBookmarks } from '../platform/browser-actions';

export default background({
  init() {
    const masterName = getDeviceName();
    this.peerMaster = new PeerMaster({ masterName });
    const CliqzMasterComm = this.peerMaster;

    const youtube = new YoutubeApp(
      () => {},
      ({ url, title, format }) => {
        osAPI.downloadVideo({ url, filename: `${title || 'YouTube video'}.${format}` });
      }
    );
    CliqzMasterComm.addObserver('YTDOWNLOADER', youtube);

    const tabsharing = new TabsharingApp(
      () => {},
      (tabs) => {
        tabs.forEach(x => openTab(x));
      }
    );
    CliqzMasterComm.addObserver('TABSHARING', tabsharing);

    const observer = new PairingObserver(() => {
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    });
    observer.onpairingerror = (error) => {
      osAPI.notifyPairingError({ error });
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    };
    observer.ondeviceadded = (data) => {
      osAPI.notifyPairingSuccess(data);
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    };
    CliqzMasterComm.addObserver('__MOBILEUI', observer);
    CliqzMasterComm.addObserver('BOOKMARKS', new BookmarksImport(() => {}));

    const storage = new LocalStorage('__MOBILE_PAIRING');
    const storagePromise = typeof storage.load === 'function' ? storage.load() : Promise.resolve();

    return storagePromise
      .then(() => CliqzMasterComm.init(storage))
      .then(() => this.initGlobals());
  },

  initGlobals() {
    const peerMaster = this.peerMaster;
    const peerBridge = {
      checkConnections() {
        peerMaster.checkConnections();
      },
      receiveQRValue(data) {
        peerMaster.qrCodeValue(data);
      },
      requestPairingData() {
        window.osAPI.pushPairingData(peerMaster.pairingData);
        window.peerBridge.checkConnections();
      },
      unpairDevice(deviceID) {
        peerMaster.unpair(deviceID);
      },
      renameDevice(peerId, newName) {
        peerMaster.changeDeviceName(peerId, newName);
      },
      sendTabs(peerID, tabs) {
        const name = (peerMaster.slaves.find(x => x.peerID === peerID) || {}).name;
        peerMaster.getObserver('TABSHARING').sendTab(tabs, peerID)
          .then(() => {
            window.osAPI.notifyTabSuccess({ peerID, name, msg: tabs });
          })
          .catch(() => {
            window.osAPI.notifyTabError({ peerID, name, msg: tabs });
          });
      },
    };

    window.peerBridge = peerBridge;
    window.setDeviceARN = (arn) => {
      if (arn) {
        const s = arn.split('/');
        const shortARN = s[s.length - 1];
        peerMaster.setDeviceARN(shortARN);
      }
    };
  },

  unload() {
    this.peerMaster.unload();
  },

  actions: {
    checkConnections() {
      this.peerMaster.checkConnections();
    },
    receiveQRValue(data) {
      this.peerMaster.qrCodeValue(data);
    },
    requestPairingData() {
      osAPI.pushPairingData(this.peerMaster.pairingData);
      this.actions.checkConnections();
    },
    unpairDevice(deviceID) {
      this.peerMaster.unpair(deviceID);
    },
    renameDevice(peerId, newName) {
      this.peerMaster.changeDeviceName(peerId, newName);
    },
    sendTabs(peerID, tabs) {
      const name = (this.peerMaster.slaves.find(x => x.peerID === peerID) || {}).name;
      this.peerMaster.getObserver('TABSHARING').sendTab(tabs, peerID)
        .then(() => {
          osAPI.notifyTabSuccess({ peerID, name, msg: tabs });
        })
        .catch(() => {
          osAPI.notifyTabError({ peerID, name, msg: tabs });
        });
    },
    importBookmarks(peerID, maxBookmarks = 999) {
      return this.peerMaster.getObserver('BOOKMARKS')
        .pull(peerID, data => importBookmarks(data, peerID), maxBookmarks)
        .catch(e => ({ error: true, errorMsg: e.message }));
    },
  }
});
