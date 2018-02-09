import CliqzUtils from '../core/utils';
import PeerSlave from './peer-slave';
import YoutubeApp from './apps/youtube';
import TabsharingApp from './apps/tabsharing';
import SimpleStorage from '../core/simple-storage';
import PairingObserver from './apps/pairing-observer';
import background from '../core/base/background';
import CachedMap from '../core/persistence/cached-map';
import UrlbarButton from '../core/ui/urlbar-button';
import { getMessage } from '../core/i18n';
import inject from '../core/kord/inject';
import events from '../core/events';

export default background({
  core: inject.module('core'),
  init() {
    this.CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

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
              key => this.storage.set(key, oldData[key]))
            ));
        }
        return null;
      })
      .then(() => PeerComm.init(this.storage))
      .then(() => {
        this.initUI();
      });
  },
  unload() {
    this.unloadUI();
    if (this.peerSlave) {
      this.peerSlave.unload();
      delete this.peerSlave;
    }
    if (this.storage) {
      this.storage.unload();
      delete this.storage;
    }
  },

  initUI() {
    this.BTN_ID = 'mobilepairing_btn';
    this.CustomizableUI.createWidget({
      id: this.BTN_ID,
      defaultArea: this.CustomizableUI.AREA_PANEL,
      label: 'Connect',
      tooltiptext: 'Connect',
      onCommand: () => {
        CliqzUtils.openLink(CliqzUtils.getWindow(), 'about:preferences#connect', true, false, false, true);
        CliqzUtils.telemetry({
          type: 'burger_menu',
          version: 1,
          action: 'click',
          target: 'connect',
        });
      },
    });

    this.pageAction = new UrlbarButton({
      id: 'connect-sendtab',
      title: getMessage('pairing-send-tab-to-mobile'),
      iconURL: 'chrome://cliqz/content/pairing/images/tab-icon.svg',
      _insertBeforeActionID: 'screenshots',

      onShowingInPanel: (buttonNode) => {
        this.tobeSentData = null;
        const browserWin = buttonNode.ownerGlobal;
        const tabPos = browserWin.gBrowser.tabContainer.selectedIndex;
        const tabData = this.getTabData(browserWin, tabPos);
        const isEnabled = this.peerSlave.isPaired && this.isValidURL(tabData.url);
        if (isEnabled) {
          buttonNode.removeAttribute('disabled');
          this.tobeSentData = tabData;
        } else {
          buttonNode.setAttribute('disabled', true);
        }
      },
      onCommand: () => {
        if (this.tobeSentData) {
          CliqzUtils.telemetry({
            type: 'page_action_menu',
            version: 1,
            action: 'click',
            target: 'send_to_mobile',
          });
          this.sendTab(this.tobeSentData);
        }
      },
    });

    this.pageAction.build();
  },

  unloadUI() {
    if (this.CustomizableUI) {
      this.CustomizableUI.destroyWidget(this.BTN_ID);
      delete this.CustomizableUI;
    }
    if (this.pageAction) {
      this.pageAction.shutdown();
      delete this.pageAction;
    }
  },

  isValidURL(url) {
    return url.indexOf('https:') === 0 || url.indexOf('http:') === 0;
  },

  getTabData(window, tabPos) {
    const selectedBrowser = window.gBrowser.getBrowserAtIndex(tabPos);
    const url = selectedBrowser.currentURI.spec;
    const title = window.gBrowser.tabs[tabPos].label;
    const isPrivateWindow = CliqzUtils.isPrivate(window);
    const isPrivateTab = selectedBrowser.loadContext.usePrivateBrowsing;
    const isPrivate = isPrivateWindow || isPrivateTab;

    return { url, title, isPrivate };
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
