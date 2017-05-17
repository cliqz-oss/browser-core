import CliqzUtils from 'core/utils';
import PeerComm from 'pairing/main';
import YoutubeApp from 'pairing/apps/youtube';
import TabsharingApp from 'pairing/apps/tabsharing';
import PingPongApp from 'pairing/apps/pingpong';
import SimpleStorage from 'core/simple-storage';

import { createHiddenWindow, destroyHiddenWindow } from 'p2p/utils';

// TODO: remove this!
const CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

const BTN_ID = 'mobilepairing_btn';

export default {
  init() {
    if (CliqzUtils.getPref('connect', false) === false) {
      this.enabled = false;
      return;
    }

    const pingpong = new PingPongApp();
    PeerComm.addObserver('PINGPONG', pingpong);

    const youtube = new YoutubeApp(() => {}, (video) => {
      CliqzUtils.log(`Received video ${video}`);
      const [, ...rest] = video.split(':');
      const id = rest.join(':');
      const youtubeurl = `https://www.youtube.com/get_video_info?video_id=${id}`;
      CliqzUtils.httpGet(youtubeurl, (x) => {
        if (x && x.responseText) {
          const videos = YoutubeApp.getLinks(x.responseText);
          if (videos.length) {
            CliqzUtils.openLink(CliqzUtils.getWindow(), videos[0].url, true, false, false, true);
          }
        }
      });
    });
    PeerComm.addObserver('YTDOWNLOADER', youtube);

    const tabsharing = new TabsharingApp(() => {}, (tab) => {
      CliqzUtils.log(`Received tab ${tab}`);
      CliqzUtils.getWindow().gBrowser.addTab(tab);
    });
    PeerComm.addObserver('TABSHARING', tabsharing);
    this.storage = new SimpleStorage();
    const storagePromise = this.storage.open('data', 'cliqz/pairing', true, true);
    Promise.all([createHiddenWindow(), storagePromise])
      .then(([w]) => {
        this.window = w;
        return PeerComm.init(this.storage, this.window);
      });


    CustomizableUI.createWidget({
      id: BTN_ID,
      defaultArea: CustomizableUI.AREA_PANEL,
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
    this.enabled = true;
  },
  unload() {
    if (this.enabled) {
      CustomizableUI.destroyWidget(BTN_ID);
      PeerComm.unload();
      this.storage.close();
      destroyHiddenWindow(this.window);
      this.window = null;
    }
  },

  actions: {
    getPairingPeer() {
      return PeerComm;
    }
  }
};
