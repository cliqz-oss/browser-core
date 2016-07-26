import localCinemaSC from 'ui/views/local-cinema-sc';

export default class extends localCinemaSC {
  enhanceResults(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  }
}
