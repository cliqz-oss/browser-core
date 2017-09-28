import BaseResult from './base';

export default class VideoResult extends BaseResult {
  get videoViews() {
    return this.rawResult.views;
  }

  secondsToDuration(s) {
    if (!s) {
      return null;
    }

    const date = new Date(null);
    date.setSeconds(s);
    let result = date.toISOString().substr(11, 8);
    if (result.indexOf('00:') === 0) {
      result = result.substr(3, 5);
    }

    return result;
  }

  get duration() {
    return this.secondsToDuration(this.rawResult.duration);
  }

  get thumbnail() {
    return this.rawResult.thumbnail;
  }

  get logo() {
    return null;
  }
}
