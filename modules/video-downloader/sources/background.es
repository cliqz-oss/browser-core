import prefs from '../core/prefs';
import config from '../core/config';
import { getMessage } from '../core/i18n';
import ToolbarButton from '../core/ui/toolbar-button';
import background from '../core/base/background';
import { isVideoURL, getVideoInfo, getFormats } from './video-downloader';

const UI_TOUR_PREF = 'videoDownloaderUITourDismissed';
const ONE_DAY = 24 * 60 * 60 * 1000;

export default background({
  init() {
    this.pageAction = new ToolbarButton({
      widgetId: 'video-downloader-page-action',
      default_title: getMessage('video-downloader-uitour-title'),
      default_popup: `${config.baseURL}video-downloader/index.html`,
      default_icon: `${config.baseURL}video-downloader/images/video-downloader.svg`,
      defaultHeight: 115
    }, true);
    this.pageAction.build();
  },

  unload() {
    this.pageAction.shutdown();
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
  }
});
