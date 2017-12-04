/* global it, context, respondWith, fillIn, window,
    waitForPopup, $cliqzResults, getComputedStyle, CliqzUtils */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-undef: 'off'*/

import results from './fixtures/resultsMovieCinema2';

export default function () {
  context('for a movie cinema 2 rich header', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    const cinemaAreaSelector = 'div.movie-cinema';
    let resultElement;
    let cinemaAreaItem;

    before(function () {
      respondWith({ results });
      fillIn('yorck.de');
      window.preventRestarts = true;
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        cinemaAreaItem = resultElement.querySelector(cinemaAreaSelector);
      });
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('renders parent result', function () {
      let parentMovieItem;

      before(function () {
        parentMovieItem = resultElement.querySelector(cinemaAreaSelector)
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

    describe('renders cinema map info', function () {
      const cinemaLocalSelector = 'div.local-result-wrapper';
      const cinemaAddressSelector = 'div.local-address';
      let cinemaLocalItem;
      let cinemaAddressItem;

      before(function () {
        cinemaLocalItem = cinemaAreaItem.querySelector(cinemaLocalSelector);
        cinemaAddressItem = cinemaAreaItem.querySelector(cinemaAddressSelector);
      });

      it('successfully', function () {
        chai.expect(cinemaLocalItem).to.exist;
      });

      it('with existing map icon with correct URL', function () {
        const cinemaMapSelector = 'a.local-map';
        const cinemaMapItem = cinemaLocalItem.querySelector(cinemaMapSelector);
        chai.expect(cinemaMapItem).to.exist;
        chai.expect(decodeURIComponent(cinemaMapItem.href))
          .to.equal(results[0].snippet.extra.data.cinema.mu);
      });

      it('with existing and correct address', function () {
        chai.expect(cinemaAddressItem).to.exist;
        chai.expect(cinemaAddressItem)
        .to.contain.text(results[0].snippet.extra.data.cinema.address);
      });

      it('with existing and correct distance', function () {
        const distance = (results[0].snippet.extra.data.cinema.distance / 1000).toFixed(1);
        chai.expect(cinemaAddressItem).to.contain.text(distance);
      });

      it('with existing and correct phone number', function () {
        const cinemaPhoneSelector = 'div.local-phone';
        const cinemaPhoneItem = cinemaAreaItem.querySelector(cinemaPhoneSelector);
        chai.expect(cinemaPhoneItem)
          .to.contain.text(results[0].snippet.extra.data.cinema.phonenumber);
      });
    });

    describe('renders cinema and movies table', function () {
      const cinemaMoviesSelector = 'div.show-time';
      const moviesRowSelector = 'div.show-time-row';
      const movieTimeSelector = 'div.show-time-info span.show-time-span';
      let cinemaMoviesItem;
      let moviesRowItems;
      let movieTimes;

      before(function () {
        cinemaMoviesItem = cinemaAreaItem.querySelector(cinemaMoviesSelector);
        moviesRowItems = cinemaMoviesItem.querySelectorAll(moviesRowSelector);
      });

      it('with existing and correct location info', function () {
        const locationInfoSelector = 'div.title span';
        const locationInfoItem = cinemaMoviesItem.querySelectorAll(locationInfoSelector);
        chai.expect(locationInfoItem[0]).to.contain.text(locale['cinema-movie-showtimes'].message);
        chai.expect(locationInfoItem[0])
          .to.contain.text(results[0].snippet.extra.data.cinema.name);
        chai.expect(locationInfoItem[1].querySelector('span.location-icon')).to.exist;
        chai.expect(locationInfoItem[1]).to.contain.text(results[0].snippet.extra.data.city);
      });

      it('with existing and correct table tabs', function () {
        const moviesTabsAreaSelector = 'div.dropdown-tabs';
        const moviesTabsAreaItem = cinemaMoviesItem.querySelector(moviesTabsAreaSelector);
        chai.expect(moviesTabsAreaItem).to.exist;

        const moviesTabsSelector = 'label.dropdown-tab-label';
        const moviesTabsItems = moviesTabsAreaItem.querySelectorAll(moviesTabsSelector);
        chai.expect(moviesTabsItems.length)
          .to.equal(results[0].snippet.extra.data.showdates.length);
        [...moviesTabsItems].forEach(function (tab, i) {
          chai.expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
        });
      });

      it('with the first tab being selected as default', function () {
        const inputTabSelector = 'input.tab-radio-input';
        const inputTabItems = cinemaMoviesItem.querySelectorAll(inputTabSelector);
        const [
          firstTabItem,
          ...remainingTabItems
        ] = inputTabItems;
        chai.expect(firstTabItem.checked).to.be.true;
        [...remainingTabItems].forEach(function (tab) {
          chai.expect(tab.checked).to.be.false;
        });
      });

      it('with correct amount of movies', function () {
        chai.expect(moviesRowItems.length).to.equal(2);
      });

      it('with correct movies names', function () {
        const movieNameSelector = 'div.cinema-info span';
        [...moviesRowItems].forEach(function (movie, i) {
          const movieInfo = movie.querySelector(movieNameSelector);
          chai.expect(movieInfo)
            .to.have.text(results[0].snippet.extra.data.showdates[0].movie_list[i].title);
        });
      });

      it('with correct amount of movie hours', function () {
        [...moviesRowItems].forEach(function (movie, i) {
          movieTimes = movie.querySelectorAll(movieTimeSelector);
          chai.expect(movieTimes.length)
            .to.equal(results[0].snippet.extra.data.showdates[0].movie_list[i].showtimes.length);
        });
      });

      it('with correct movies booking URLs', function () {
        [...moviesRowItems].forEach(function (movie, i) {
          movieTimes = movie.querySelectorAll(movieTimeSelector);
          [...movieTimes].forEach(function (time, j) {
            chai.expect(time.querySelector('a').href)
              .to.equal(results[0].snippet.extra.data.showdates[0]
              .movie_list[i].showtimes[j].booking_link);
          });
        });
      });

      it('with existing and correct "Show more" item', function () {
        const showMoreSelector = 'a.expand-btn';
        const showMoreItem = cinemaMoviesItem.querySelector(showMoreSelector);
        chai.expect(showMoreItem).to.exist;
        chai.expect(showMoreItem).to.have.text(locale['cinema-expand-button'].message);
        chai.expect(showMoreItem.href).to.exist;
      });
    });
  });
}
