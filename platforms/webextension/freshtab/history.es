import { chrome } from '../globals';

const CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {Number} limit of results
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls() {
    if (chrome.cliqzHistory) {
      return chrome.cliqzHistory.topDomains();
    }

    return new Promise(resolve => chrome.topSites.get(resolve));
  }
};

export function getDomains() {
  const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;
  return new Promise(resolve =>
    chrome.history.search({
      text: '',
      startTime: Date.now() - ONE_MONTH,
      endTime: Date.now(),
      maxResults: 1000
    }, items => resolve(
      items.map(item => ({
        last_visit_date: item.lastVisitTime * 1000, // it expects microseconds
        visit_count: item.visitCount,
        ...item
      }))
    )));
}

export function isURLVisited(url) {
  return new Promise(resolve =>
    chrome.history
      .getVisits({ url }, visits => resolve(visits.length > 0)));
}

export default CliqzFreshTabHistory;
