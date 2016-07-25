import localCinemaSC from 'ui/views/local-cinema-sc';
/**
* @namespace ui.views
* @class LocalMovieSc
*/
export default class extends localCinemaSC {
  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  }
}
