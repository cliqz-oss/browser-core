import CliqzUtils from 'core/utils';
import PeerComm from 'pairing/main';
import YoutubeApp from 'pairing/apps/youtube';
import TabsharingApp from 'pairing/apps/tabsharing';
import PingPongApp from 'pairing/apps/pingpong';
import SimpleStorage from 'core/simple-storage';

import { createHiddenWindow, destroyHiddenWindow } from 'p2p/utils';

export default {
  init() {
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
          CliqzUtils.getWindow().console.log(videos);
          if (videos.length) {
            CliqzUtils.getWindow().gBrowser.addTab(videos[0].url); // Ugly hack
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
  },
  unload() {
    PeerComm.unload();
    this.storage.close();
    destroyHiddenWindow(this.window);
    this.window = null;
  },

  actions: {
    getPairingPeer() {
      return PeerComm;
    }
  }
};
