import { Subresult } from './base';
import { setTimeout } from '../../core/timers';

class LocalInfoResult extends Subresult {
  get mapImg() {
    return this.rawResult.mapImg;
  }
}

class TextResult extends Subresult {
  get textType() {
    return this.rawResult.textType;
  }

  get displayText() {
    return this.rawResult.text;
  }

  click(href, ev) {
    this.resultTools.actions.copyToClipboard(this.rawResult.text);
    const el = ev.target;
    el.classList.add('copied');
    setTimeout(() => {
      el.classList.remove('copied');
    }, 1000);
  }
}

export class ShareLocationButton extends Subresult {
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
    super.didRender(dropdownElement); // TODO @mai do we need this?

    this.element = dropdownElement.querySelector(`#${this.elementId}`);
    this.spinner = dropdownElement.ownerDocument.createElement('div');
    this.spinner.className = 'spinner';
  }

  click(href) {
    this.element.appendChild(this.spinner);

    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const actionName = action.actionName;

    const signal = {
      type: 'results',
      action: 'click',
      view: 'local',
    };
    if (actionName === 'allowOnce') {
      signal.target = 'share_location_once';
      this.resultTools.actions.telemetry(signal);
    } else if (actionName === 'allow') {
      signal.target = 'share_location_always';
      this.resultTools.actions.telemetry(signal);
    }

    this.rawResult.onButtonClick(actionName);
  }
}


export default class LocalResult extends Subresult {
  get extra() {
    return this.rawResult.extra || {};
  }

  get address() {
    const address = this.extra.address || '';

    if (!address) {
      return null;
    }

    return new TextResult(this, {
      url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyAddress' })}`,
      text: address,
      textType: 'local-address',
    });
  }

  get phoneNumber() {
    const phone = this.extra.phonenumber || '';

    if (!phone) {
      return null;
    }

    return new TextResult(this, {
      url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyPhoneNumber' })}`,
      text: phone,
      textType: 'local-phone',
    });
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
    return new LocalInfoResult(this, {
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
    return this.extra.distance;
  }

  get ratingImg() {
    const rating = this.extra.rating;
    if (!rating) {
      return null;
    }

    const ratingStars = Math.max(0, Math.min(Math.round(rating), 5));
    return `${this.resultTools.assistants.settings.CDN_BASEURL}/extension/EZ/richresult/stars${ratingStars}.svg`;
  }

  parseTime(timeStr) { // e.g. timeStr: 10.30
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

        timeInfos.push(`${el.open.time.replace('.', ':')}-${el.close.time.replace('.', ':')}`);

        const openTime = this.parseTime(el.open.time);
        const closeTime = this.parseTime(el.close.time);
        const t = new Date();
        const minutes = {
          opening: (60 * openTime.hours) + openTime.minutes,
          closing: (60 * closeTime.hours) + closeTime.minutes,
        };

        const now = (60 * t.getHours()) + t.getMinutes();

        openStatus = 'closed';

        if (minutes.opening < minutes.closing) {
          if (minutes.opening <= now && now <= (minutes.closing - 60)) {
            openStatus = 'open';
          }

          if ((minutes.closing - 60) < now && now < minutes.closing) {
            openStatus = 'close_soon';
          }
        } else {
          if (minutes.opening <= now || (minutes.closing - 60) >= now) {
            openStatus = 'open';
          }

          if (minutes.closing > now && now > (minutes.closing - 60)) {
            openStatus = 'close_soon';
          }
        }

        const difference = (((minutes.opening - now) % 1440) + 1440) % 1440;
        if (difference < 60) {
          openStatus = 'open_soon';
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
