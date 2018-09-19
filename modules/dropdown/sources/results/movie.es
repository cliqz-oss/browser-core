import { Subresult } from './base';
import GenericResult from './generic';
import { MOVIE_INFO_RESULT } from '../result-types';

class MovieInfo extends Subresult {
  type = MOVIE_INFO_RESULT;

  get name() {
    return this.rawResult.name;
  }

  get nVote() {
    return this.rawResult.nVote;
  }
}

export default class MovieResult extends GenericResult {
  get template() {
    return 'movie';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _richData() {
    return this._extra.rich_data || {};
  }

  get imageUrl() {
    return this._richData.image;
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

  // TODO: remove this and replace by new data from big machine
  get reviewsInfo() {
    const rating = this._richData.rating || {};
    const nVote = rating.nVote;

    if (nVote) {
      return new MovieInfo(this, {
        url: rating.url,
        nVote,
        title: 'cinema_movie_reviews',
      });
    }

    return null;
  }

  get directorInfo() {
    const director = this._richData.director || {};

    if (director.info) {
      return new MovieInfo(this, {
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
      return new MovieInfo(this, {
        url: trailerResult.url,
        title: 'cinema_movie_trailer',
      });
    }

    return null;
  }

  get starsInfo() {
    const cast = this._richData.cast || {};

    if (cast.length) {
      return cast.slice(0, 3).map(star => new MovieInfo(this, {
        url: star.url,
        title: star.name,
      }));
    }

    return null;
  }

  get fullCastInfo() {
    const fullCastUrl = this._richData.full_cast;

    if (fullCastUrl) {
      return new MovieInfo(this, {
        url: fullCastUrl,
        title: 'cinema_movie_full_cast',
      });
    }

    return null;
  }

  get allResults() {
    return [
      ...super.allResults,
      ...(this.directorInfo ? [this.directorInfo] : []),
      ...(this.trailerInfo ? [this.trailerInfo] : []),
      ...(this.reviewsInfo ? [this.reviewsInfo] : []),
      ...(this.starsInfo ? this.starsInfo : []),
      ...(this.fullCastInfo ? [this.fullCastInfo] : []),
    ];
  }
}
