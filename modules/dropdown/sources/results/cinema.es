import BaseResult, { Subresult } from './base';
import GenericResult from './generic';
import LocalResult from './local';

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

class ShowTimeInfo extends Subresult {
  get displayTime() {
    return this.rawResult.showTime.start_at.substr(11, 5);
  }

  get is3D() {
    return this.rawResult.showTime.is_3d;
  }

  get movieLanguage() {
    return this.rawResult.showTime.language;
  }
}

class ShowTimeRow extends GenericResult {
  get resultType() {
    return this.rawResult.type;
  }

  get cinemaInfo() {
    if (this.resultType === 'movie') {
      return {
        name: this.rawResult.row.name,
        distance: this.rawResult.row.distance ? this.rawResult.row.distance : null,
        address: this.rawResult.row.address,
      };
    }

    return null;
  }

  get movieInfo() {
    if (this.resultType === 'cinema') {
      return {
        title: this.rawResult.row.title || '',
      };
    }

    return null;
  }

  get showTimes() {
    return this.rawResult.row.showtimes.map(showTime => new ShowTimeInfo(this, {
      showTime,
      url: showTime.booking_link,
      text: this.rawResult.text,
    }), this.resultTools);
  }
}

class ShowTimeDate extends GenericResult {
  get showDate() {
    return this.rawResult.date;
  }

  get isCurrent() {
    return this.rawResult.isCurrent;
  }

  get rows() {
    return this.rawResult.rows.map(
      row => new ShowTimeRow({
        row,
        type: this.rawResult.type,
        text: this.rawResult.text,
      }, this.resultTools)
    );
  }
}

export default class CinemaResult extends GenericResult {
  showTimesLimit = 2;

  maxRowsLimit = 5;

  get template() {
    return 'cinema';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _apiData() {
    return this._extra.data || {};
  }

  get _cinemaData() {
    return this._apiData.cinema || {};
  }

  get _richData() {
    return this._extra.rich_data || {};
  }

  get showTimesInfo() {
    const showDates = this._apiData.showdates;

    if (!showDates) {
      return [];
    }
    const results = showDates.map(
      (date, index) => new ShowTimeDate({
        date: date.date,
        rows: this.isMovieEZ ? date.cinema_list : date.movie_list,
        type: this.isMovieEZ ? 'movie' : 'cinema',
        text: this.query,
        isCurrent: this.currentTab !== undefined ? this.currentTab === index : index === 0,
      }, this.resultTools)
    );

    return results;
  }

  get isShowtimesAvailable() {
    return this.showTimesInfo.length > 0;
  }

  get isMovieEZ() {
    return this.rawResult.data.template === 'movie-showtimes';
  }

  get headerTitle() {
    if (this.isMovieEZ) {
      return this._apiData.title;
    }

    return this._cinemaData.name;
  }

  get cityName() {
    return this._apiData.city;
  }

  get localResult() {
    const cinemaInfo = this._cinemaData;
    if (cinemaInfo.mu && cinemaInfo.address) {
      return new LocalResult(this, {
        extra: cinemaInfo,
        text: this.query,
      });
    }

    return null;
  }

  get shareLocationButtonsWrapper() {
    return {
      ...super.shareLocationButtonsWrapper,
      localePrefix: 'cinema',
    };
  }

  get showTimeResults() {
    const results = this.showTimesInfo
      .map(date => date.rows.map(row => row.showTimes))
      .reduce((arr, el) => [...arr, ...el], [])
      .reduce((arr, el) => [...arr, ...el], []);

    return results;
  }

  get expandButton() {
    return new ExpandButton({
      title: 'general_expand_button',
      url: `cliqz-actions,${JSON.stringify({ type: 'cinema', actionName: 'expand' })}`,
      text: this.rawResult.text,
      show: this.showTimesLimit < this.maxRowsLimit,
      onClick: () => {
        const signal = {
          type: 'results',
          action: 'click',
          view: 'EntityMovie',
          target: 'show_more',
        };
        this.resultTools.actions.telemetry(signal);

        this.showTimesLimit = this.maxRowsLimit;
        this.resultTools.actions.replaceResult(this, this);
      }
    }, this.resultTools);
  }

  get selectableResults() {
    if (this.isMovieEZ) {
      return [
        ...(this.shareLocationButtons),
      ];
    }

    return super.selectableResults;
  }

  get allResults() {
    return [
      ...super.allResults,
      ...this.showTimeResults,
      this.expandButton,
    ];
  }

  didRender($dropdown) {
    super.didRender($dropdown);
    const $allLabels = $dropdown.querySelectorAll('.movie-cinema .dropdown-tab');
    $allLabels.forEach((label) => {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        [...$allLabels].forEach(l => l.classList.remove('checked'));
        e.target.classList.add('checked');
        const tabIndex = [...$allLabels].indexOf(e.target);

        this.currentTab = tabIndex;

        const signal = {
          type: 'results',
          action: 'click',
          view: 'EntityMovie',
          target: 'tab',
          index: tabIndex,
        };
        this.resultTools.actions.updateHeight();
        this.resultTools.actions.telemetry(signal);
      });
    });
  }
}
