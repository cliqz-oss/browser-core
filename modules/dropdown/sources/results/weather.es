import BaseResult from './base';

export default class WeatherResult extends BaseResult {
  get template() {
    return 'weather';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get todayDate() {
    return this._extra.todayWeekday;
  }

  get today() {
    return {
      date: this._extra.todayWeekday,
      icon: this._extra.todayIcon,
      minTemp: this._extra.todayMinByUnit,
      maxTemp: this._extra.todayMaxByUnit,
    };
  }

  get unitsLabel() {
    return this._extra.units_label;
  }

  get forecast() {
    return this._extra.forecast;
  }


  get allResults() {
    return [
      this,
      ...this.selectableResults,
    ];
  }

  get selectableResults() {
    return [];
  }

  didRender($dropdown) {
    super.didRender($dropdown);
    const celsiusBtn = $dropdown.querySelector('.celsius-btn');
    const fahrenheitBtn = $dropdown.querySelector('.fahrenheit-btn');
    const weatherWrapper = $dropdown.querySelector('.weather .forecast');

    celsiusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      weatherWrapper.classList.remove('fahrenheit-selected');
    });

    fahrenheitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      weatherWrapper.classList.add('fahrenheit-selected');
    });
  }
}
