import { chrome } from '../globals'
var CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {Number} limit of results
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls(limit) {
    return new Promise(function (resolve) {
      return chrome.topSites.get(resolve);
    })

  }
};

export default CliqzFreshTabHistory;
