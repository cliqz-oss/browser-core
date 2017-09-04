/**
 * Class for storing visit history { domain: timestamp_of_last_visit }
 */
import LRU from '../../core/LRU';
import { MAMetrics } from '../model/ma_signal';
import logger from './logger';

class SessionChecker {
  constructor() {
    // mapping from domain to timestamp of the latest visit
    this.domainToLastVisit = new LRU(1000);
  }

  /**
   * check if an impression on a given (domain, metric, date) is a new session or not
   * a session: x-minute inactivity on a particular (domain, metric) or browser is closed
   * @param {string} domain        tldomain (registered domain)
   * @param {string} metric        session-based metric
   * @param {Date}   visitDate
   * @returns {boolean}
   */
  isNewSession(domain, metric, visitDate) {
    const key = domain + metric;
    const lastVisitTime = this.domainToLastVisit.get(key);
    this.domainToLastVisit.set(key, visitDate.getTime());
    if (lastVisitTime) {
      const diffSeconds = (visitDate.getTime() - lastVisitTime) / 1000;
      switch (metric) {
        case MAMetrics.VISIT:
        case MAMetrics.REGISTRATION:
        case MAMetrics.SHOPPING:
        case MAMetrics.CHECKOUT:
        case MAMetrics.TRANSACTION: {
          // 30-minute session
          return diffSeconds >= 1800;
        }
        case MAMetrics.IMP: {
          return true;
        }

        default: {
          logger.error(`Unrecognized metric: ${metric}`);
          break;
        }
      }
      return false;
    }
    return true;
  }
}

export default SessionChecker;
