import prefs from '../core/prefs';
import background from '../core/base/background';
import { isVideoURL, getVideoInfo, getFormats } from './video-downloader';

const UI_TOUR_PREF = 'videoDownloaderUITourDismissed';
const DOWNLOADS_UI_TOUR_PREF = 'downloadsUITourDismissed';
const ONE_DAY = 24 * 60 * 60 * 1000;

export default background({
  init() {
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  get isUITourDismissed() {
    const lastSkip = prefs.get(UI_TOUR_PREF, '0');

    if (lastSkip === 'dismissed') {
      return true;
    }

    if (parseInt(lastSkip, 10) + ONE_DAY < Date.now()) {
      return false;
    }

    return true;
  },

  get isDownloadsUITourDismissed() {
    const lastSkip = prefs.get(DOWNLOADS_UI_TOUR_PREF, '0');

    if (lastSkip === 'dismissed') {
      return true;
    }

    if (parseInt(lastSkip, 10) + ONE_DAY < Date.now()) {
      return false;
    }

    return true;
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
    closeUITour(isSkipping) {
      if (isSkipping) {
        prefs.set(UI_TOUR_PREF, Date.now().toString());
      } else {
        prefs.set(UI_TOUR_PREF, 'dismissed');
      }
    },
    closeDownloadsUITour(isSkipping) {
      if (isSkipping) {
        prefs.set(DOWNLOADS_UI_TOUR_PREF, Date.now().toString());
      } else {
        prefs.set(DOWNLOADS_UI_TOUR_PREF, 'dismissed');
      }
    },
  }
});
