import { chrome } from '../globals';

const CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {Number} limit of results
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls() {
    return new Promise(resolve => chrome.topSites.get(resolve));
  }
};

export default CliqzFreshTabHistory;
