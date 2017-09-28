import background from '../core/base/background';
import { isVideoURL, getVideoInfo, getFormats } from './video-downloader';

export default background({
  init() {
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  actions: {
    findVideoLinks(url) {
      if (!isVideoURL(url)) {
        return Promise.resolve([]);
      }
      return getVideoInfo(url)
        .then(info => getFormats(info))
        .catch(() => []);
    },
  }
});
