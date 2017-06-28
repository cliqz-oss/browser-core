import { MATimeFrames } from './ma_signal';
import prefs from '../../core/prefs';

/**
 * Class representing different time frames for a particular date
 */
class TimeFrames {
  constructor(date) {
    const daysDiff = (date - new Date(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
    this.dayOfYear = Math.floor(daysDiff);
    this.month = date.getMonth() + 1; // month in JS starts from zero

    const d = new Date(+date);
    d.setHours(0, 0, 0, 0);
    d.setDate((d.getDate() + 4) - (d.getDay() || 7));
    this.weekOfYear = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 8.64e7) + 1) / 7);
  }

  /**
   * get a new TimeFrames object representing today
   * @return {TimeFrames}
   */
  static fromToday() {
    const serverDateStr = prefs.get('config_ts', null);
    if (serverDateStr) {
      const year = Number(serverDateStr.substr(0, 4));
      const month = Number(serverDateStr.substr(4, 2));
      const day = Number(serverDateStr.substr(6, 2));
      return new TimeFrames(new Date(year, month - 1, day, 1));
    }
    return new TimeFrames(new Date());
  }

  /**
   * get time frame value`
   * @param  {MATimeFrames} tf
   * @return {Number}
   */
  getTFValue(tf) {
    switch (tf) {
      case MATimeFrames.DAY_OF_YEAR: return this.dayOfYear;
      case MATimeFrames.WEEK_OF_YEAR: return this.weekOfYear;
      case MATimeFrames.MONTH: return this.month;
      default: return undefined;
    }
  }
}

export default TimeFrames;
