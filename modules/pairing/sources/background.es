import CliqzUtils from '../core/utils';
import PeerSlave from './peer-slave';
import YoutubeApp from './apps/youtube';
import TabsharingApp from './apps/tabsharing';
import BookmarksImportApp from './apps/bookmarks-import';
import SimpleStorage from '../core/simple-storage';
import PairingObserver from './apps/pairing-observer';
import background from '../core/base/background';
import CachedMap from '../core/persistence/cached-map';
import inject from '../core/kord/inject';
import events from '../core/events';
import { getResourceUrl } from '../core/platform';
import contextmenuapi from '../platform/context-menu';
import { getMessage } from '../core/i18n';

function isValidURL(url) {
  return url.indexOf('https:') === 0 || url.indexOf('http:') === 0;
}

export default background({
  core: inject.module('core'),
  init() {
    this.initContextMenus();
    const PeerComm = new PeerSlave();
    this.peerSlave = PeerComm;

    const youtube = new YoutubeApp(() => {});
    PeerComm.addObserver('YTDOWNLOADER', youtube);

    const tabsharing = new TabsharingApp(() => {}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.isPrivate) {
          CliqzUtils.openLink(CliqzUtils.getWindow(), tab.url, false, false, true);
        } else {
          CliqzUtils.openLink(CliqzUtils.getWindow(), tab.url, true);
        }
      });
    });
    PeerComm.addObserver('TABSHARING', tabsharing);

    const observer = new PairingObserver();
    observer.onpaired = () => {
      CliqzUtils.telemetry({
        type: 'connect',
        version: 1,
        action: 'connect',
        is_success: true,
      });
    };
    PeerComm.addObserver('TELEMETRY', observer);


    function sendUI(action) {
      const targets = [
        'resource://cliqz/pairing/index.html',
        'chrome://cliqz/content/pairing/index.html',
        getResourceUrl('pairing/index.html'),
      ];

      targets.forEach((target) => {
        this.core.action(
          'broadcastMessage',
          target,
          {
            action,
            message: this.peerSlave.pairingInfo,
          }
        );
      });
      events.pub(`pairing.${action}`, this.peerSlave.pairingInfo);
    }

    const uiObs = new PairingObserver();
    uiObs.oninit = sendUI.bind(this, 'onPairingInit');
    uiObs.ondeviceadded = sendUI.bind(this, 'onPairingDeviceAdded');
    uiObs.onpairing = sendUI.bind(this, 'onPairingStarted');
    uiObs.onpaired = sendUI.bind(this, 'onPairingDone');
    uiObs.onunpaired = sendUI.bind(this, 'onPairingRemoved');
    uiObs.onmasterconnected = sendUI.bind(this, 'onPairingMasterConnected');
    uiObs.onmasterdisconnected = sendUI.bind(this, 'onPairingMasterDisconnected');
    PeerComm.addObserver('__UI__', uiObs);

    PeerComm.addObserver('BOOKMARKS', new BookmarksImportApp(() => {}));

    this.storage = new CachedMap('pairing');
    return this.storage.init()
      .then(() => {
        if (this.storage.size() === 0) {
          // Migrate from old db
          const oldStorage = new SimpleStorage();
          let oldData = {};
          return Promise.resolve()
            .then(() => oldStorage.open('data', ['cliqz', 'pairing'], true, true))
            .then(() => {
              oldData = oldStorage.istorage.obj;
            })
            .catch(() => {})
            .then(() => oldStorage.destroy())
            .catch(() => {})
            .then(() => Promise.all(Object.keys(oldData).map(
              key => this.storage.set(key, oldData[key])
            )));
        }
        return null;
      })
      .then(() => PeerComm.init(this.storage));
  },
  unload() {
    this.unloadContextMenus();
    if (this.peerSlave) {
      this.peerSlave.unload();
      delete this.peerSlave;
    }
    if (this.storage) {
      this.storage.unload();
      delete this.storage;
    }
  },

  initContextMenus() {
    if (!contextmenuapi) {
      return;
    }
    const show = () => {
      contextmenuapi.create({
        id: 'send-cliqz-to-mobile',
        title: getMessage('video_downloader_send_to_mobile'),
        contexts: ['link', 'page', 'tab', 'video'],
      });
    };
    const hide = () => {
      contextmenuapi.remove('send-cliqz-to-mobile');
    };

    show();

    const getItem = (info, tab) => {
      const { linkUrl, mediaType/* , srcUrl */ } = info;
      const { incognito, title, url } = tab;

      if (linkUrl) {
        if (isValidURL(linkUrl)) {
          return { url: linkUrl, title: '', isPrivate: incognito };
        }
      } else if (mediaType) {
        // TODO: perhaps we can send video/audio in the future
        return undefined;
        // return { mediaType, srcUrl };
      } else if (url) {
        if (isValidURL(url)) {
          return { url, title, isPrivate: incognito };
        }
      }
      return null;
    };

    this._onShown = (info, tab) => {
      hide();
      // TODO: could show it anyways and open Connect page if not paired.
      const isPaired = this.peerSlave.isInit && this.peerSlave.isPaired;
      if (isPaired && getItem(info, tab)) {
        show();
      }
      contextmenuapi.refresh();
    };

    this._onClicked = (info, tab) => {
      const { menuItemId } = info;
      if (menuItemId === 'send-cliqz-to-mobile') {
        const item = getItem(info, tab);
        if (item && item.url) {
          this.sendTab(item);
        }
      }
    };
    contextmenuapi.onShown.addListener(this._onShown);
    contextmenuapi.onClicked.addListener(this._onClicked);
  },

  unloadContextMenus() {
    if (!contextmenuapi) {
      return;
    }
    contextmenuapi.remove('send-cliqz-to-mobile');
    contextmenuapi.onShown.removeListener(this._onShown);
    contextmenuapi.onClicked.removeListener(this._onClicked);
    delete this._onClicked;
    delete this._onShown;
  },

  sendTab(data) {
    this.peerSlave.getObserver('TABSHARING').sendTab([data], this.peerSlave.masterID)
      .then(() => {
        CliqzUtils.telemetry({
          type: 'connect',
          version: 1,
          action: 'send_tab',
          is_success: true,
        });
      })
      .catch(() => {
        CliqzUtils.telemetry({
          type: 'connect',
          version: 1,
          action: 'send_tab',
          is_success: false,
        });
      });
  },

  actions: {
    getPairingPeer() {
      return this.peerSlave;
    },
    checkMasterConnection() {
      if (this.peerSlave.isInit && this.peerSlave.isPaired) {
        this.peerSlave.checkMasterConnection();
      }
    },
    startPairing() {
      return this.peerSlave.startPairing();
    },
    unpair() {
      return this.peerSlave.unpair();
    },
    getInfo() {
      return this.peerSlave.pairingInfo;
    }
  }
});
