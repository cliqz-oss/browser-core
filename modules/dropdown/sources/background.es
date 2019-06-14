import background from '../core/base/background';
import { closeTabsWithUrl } from '../core/tabs';
import HistoryManager from '../core/history-manager';

export default background({
  init() {
  },

  unload() {
  },

  events: {

  },

  actions: {
    /**
     * Removes a given URL from history.
     *
     * @param {String} url
     * @param {Object} options
     *        {
     *          strict: A boolean indicating if only given URL should be removed.
     * '                When omitted or set to false also removes possible variations of this URL:
     *                  (with or without "http/https", "www.", and trailing slash)
     *          bookmarks: If set to true also removes URL from bookmarks
     *          closeTabs: If set to true also closes all opened tabs with this URL
     *        }
     * @return {Promise} Resolves once URL is removed.
     */
    removeFromHistory(url, options = {}) {
      const { strict, bookmarks, closeTabs } = options;
      const tasks = [
        HistoryManager.removeFromHistory(url, { strict }),
      ];

      if (bookmarks) {
        tasks.push(HistoryManager.removeFromBookmarks(url, { strict }));
      }

      if (closeTabs) {
        tasks.push(closeTabsWithUrl(url, { strict }));
      }

      return Promise.all(tasks);
    }
  },
});
