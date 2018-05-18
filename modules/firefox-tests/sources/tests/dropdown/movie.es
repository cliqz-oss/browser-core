/* global window */

import {
  blurUrlBar,
  CliqzUtils,
  checkMainResult,
  checkParent,
  $cliqzResults,
  expect,
  fillIn,
  getComputedStyle,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsMovie';

export default function () {
  describe('for movie SC result', function () {
    const mainResultSelector = '.cliqz-result:not(.history)';
    const movieAreaSelector = '.movie-cinema';
    const moviePosterSelector = '.image';
    const starRatingSelector = '.rating-img';
    const numRatingScoreSelector = '.score .movie-rating-score';
    const numRatingScaleSelector = '.score .movie-rating-scale';
    const reviewsSelector = '.reviews';
    const directorLabelSelector = '.director .movie-director-label';
    const directorSelector = '.director .result';
    const starLabelSelector = '.stars .movie-stars-label';
    const starSelector = '.stars .stars-list .result';
    const extendedCastSelector = '.stars .movie-full-cast .result';
    const trailerSelector = '.trailer .result';
    const trailerIconSelector = '.trailer-icon';
    const trailerLabelSelector = '.movie-trailer-label';

    const query = 'imdb the circle';
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];

    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn(query);
      return waitForPopup(2);
    });

    after(function () {
      window.preventRestarts = false;
      blurUrlBar();
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });

    context('renders movie info area', function () {
      it('successfully', function () {
        const $movieArea = $cliqzResults.querySelector(`${mainResultSelector} ${movieAreaSelector}`);
        expect($movieArea).to.exist;
      });

      it('with an existing and correct poster', function () {
        const $moviePoster = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${moviePosterSelector}`);

        expect($moviePoster).to.exist;
        expect(getComputedStyle($moviePoster).backgroundImage)
          .to.contain(results[0].snippet.extra.rich_data.image);
      });

      it('with an existing and correct star rating', function () {
        const $starRating = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${starRatingSelector}`);

        expect($starRating).to.exist;
        expect(getComputedStyle($starRating).backgroundImage)
          .to.contain(results[0].snippet.extra.rich_data.rating.img);
      });

      it('with an existing and correct numerical rating', function () {
        const $numRatingScore = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${numRatingScoreSelector}`);
        const $numRatingScale = $cliqzResults

          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${numRatingScaleSelector}`);
        const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;

        expect($numRatingScore).to.exist;
        expect($numRatingScore).to.have.text(score.toString());
        expect($numRatingScale)
          .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
      });

      it('with an existing and correct amount of reviews', function () {
        const $reviews = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${reviewsSelector}`);

        expect($reviews).to.exist;
        expect($reviews)
          .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
        expect($reviews).to.contain.text(locale.cinema_movie_reviews.message);
        expect($reviews.href).to.exist;
        expect($reviews.href).to.contain(results[0].url);
      });

      it('with an existing and correct director info', function () {
        const $directorLabel = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${directorLabelSelector}`);
        const $director = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${directorSelector}`);

        expect($directorLabel).to.exist;
        expect($directorLabel)
          .to.contain.text(locale.cinema_movie_director.message);
        expect($director).to.exist;
        expect($director)
          .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
        expect($director.href).to.exist;
        expect($director.href)
          .to.contain(results[0].snippet.extra.rich_data.director.info.url);
      });

      it('with an existing and correct cast info', function () {
        const $starLabel = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${starLabelSelector}`);
        const $allStars = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${movieAreaSelector} ${starSelector}`);

        expect($starLabel).to.exist;
        expect($starLabel).to.contain.text(locale.cinema_movie_cast.message);
        expect($allStars.length).to.equal(results[0].snippet.extra.rich_data.cast.length);
        [...$allStars].forEach(function ($star, i) {
          expect($star).to.contain.text(results[0].snippet.extra.rich_data.cast[i].name);
          expect($star.href).to.exist;
          expect($star.href).to.contain(results[0].snippet.extra.rich_data.cast[i].url);
        });
      });

      it('with an existing and correct URL for extended cast', function () {
        const $extendedCast = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${extendedCastSelector}`);

        expect($extendedCast).to.exist;
        expect($extendedCast).to.contain.text(locale.cinema_movie_full_cast.message);
        expect($extendedCast.href).to.exist;
        expect($extendedCast.href).to.contain(results[0].url);
      });

      it('with an existing and correct trailer icon', function () {
        const $trailerIcon = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${trailerIconSelector}`);

        expect($trailerIcon).to.exist;
        expect(getComputedStyle($trailerIcon).backgroundImage)
          .to.contain('play-icon-triangle.svg');
      });

      it('with an existing and correct trailer info', function () {
        const $trailer = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${trailerSelector}`);
        const $trailerLabel = $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${trailerLabelSelector}`);

        expect($trailerLabel).to.exist;
        expect($trailerLabel).to.contain.text(locale.cinema_movie_trailer.message);
        expect($trailer).to.exist;
        expect($trailer.href).to.exist;
        expect($trailer.href)
          .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
      });
    });
  });
}
