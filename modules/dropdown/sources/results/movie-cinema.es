import BaseResult from './base';
import GenericResult from './generic';
import LocalResult from './local';
import utils from '../../core/utils';

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

class MovieInfo extends BaseResult {
  get name() {
    return this.rawResult.name;
  }

  get nVote() {
    return this.rawResult.nVote;
  }
}

class ShowTimeInfo extends BaseResult {
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
    return this.rawResult.row.showtimes.map(showTime => new ShowTimeInfo({
      showTime,
      url: showTime.booking_link,
      text: this.rawResult.text,
    }));
  }
}

class ShowTimeDate extends GenericResult {
  get showDate() {
    return this.rawResult.date;
  }

  get rows() {
    return this.rawResult.rows.map(row => new ShowTimeRow({
      row,
      type: this.rawResult.type,
      text: this.rawResult.text,
    }));
  }
}

export default class MovieCinemaResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    this.showTimesLimit = 2;
    this.maxRowsLimit = 5;
  }

  get template() {
    return 'movie-cinema';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _apiData() {
    return this._extra.data || {};
  }

  get _movieData() {
    return this._apiData.movie || {};
  }

  get _cinemaData() {
    return this._apiData.cinema || {};
  }

  get _richData() {
    return this._extra.rich_data || {};
  }

  get imageUrl() {
    return this._movieData.poster_image_thumbnail || this._richData.image;
  }

  get ratingInfo() {
    const rating = this._richData.rating;

    if (!rating) {
      return null;
    }

    const img = rating.img;
    const score = rating.val;
    const scale = rating.scale;

    if (img && score && scale) {
      return {
        img,
        score: Math.round(score * 10) / 10,
        scale,
      };
    }

    return null;
  }

  get reviewsInfo() {
    const rating = this._richData.rating || {};
    const nVote = rating.nVote;

    if (nVote) {
      return new MovieInfo({
        url: `${this.rawResult.url}/ratings`,
        nVote,
        title: 'cinema-movie-reviews',
      });
    }

    return null;
  }

  get directorInfo() {
    const director = this._richData.director || {};

    if (director.info) {
      return new MovieInfo({
        url: director.info.url,
        title: director.title,
        name: director.info.name,
      });
    }

    return null;
  }

  get trailerInfo() {
    if (!this._richData.categories) {
      return null;
    }

    const trailerResult = this._richData.categories.find(result => result.title === 'Trailer');

    if (trailerResult) {
      return new MovieInfo({
        url: trailerResult.url,
        title: 'cinema-movie-trailer',
      });
    }

    return null;
  }

  get starsInfo() {
    const stars = this._movieData.cast;

    if (stars) {
      return stars.slice(0, 3).map(star => star.name);
    }

    return null;
  }

  get fullCastInfo() {
    return new MovieInfo({
      url: `${this.rawResult.url}/fullcredits`,
      title: 'cinema-movie-full-cast',
    });
  }

  get showTimesInfo() {
    const showDates = this._apiData.showdates;

    if (!showDates) {
      return [];
    }
    const results = showDates.map(date => new ShowTimeDate({
      date: date.date,
      rows: this.isMovieEZ ? date.cinema_list : date.movie_list,
      type: this.isMovieEZ ? 'movie' : 'cinema',
      text: this.query,
    }));

    return results;
  }

  get isShowtimesAvailable() {
    return this.showTimesInfo.length > 0;
  }

  get isMovieEZ() {
    return this.rawResult.data.template === 'movieEZ' ||
           this.rawResult.data.template === 'movie';
  }

  get headerTitle() {
    if (this.isMovieEZ) {
      return this._movieData.title;
    }

    return this._cinemaData.name;
  }

  get cityName() {
    return this._apiData.city;
  }

  get localResult() {
    const cinemaInfo = this._cinemaData;
    if (cinemaInfo.mu && cinemaInfo.address) {
      const result = new LocalResult({
        extra: cinemaInfo,
        text: this.query,
      });

      result.actions = this.actions;
      return result;
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
      title: 'cinema-expand-button',
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
        utils.telemetry(signal);

        this.showTimesLimit = this.maxRowsLimit;
        this.actions.replaceResult(this, this);
      }
    });
  }

  get selectableResults() {
    if (this.isMovieEZ) {
      return [
        ...(this.url ? [this] : []),
        ...(this.shareLocationButtons),
      ];
    }

    return super.selectableResults;
  }

  get allResults() {
    return [
      ...super.allResults,
      ...(this.directorInfo ? [this.directorInfo] : []),
      ...(this.trailerInfo ? [this.trailerInfo] : []),
      ...(this.reviewsInfo ? [this.reviewsInfo] : []),
      this.fullCastInfo,
      ...this.showTimeResults,
      this.expandButton,
    ];
  }

  didRender($dropdown) {
    super.didRender($dropdown);

    $dropdown.querySelectorAll('.movie-cinema .dropdown-tab-label').forEach((label) => {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = $dropdown.querySelector(`#${e.target.getAttribute('for')}`);

        if (!input) {
          return;
        }

        input.checked = 'checked';

        const signal = {
          type: 'results',
          action: 'click',
          view: 'EntityMovie',
          target: 'tab',
          index: e.target.getAttribute('for').substr(4),
        };
        utils.telemetry(signal);
      });
    });
  }
}
