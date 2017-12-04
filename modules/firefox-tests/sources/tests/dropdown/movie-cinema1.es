/* global it, expect, chai, chai-dom, respondWith, fillIn, window,
    waitForPopup, $cliqzResults, getComputedStyle, CliqzUtils */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from './fixtures/resultsMovieCinema1';

export default function ({ isAskingForGeoConsent }) {
  context('for a movie cinema 1 rich header', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];

    const movieAreaSelector = 'div.movie-cinema';
    let resultElement;
    let movieAreaItem;

    before(function () {
      respondWith({ results });
      fillIn('imdb the circle');
      window.preventRestarts = true;
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        movieAreaItem = resultElement.querySelector(movieAreaSelector);
      });
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('renders parent result', function () {
      let parentMovieItem;

      before(function () {
        parentMovieItem = resultElement.querySelector(movieAreaSelector)
          .closest('div[class=""]').querySelector('a.result');
      });

      it('successfully', function () {
        chai.expect(parentMovieItem).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentMovieTitleSelector = 'div.abstract p span.title';
        const parentMovieTitleItem = parentMovieItem.querySelector(parentMovieTitleSelector);
        chai.expect(parentMovieTitleItem).to.exist;
        chai.expect(parentMovieTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const parentMovieDomainSelector = 'div.abstract p span.url';
        const parentMovieDomainItem = parentMovieItem.querySelector(parentMovieDomainSelector);
        chai.expect(parentMovieDomainItem).to.exist;
        chai.expect(parentMovieDomainItem).to.have.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing and correct link', function () {
        const parentMovieLinkItem = parentMovieItem.href;
        chai.expect(parentMovieLinkItem).to.exist;
        chai.expect(parentMovieLinkItem).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const parentMovieDescSelector = 'div.abstract p span.description';
        const parentMovieDescItem = parentMovieItem.querySelector(parentMovieDescSelector);
        chai.expect(parentMovieDescItem).to.exist;
        chai.expect(parentMovieDescItem).to.have.text(results[0].snippet.description);
      });

      it('with an existing icon', function () {
        const parentMovieIconSelector = 'div.icons span.logo';
        const parentMovieIconItem = parentMovieItem.querySelector(parentMovieIconSelector);
        chai.expect(parentMovieIconItem).to.exist;
      });
    });

    describe('renders movie info area', function () {
      const movieReviewsSelector = 'div.info a.reviews';
      const movieDirectorSelector = 'div.info p.director';
      const movieStarsSelector = 'div.info p.stars > span';
      const movieTrailerSelector = 'div.trailer';
      let movieReviewsItem;
      let movieDirectorItem;
      let movieStarsItems;
      let movieTrailerItem;

      before(function () {
        movieReviewsItem = movieAreaItem.querySelector(movieReviewsSelector);
        movieDirectorItem = movieAreaItem.querySelector(movieDirectorSelector);
        movieStarsItems = movieAreaItem.querySelectorAll(movieStarsSelector);
        movieTrailerItem = movieAreaItem.querySelector(movieTrailerSelector);
      });

      it('successfully', function () {
        chai.expect(movieAreaItem).to.exist;
      });

      it('with existing and correct poster', function () {
        const moviePosterSelector = 'div.movie div.image';
        const moviePosterItem = movieAreaItem.querySelector(moviePosterSelector);
        chai.expect(moviePosterItem).to.exist;
        chai.expect(getComputedStyle(moviePosterItem).backgroundImage)
          .to.contain(results[0].snippet.extra.data.movie.poster_image_thumbnail);
      });

      it('with existing and correct star rating', function () {
        const starRatingSelector = 'div.info span.rating-img';
        const starRatingItem = movieAreaItem.querySelector(starRatingSelector);
        chai.expect(starRatingItem).to.exist;
        chai.expect(getComputedStyle(starRatingItem).backgroundImage)
          .to.contain(results[0].snippet.extra.rich_data.rating.img);
      });

      it('with existing and correct numerical rating', function () {
        const numRatingSelector = 'div.info span.score span';
        const numRatingItems = movieAreaItem.querySelectorAll(numRatingSelector);
        chai.expect(numRatingItems.length).to.equal(2);

        const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;
        chai.expect(numRatingItems[0]).to.have.text(score.toString());
        chai.expect(numRatingItems[1])
          .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
      });

      it('with existing and correct amount of reviews', function () {
        chai.expect(movieReviewsItem).to.exist;
        chai.expect(movieReviewsItem)
          .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
        chai.expect(movieReviewsItem)
          .to.contain.text(locale['cinema-movie-reviews'].message);
      });

      it('with amount of reviews having correct URL', function () {
        chai.expect(movieReviewsItem.href).to.contain(results[0].url);
      });

      it('with existing and correct director info', function () {
        chai.expect(movieDirectorItem.querySelector('span'))
          .to.contain.text(locale['cinema-movie-director'].message);
        chai.expect(movieDirectorItem.querySelector('a'))
          .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
      });

      it('with director info having correct URL', function () {
        chai.expect(movieDirectorItem.querySelector('a').href)
          .to.contain(results[0].snippet.extra.rich_data.director.info.url);
      });

      it('with existing and correct cast info', function () {
        chai.expect(movieStarsItems[0]).to.contain.text(locale['cinema-movie-cast'].message);

        const movieStars = movieStarsItems[1].querySelectorAll('span');
        chai.expect(movieStarsItems[1]).have.class('stars-list');
        chai.expect(movieStars.length).to.equal(results[0].snippet.extra.data.movie.cast.length);
        [...movieStars].forEach(function (star, i) {
          chai.expect(star).to.contain.text(results[0].snippet.extra.data.movie.cast[i].name);
        });
      });

      it('with existing and correct extended cast URL', function () {
        const castUrl = movieStarsItems[2].querySelector('a.result');
        chai.expect(castUrl).to.contain.text(locale['cinema-movie-full-cast'].message);
        chai.expect(castUrl.href).to.contain(results[0].url);
      });

      it('with existing and correct trailer icon', function () {
        const movieTrailerIcon = movieTrailerItem.querySelector('div.trailer-icon');
        chai.expect(movieTrailerIcon).to.exist;
        chai.expect(getComputedStyle(movieTrailerIcon).backgroundImage)
          .to.contain('play-icon-triangle.svg');
      });

      it('with existing and correct trailer URL', function () {
        const movieTrailerUrl = movieTrailerItem.querySelector('a.result').href;
        chai.expect(movieTrailerUrl).to.exist;
        chai.expect(movieTrailerUrl)
          .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
      });

      it('with existing and correct trailer label', function () {
        const movieTrailerLabel = movieTrailerItem.querySelector('a.result span');
        chai.expect(movieTrailerLabel).to.exist;
        chai.expect(movieTrailerLabel).to.contain.text(locale['cinema-movie-trailer'].message);
      });
    });

    (isAskingForGeoConsent ? describe : xdescribe)('renders location buttons', function () {
      const movieLocationSelector = 'div.location';
      const movieLocationButtonSelector = 'div.buttons a.btn.result';
      let movieLocationItem;
      let movieLocationButtonItems;

      before(function () {
        movieLocationItem = movieAreaItem.querySelector(movieLocationSelector);
        movieLocationButtonItems = movieLocationItem
          .querySelectorAll(movieLocationButtonSelector);
      });
      it('successfully', function () {
        chai.expect(movieLocationItem).to.exist;
      });

      it('in correct amount', function () {
        chai.expect(movieLocationButtonItems.length).to.equal(2);
      });

      it('with correct text', function () {
        chai.expect(movieLocationButtonItems[0])
          .to.contain.text(locale['cinema-show-location-and-contact'].message);
        chai.expect(movieLocationButtonItems[1])
          .to.contain.text(locale['cinema-always-show-location'].message);
      });
    });

    describe('renders cinemas and showings table', function () {
      const movieShowingsSelector = 'div.show-time';
      const cinemaRowSelector = 'div.show-time-row';
      const showingTimeSelector = 'div.show-time-info span.show-time-span';
      let movieShowingsItem;
      let cinemaRowItems;
      let showingTimes;

      before(function () {
        movieShowingsItem = movieAreaItem.querySelector(movieShowingsSelector);
        cinemaRowItems = movieShowingsItem.querySelectorAll(cinemaRowSelector);
      });

      it('with existing and correct location info', function () {
        const locationInfoSelector = 'div.title span';
        const locationInfoItem = movieShowingsItem.querySelectorAll(locationInfoSelector);
        chai.expect(locationInfoItem[0]).to.contain.text(locale['cinema-movie-showtimes'].message);
        chai.expect(locationInfoItem[0]).to.contain.text(results[0].snippet.extra.data.movie.title);
        chai.expect(getComputedStyle(locationInfoItem[1].querySelector('span.location-icon')).backgroundImage)
          .to.contain('location-icon.svg');
        chai.expect(locationInfoItem[1]).to.contain.text(results[0].snippet.extra.data.city);
      });

      it('with existing and correct table tabs', function () {
        const cinemaTabsAreaSelector = 'div.dropdown-tabs';
        const cinemaTabsAreaItem = movieShowingsItem.querySelector(cinemaTabsAreaSelector);
        chai.expect(cinemaTabsAreaItem).to.exist;

        const cinemaTabsSelector = 'label.dropdown-tab-label';
        const cinemaTabsItems = cinemaTabsAreaItem.querySelectorAll(cinemaTabsSelector);
        chai.expect(cinemaTabsItems.length)
          .to.equal(results[0].snippet.extra.data.showdates.length);
        [...cinemaTabsItems].forEach(function (tab, i) {
          chai.expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
        });
      });

      it('with the first tab being selected as default', function () {
        const inputTabSelector = 'input.tab-radio-input';
        const inputTabItems = movieShowingsItem.querySelectorAll(inputTabSelector);
        const [
          firstTabItem,
          ...remainingTabItems
        ] = inputTabItems;
        chai.expect(firstTabItem.checked).to.be.true;
        [...remainingTabItems].forEach(function (tab) {
          chai.expect(tab.checked).to.be.false;
        });
      });

      it('with correct amount of cinemas', function () {
        chai.expect(cinemaRowItems.length)
        /* This is hardcoded to max 2 */
          // .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list.length);
          .to.equal(2);
      });

      it('with correct cinema names and addresses', function () {
        const cinemaNameSelector = 'div.cinema-info span';
        [...cinemaRowItems].forEach(function (cinema, i) {
          const cinemaInfo = cinema.querySelectorAll(cinemaNameSelector);
          chai.expect(cinemaInfo[0])
            .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].name);
          chai.expect(cinemaInfo[1].querySelector('span'))
            .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].address);
        });
      });

      it('with correct amount of showings hours', function () {
        [...cinemaRowItems].forEach(function (cinema, i) {
          showingTimes = cinema.querySelectorAll(showingTimeSelector);
          chai.expect(showingTimes.length)
            .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list[i].showtimes.length);
        });
      });

      it('with correct showings booking URLs', function () {
        [...cinemaRowItems].forEach(function (cinema, i) {
          showingTimes = cinema.querySelectorAll(showingTimeSelector);
          [...showingTimes].forEach(function (showing, j) {
            chai.expect(showing.querySelector('a').href)
              .to.equal(results[0].snippet.extra.data.showdates[0]
              .cinema_list[i].showtimes[j].booking_link);
          });
        });
      });

      it('with existing and correct "Show more" item', function () {
        const showMoreSelector = 'a.expand-btn';
        const showMoreItem = movieShowingsItem.querySelector(showMoreSelector);
        chai.expect(showMoreItem).to.exist;
        chai.expect(showMoreItem).to.have.text(locale['cinema-expand-button'].message);
        chai.expect(showMoreItem.href).to.exist;
      });
    });
  });
}
