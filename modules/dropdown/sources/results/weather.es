import BaseResult, { Subresult } from './base';
import { INTERNAL_RESULT } from '../result-types';

const getCoordinates = (values, labels, width, height) => {
  const min = Math.floor(Math.min(...values) * 0.95);
  const max = Math.ceil(Math.max(...values) * 1.05);

  const yRatio = (max - min) / height;
  const xRatio = width / (values.length - 2);
  return values.map((value, i) => ({
    x: (xRatio * i) - (xRatio / 2),
    y: height - ((value - min) / yRatio),
    label: labels[i],
  }));
};

class InternalResult extends Subresult {
  type = INTERNAL_RESULT;
}

export default class WeatherResult extends BaseResult {
  constructor(...args) {
    super(...args);
    this.currentDay = 0;
    this.currentSelection = 'temperature';
    const userSelectedUnit = localStorage && localStorage.getItem('weatherSCSelectedUnit');
    this.currentUnit = userSelectedUnit || this._main.default_unit;
  }

  get template() {
    return 'weather';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _main() {
    return this._extra.forecast_v2 || {};
  }

  get selectableResults() {
    return [
      ...this.internalResults,
    ];
  }

  get allResults() {
    return [
      this.sourceWrapper,
      this.hourlyForecast,
      this,
      ...this.selectableResults,
    ];
  }

  get _forecast() {
    return this._main.forecast || [];
  }

  get days() {
    return this._forecast.map((item, idx) => ({
      weekday: item.day.weekday,
      icon: item.day.icon,
      date: item.day.date,
      temperature: item.day.temperature[this.currentUnit],
      description: item.day.description,
      isActive: this.currentDay === idx,
      tempIsThreeDigits: item.day.temperature[this.currentUnit].value < -9
      || item.day.temperature[this.currentUnit].value > 99,
    }));
  }

  get currentPartial() {
    return `partials/weather/${this.currentSelection}`;
  }

  get _hourly() {
    return (this._forecast[this.currentDay] || {}).hourly || {};
  }

  get timeArr() {
    return (this._hourly.times || []).filter((item, idx) => idx % 3 === 1);
  }

  get temperature() {
    const temperature = this._hourly.temperature || {};
    const temperatureValues = (temperature[this._main.default_unit] || {}).values;
    if (!temperatureValues) {
      return null;
    }
    const WIDTH = 584;
    const HEIGHT = 80;
    const temperatureLabels = (temperature[this.currentUnit] || {}).values;
    const svgData = getCoordinates(temperatureValues, temperatureLabels, WIDTH, HEIGHT - 20);
    const svgTexts = [];
    let svgLine = '';
    svgData.forEach((coordinate, idx) => {
      if (idx % 3 === 1) {
        svgTexts.push({
          x: coordinate.x - 2,
          y: coordinate.y - 5,
          text: `${coordinate.label}\u00b0`,
        });
      }

      const command = idx === 0 ? 'M' : 'L';
      svgLine = `${svgLine} ${command} ${coordinate.x},${coordinate.y}`;
    });
    const svgArea = `${svgLine} L${svgData[svgData.length - 1].x},${HEIGHT} L${svgData[0].x},${HEIGHT} z`;

    return {
      svgTexts,
      svgLine,
      svgArea,
    };
  }

  get precipitation() {
    const precipitationValues = (this._hourly.precipitation || {}).values;
    if (!precipitationValues) {
      return [];
    }
    return precipitationValues.reduce((filtered, item, idx) => {
      const temp = { height: item };
      if (idx % 3 === 1) {
        temp.text = `${item}%`;
      }
      filtered.push(temp);
      return filtered;
    }, []);
  }

  get wind() {
    const wind = this._hourly.wind || {};
    const windValues = (wind[this._main.default_unit] || {}).values;
    if (!windValues) {
      return [];
    }
    const windAngles = wind.angles.map(angle => angle - 90);
    const windUnit = wind[this.currentUnit].unit;
    const windLabels = (wind[this.currentUnit] || {}).values;

    const filtered = [];
    for (let i = 0; i < windValues.length; i += 1) {
      if (i % 3 === 1) {
        const size = Math.min(Math.ceil((0.3 * windValues[i] + 10) / 4) * 4, 40);
        filtered.push({
          size,
          value: `${windLabels[i]}${windUnit}`,
          angle: windAngles[i],
        });
      }
    }
    return filtered;
  }

  get selectionButtons() {
    return ['temperature', 'wind', 'precipitation'].map(id => ({
      id,
      text: this._hourly[id].label,
      isActive: id === this.currentSelection,
    }));
  }

  get unitButtons() {
    return [this._main.default_unit, this._main.alt_unit].map(id => ({
      id,
      isActive: id === this.currentUnit,
    }));
  }

  get otherInfo() {
    const currentDay = (this._forecast[this.currentDay] || {}).day;
    if (!currentDay) {
      return null;
    }

    return {
      precipitation: currentDay.precipitation,
      humidity: currentDay.humidity,
      wind: {
        label: currentDay.wind.label,
        value: currentDay.wind[this.currentUnit].value,
        unit: currentDay.wind[this.currentUnit].unit,
      },
      uv: currentDay.uv,
    };
  }

  get sourceWrapper() {
    const providerUrl = (this._main.provider || {}).url;
    return new Subresult(this, {
      url: providerUrl,
      title: 'source',
      text: this.query,
      meta: this.rawResult.meta,
    });
  }

  get hourlyForecast() {
    const forecastUrl = this._main.hourly_forecast_url || 'https://cliqz.com';
    return new Subresult(this, {
      url: forecastUrl,
      title: '',
      text: this.query,
    });
  }

  get internalResults() {
    const weatherBtnTitle = this._main.forecast_description;
    // TODO: deduplicate ?
    return [
      new InternalResult(this, {
        url: this.url,
        title: weatherBtnTitle,
        text: this.query,
        meta: this.rawResult.meta,
      })
    ];
  }

  didRender($dropdown) {
    super.didRender($dropdown);

    this.selectionButtons.forEach(({ id }) => {
      const element = $dropdown.querySelector(`#${id}`);
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target.id;
        if (target && target !== this.currentSelection) {
          this.currentSelection = target;
          this.resultTools.actions.replaceResult(this, this);
        }
      });
    });

    this.unitButtons.forEach(({ id }) => {
      const element = $dropdown.querySelector(`#${id}`);
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target.id;
        if (target && target !== this.currentUnit) {
          this.currentUnit = target;
          if (localStorage) {
            localStorage.setItem('weatherSCSelectedUnit', target);
          }
          this.resultTools.actions.replaceResult(this, this);
        }
      });
    });

    const days = $dropdown.querySelectorAll('.forecast .day');
    for (let i = 0; i < days.length; i += 1) {
      days[i].addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (i !== this.currentDay) {
          this.currentDay = i;
          this.resultTools.actions.replaceResult(this, this);
        }
      });
    }
  }
}
