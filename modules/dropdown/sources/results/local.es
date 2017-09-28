import BaseResult from './base';
import console from '../../core/console';
import utils from '../../core/utils';

class LocalInfoResult extends BaseResult {
  get mapImg() {
    return this.rawResult.mapImg;
  }
}

class TextResult extends BaseResult {

  get textType() {
    return this.rawResult.textType;
  }

  get displayText() {
    return this.rawResult.text;
  }

  click(window, href, ev) {
    this.actions.copyToClipboard(this.rawResult.text);
    const el = ev.target;
    el.classList.add('copied');
    setTimeout(() => {
      el.classList.remove('copied');
    }, 1000);
  }
}

export class ShareLocationButton extends BaseResult {

  get elementId() {
    if (!this._elementId) {
      const id = Math.floor(Math.random() * 1000);
      this._elementId = `result-share-location-${id}`;
    }
    return this._elementId;
  }

  get displayUrl() {
    return this.rawResult.text;
  }

  get className() {
    return this.rawResult.className;
  }

  get elementClassName() {
    return this.rawResult.className;
  }

  didRender(dropdownElement) {
    this.element = dropdownElement.querySelector(`#${this.elementId}`);
    this.spinner = dropdownElement.ownerDocument.createElement('div');
    this.spinner.className = 'spinner';
  }

  click(window, href) {
    this.element.appendChild(this.spinner);

    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const locationAssistant = this.actions.locationAssistant;
    const actionName = action.actionName;
    if (!locationAssistant.hasAction(actionName)) {
      return;
    }
    locationAssistant[actionName]().then(() => {
      this.rawResult.onButtonClick();
    }).catch(console.error);
  }
}


export default class LocalResult extends BaseResult {
  get extra() {
    return this.rawResult.extra || {};
  }

  get address() {
    const address = this.extra.address || '';

    if (!address) {
      return null;
    }

    const addressResult = new TextResult({
      url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyAddress' })}`,
      text: address,
      textType: 'local-address',
    });
    addressResult.actions = this.actions;

    return addressResult;
  }

  get phoneNumber() {
    const phone = this.extra.phonenumber || '';

    if (!phone) {
      return null;
    }

    const phoneResult = new TextResult({
      url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyPhoneNumber' })}`,
      text: phone,
      textType: 'local-phone',
    });
    phoneResult.actions = this.actions;

    return phoneResult;
  }

  get mapImg() {
    return this.extra.map_img || '';
  }

  get mapUrl() {
    return this.extra.mu || '';
  }

  get allResults() {
    return [
      this.mapResult,
      ...this.textResults,
    ];
  }

  get mapResult() {
    return new LocalInfoResult({
      url: this.mapUrl,
      title: 'show-map',
      text: this.rawResult.text,
      mapImg: this.mapImg,
    });
  }

  get textResults() {
    if (!this._textResults) {
      this._textResults = [];
      if (this.address) {
        this._textResults.push(this.address);
      }

      if (this.phoneNumber) {
        this._textResults.push(this.phoneNumber);
      }
    }

    return this._textResults;
  }

  get distance() {
    if (this.extra.lat && this.extra.lon) {
      const distance = utils.distance(this.extra.lon, this.extra.lat) * 1000;
      if (distance > -1) {
        return distance;
      }
    }

    return null;
  }

  get ratingImg() {
    const rating = this.extra.rating;
    if (!rating) {
      return null;
    }

    const ratingStars = Math.max(0, Math.min(Math.round(rating), 5));
    return `https://cdn.cliqz.com/extension/EZ/richresult/stars${ratingStars}.svg`;
  }

  parseTime(timeStr) {  // e.g. timeStr: 10.30
    const time = timeStr.split('.');
    return {
      hours: parseInt(time[0], 10) || 0,
      minutes: parseInt(time[1], 10) || 0,
    };
  }

  get openingStatus() {
    const openingHours = this.extra.opening_hours;
    if (!openingHours) {
      return null;
    }

    const OPENING_COLORS = {
      open: '#A6A6A6',
      closed: '#E64C66',
      open_soon: '#A6A6A6',
      close_soon: '#E64C66',
    };

    let openStatus;
    const timeInfos = [];

    openingHours.filter(el => el.open && el.close)
      .forEach((el) => {
        if (openStatus && openStatus !== 'closed') {
          return;
        }

        timeInfos.push(`${el.open.time.replace('.', ':')}—${el.close.time.replace('.', ':')}`);

        const openTime = this.parseTime(el.open.time);
        const closeTime = this.parseTime(el.close.time);
        const closesNextDay = el.close.day !== el.open.day;
        /** Difference in minutes from opening/closing times to current time **/
        const t = new Date();
        const minutesFrom = {
          opening: (60 * (t.getHours() - openTime.hours))
                    + (t.getMinutes() - openTime.minutes),
          /* If it closes the next day, we need to subtract 24 hours from the hour difference */
          closing: (60 * (t.getHours() - closeTime.hours - (closesNextDay ? 24 : 0)))
                    + (t.getMinutes() - closeTime.minutes),
        };

        if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
          openStatus = 'open';
          if (minutesFrom.closing > -60) {
            openStatus = 'close_soon';
          }
        } else {
          openStatus = 'closed';
          if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
            openStatus = 'open_soon';
          }
        }
      });

    if (openStatus) {
      return {
        color: OPENING_COLORS[openStatus],
        sttText: openStatus,
        timeInfo: timeInfos.join(', '),
      };
    }

    return null;
  }
}
