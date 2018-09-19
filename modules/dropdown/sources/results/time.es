import BaseResult from './base';
import GenericResult from './generic';

class ExpandButton extends BaseResult {
  get displayUrl() {
    return this.rawResult.text;
  }

  get show() {
    return this.rawResult.show;
  }

  click() {
    this.rawResult.onClick();
  }
}

class TimeInfo extends BaseResult {
  get time() {
    return this.rawResult.time;
  }

  get timePeriod() {
    return this.time.split(' ')[1];
  }

  get location() {
    return this.rawResult.location;
  }

  get expression() {
    return this.rawResult.expression;
  }

  get timeZone() {
    return this.rawResult.timeZone;
  }
}

export default class TimeResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    this.rowsLimit = 3;
  }

  get template() {
    return 'time';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _timeInfo() {
    return this._extra.time_data || {};
  }

  get mainResult() {
    const mainData = this._timeInfo.main || {};
    return new TimeInfo({
      time: mainData.time,
      location: mainData.mapped_location,
      expression: mainData.expression,
      timeZone: mainData.tz_info,
    });
  }

  get timezoneResults() {
    const tzData = this._timeInfo.cities_by_tz;

    if (!tzData) {
      return [];
    }

    const data = tzData.map(tz => new TimeInfo({
      time: tz.time_info.time,
      location: tz.cities.join(', '),
      expression: tz.time_info.expression,
      timeZone: tz.time_info.tz_info,
    }));

    return data;
  }

  get expandButton() {
    return new ExpandButton({
      title: 'general_expand_button',
      url: `cliqz-actions,${JSON.stringify({ type: 'time', actionName: 'expand' })}`,
      text: this.rawResult.text,
      show: this.rowsLimit < this.timezoneResults.length,
      onClick: () => {
        const signal = {
          type: 'results',
          action: 'click',
          view: 'EntityTime',
          target: 'show_more',
        };
        this.resultTools.actions.telemetry(signal);

        this.rowsLimit = this.timezoneResults.length;
        this.resultTools.actions.replaceResult(this, this);
      }
    });
  }

  get selectableResults() {
    return [];
  }

  get allResults() {
    return [
      this.expandButton,
    ];
  }
}
