/* global window */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getComputedStyle,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsMovieCinema1';
import config from '../../../core/config';

export default function () {
  describe('for a movie SC', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];

    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('with "always ask" share location settings', function () {
      const movieAreaSelector = '.movie-cinema';
      let $resultElement;
      let movieAreaItem;
      const query = 'imdb the circle';

      before(function () {
        CliqzUtils.setPref('share_location', 'ask');
        respondWith({ results });
        withHistory([]);
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          movieAreaItem = $resultElement.querySelector(movieAreaSelector);
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      context('renders parent result', function () {
        let parentMovieItem;

        before(function () {
          parentMovieItem = $resultElement.querySelector('a.result:not(.search)');
        });

        it('successfully', function () {
          expect(parentMovieItem).to.exist;
        });

        it('with an existing and correct title', function () {
          const parentMovieTitleSelector = '.abstract .title';
          const parentMovieTitleItem = parentMovieItem.querySelector(parentMovieTitleSelector);
          expect(parentMovieTitleItem).to.exist;
          expect(parentMovieTitleItem).to.have.text(results[0].snippet.title);
        });

        it('with an existing and correct domain', function () {
          const parentMovieDomainSelector = '.abstract .url';
          const parentMovieDomainItem = parentMovieItem.querySelector(parentMovieDomainSelector);
          expect(parentMovieDomainItem).to.exist;
          expect(parentMovieDomainItem).to.have.text(results[0].snippet.friendlyUrl);
        });

        it('with an existing and correct link', function () {
          const parentMovieLinkItem = parentMovieItem.dataset.url;
          expect(parentMovieLinkItem).to.exist;
          expect(parentMovieLinkItem).to.equal(results[0].url);
        });

        it('with an existing and correct description', function () {
          const parentMovieDescSelector = '.abstract .description';
          const parentMovieDescItem = parentMovieItem.querySelector(parentMovieDescSelector);
          expect(parentMovieDescItem).to.exist;
          expect(parentMovieDescItem).to.have.text(results[0].snippet.description);
        });

        it('with an existing icon', function () {
          const parentMovieIconSelector = '.icons .logo';
          const parentMovieIconItem = parentMovieItem.querySelector(parentMovieIconSelector);
          expect(parentMovieIconItem).to.exist;
        });
      });

      context('renders movie info area', function () {
        const movieReviewsSelector = '.info .reviews';
        const movieDirectorSelector = '.info .director';
        const movieStarsSelector = '.info .stars > span';
        const movieTrailerSelector = '.info .trailer';
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
          expect(movieAreaItem).to.exist;
        });

        it('with existing and correct poster', function () {
          const moviePosterSelector = '.movie .image';
          const moviePosterItem = movieAreaItem.querySelector(moviePosterSelector);
          expect(moviePosterItem).to.exist;
          expect(getComputedStyle(moviePosterItem).backgroundImage)
            .to.contain(results[0].snippet.extra.data.movie.poster_image_thumbnail);
        });

        it('with existing and correct star rating', function () {
          const starRatingSelector = '.info .rating-img';
          const starRatingItem = movieAreaItem.querySelector(starRatingSelector);
          expect(starRatingItem).to.exist;
          expect(getComputedStyle(starRatingItem).backgroundImage)
            .to.contain(results[0].snippet.extra.rich_data.rating.img);
        });

        it('with existing and correct numerical rating', function () {
          const numRatingSelector = '.info .score span';
          const numRatingItems = movieAreaItem.querySelectorAll(numRatingSelector);
          expect(numRatingItems.length).to.equal(2);

          const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;
          expect(numRatingItems[0]).to.have.text(score.toString());
          expect(numRatingItems[1])
            .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
        });

        it('with existing and correct amount of reviews', function () {
          expect(movieReviewsItem).to.exist;
          expect(movieReviewsItem)
            .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
          expect(movieReviewsItem)
            .to.contain.text(locale['cinema-movie-reviews'].message);
        });

        it('with amount of reviews having correct URL', function () {
          expect(movieReviewsItem.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct director info', function () {
          expect(movieDirectorItem.querySelector('span'))
            .to.contain.text(locale['cinema-movie-director'].message);
          expect(movieDirectorItem.querySelector('.result'))
            .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
        });

        it('with director info having correct URL', function () {
          expect(movieDirectorItem.querySelector('.result').dataset.url)
            .to.contain(results[0].snippet.extra.rich_data.director.info.url);
        });

        it('with existing and correct cast info', function () {
          expect(movieStarsItems[0]).to.contain.text(locale['cinema-movie-cast'].message);

          const movieStars = movieStarsItems[1].querySelectorAll('span');
          expect(movieStarsItems[1]).have.class('stars-list');
          expect(movieStars.length).to.equal(results[0].snippet.extra.data.movie.cast.length);
          [...movieStars].forEach(function (star, i) {
            expect(star).to.contain.text(results[0].snippet.extra.data.movie.cast[i].name);
          });
        });

        it('with existing and correct extended cast URL', function () {
          const castUrl = movieStarsItems[2].querySelector('a.result');
          expect(castUrl).to.contain.text(locale['cinema-movie-full-cast'].message);
          expect(castUrl.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct trailer icon', function () {
          const movieTrailerIcon = movieTrailerItem.querySelector('.trailer-icon');
          expect(movieTrailerIcon).to.exist;
          expect(getComputedStyle(movieTrailerIcon).backgroundImage)
            .to.contain('play-icon-triangle.svg');
        });

        it('with existing and correct trailer URL', function () {
          const movieTrailerUrl = movieTrailerItem.querySelector('a.result').dataset.url;
          expect(movieTrailerUrl).to.exist;
          expect(movieTrailerUrl)
            .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
        });

        it('with existing and correct trailer label', function () {
          const movieTrailerLabel = movieTrailerItem.querySelector('a.result span');
          expect(movieTrailerLabel).to.exist;
          expect(movieTrailerLabel).to.contain.text(locale['cinema-movie-trailer'].message);
        });
      });

      context('renders cinemas and showings table', function () {
        const movieShowingsSelector = '.show-time';
        const cinemaRowSelector = '.show-time-row';
        const showingTimeSelector = '.show-time-info .show-time-span';
        let movieShowingsItem;
        let cinemaRowItems;
        let showingTimes;

        before(function () {
          movieShowingsItem = movieAreaItem.querySelector(movieShowingsSelector);
          cinemaRowItems = movieShowingsItem.querySelectorAll(cinemaRowSelector);
        });

        it('with existing and correct location info', function () {
          const locationInfoSelector = '.title span';
          const locationInfoItem = movieShowingsItem.querySelectorAll(locationInfoSelector);
          expect(locationInfoItem[0]).to.contain.text(locale['cinema-movie-showtimes'].message);
          expect(locationInfoItem[0]).to.contain.text(results[0].snippet.extra.data.movie.title);
          expect(getComputedStyle(locationInfoItem[1].querySelector('.location-icon')).backgroundImage)
            .to.contain('location-icon.svg');
          expect(locationInfoItem[1]).to.contain.text(results[0].snippet.extra.data.city);
        });

        it('with existing and correct table tabs', function () {
          const cinemaTabsAreaSelector = '.dropdown-tabs';
          const cinemaTabsAreaItem = movieShowingsItem.querySelector(cinemaTabsAreaSelector);
          expect(cinemaTabsAreaItem).to.exist;

          const cinemaTabsSelector = 'label.dropdown-tab-label';
          const cinemaTabsItems = cinemaTabsAreaItem.querySelectorAll(cinemaTabsSelector);
          expect(cinemaTabsItems.length)
            .to.equal(results[0].snippet.extra.data.showdates.length);
          [...cinemaTabsItems].forEach(function (tab, i) {
            expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
          });
        });

        it('with the first tab being selected as default', function () {
          const inputTabSelector = '.tab-radio-input';
          const inputTabItems = movieShowingsItem.querySelectorAll(inputTabSelector);
          const [
            firstTabItem,
            ...remainingTabItems
          ] = inputTabItems;
          expect(firstTabItem.checked).to.be.true;
          [...remainingTabItems].forEach(function (tab) {
            expect(tab.checked).to.be.false;
          });
        });

        it('with correct amount of cinemas', function () {
          expect(cinemaRowItems.length)
          // This is hardcoded to max 2
            // .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list.length);
            .to.equal(2);
        });

        it('with correct cinema names and addresses', function () {
          const cinemaNameSelector = '.cinema-info span';
          [...cinemaRowItems].forEach(function (cinema, i) {
            const cinemaInfo = cinema.querySelectorAll(cinemaNameSelector);
            expect(cinemaInfo[0])
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].name);
            expect(cinemaInfo[1].querySelector('span'))
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].address);
          });
        });

        it('with correct amount of showings hours', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            expect(showingTimes.length)
              .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list[i].showtimes.length);
          });
        });

        it('with correct showings booking URLs', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            [...showingTimes].forEach(function (showing, j) {
              expect(showing.querySelector('a').dataset.url)
                .to.equal(results[0].snippet.extra.data.showdates[0]
                  .cinema_list[i].showtimes[j].booking_link);
            });
          });
        });

        it('with existing and correct "Show more" item', function () {
          const showMoreSelector = '.expand-btn';
          const showMoreItem = movieShowingsItem.querySelector(showMoreSelector);
          expect(showMoreItem).to.exist;
          expect(showMoreItem).to.have.trimmed.text(locale['cinema-expand-button'].message);
          expect(showMoreItem.dataset.url).to.exist;
        });
      });

      context('renders location buttons', function () {
        const movieLocationSelector = '.location';
        const movieLocationButtonSelector = '.buttons .btn.result';
        let movieLocationItem;
        let movieLocationButtonItems;

        before(function () {
          movieLocationItem = movieAreaItem.querySelector(movieLocationSelector);
          movieLocationButtonItems = movieLocationItem
            .querySelectorAll(movieLocationButtonSelector);
        });

        it('successfully', function () {
          expect(movieLocationItem).to.exist;
        });

        it('in correct amount', function () {
          expect(movieLocationButtonItems.length).to.equal(2);
        });

        it('with correct text', function () {
          expect(movieLocationButtonItems[0])
            .to.contain.text(locale['cinema-show-location-and-contact'].message);
          expect(movieLocationButtonItems[1])
            .to.contain.text(locale['cinema-always-show-location'].message);
        });
      });
    });

    context('with "never" share location settings', function () {
      const movieAreaSelector = '.movie-cinema';
      let $resultElement;
      let movieAreaItem;
      const query = 'imdb the circle';

      before(function () {
        CliqzUtils.setPref('share_location', 'no');
        respondWith({ results });
        withHistory([]);
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          movieAreaItem = $resultElement.querySelector(movieAreaSelector);
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('doesn\'t render location question', function () {
        expect($resultElement.querySelector('.location .buttons')).to.not.exist;
      });

      context('renders parent result', function () {
        let parentMovieItem;

        before(function () {
          parentMovieItem = $resultElement.querySelector('a.result:not(.search)');
        });

        it('successfully', function () {
          expect(parentMovieItem).to.exist;
        });

        it('with an existing and correct title', function () {
          const parentMovieTitleSelector = '.abstract .title';
          const parentMovieTitleItem = parentMovieItem.querySelector(parentMovieTitleSelector);
          expect(parentMovieTitleItem).to.exist;
          expect(parentMovieTitleItem).to.have.text(results[0].snippet.title);
        });

        it('with an existing and correct domain', function () {
          const parentMovieDomainSelector = '.abstract .url';
          const parentMovieDomainItem = parentMovieItem.querySelector(parentMovieDomainSelector);
          expect(parentMovieDomainItem).to.exist;
          expect(parentMovieDomainItem).to.have.text(results[0].snippet.friendlyUrl);
        });

        it('with an existing and correct link', function () {
          const parentMovieLinkItem = parentMovieItem.dataset.url;
          expect(parentMovieLinkItem).to.exist;
          expect(parentMovieLinkItem).to.equal(results[0].url);
        });

        it('with an existing and correct description', function () {
          const parentMovieDescSelector = '.abstract .description';
          const parentMovieDescItem = parentMovieItem.querySelector(parentMovieDescSelector);
          expect(parentMovieDescItem).to.exist;
          expect(parentMovieDescItem).to.have.text(results[0].snippet.description);
        });

        it('with an existing icon', function () {
          const parentMovieIconSelector = '.icons .logo';
          const parentMovieIconItem = parentMovieItem.querySelector(parentMovieIconSelector);
          expect(parentMovieIconItem).to.exist;
        });
      });

      context('renders movie info area', function () {
        const movieReviewsSelector = '.info .reviews';
        const movieDirectorSelector = '.info .director';
        const movieStarsSelector = '.info .stars > span';
        const movieTrailerSelector = '.info .trailer';
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
          expect(movieAreaItem).to.exist;
        });

        it('with existing and correct poster', function () {
          const moviePosterSelector = '.movie .image';
          const moviePosterItem = movieAreaItem.querySelector(moviePosterSelector);
          expect(moviePosterItem).to.exist;
          expect(getComputedStyle(moviePosterItem).backgroundImage)
            .to.contain(results[0].snippet.extra.data.movie.poster_image_thumbnail);
        });

        it('with existing and correct star rating', function () {
          const starRatingSelector = '.info .rating-img';
          const starRatingItem = movieAreaItem.querySelector(starRatingSelector);
          expect(starRatingItem).to.exist;
          expect(getComputedStyle(starRatingItem).backgroundImage)
            .to.contain(results[0].snippet.extra.rich_data.rating.img);
        });

        it('with existing and correct numerical rating', function () {
          const numRatingSelector = '.info .score span';
          const numRatingItems = movieAreaItem.querySelectorAll(numRatingSelector);
          expect(numRatingItems.length).to.equal(2);

          const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;
          expect(numRatingItems[0]).to.have.text(score.toString());
          expect(numRatingItems[1])
            .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
        });

        it('with existing and correct amount of reviews', function () {
          expect(movieReviewsItem).to.exist;
          expect(movieReviewsItem)
            .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
          expect(movieReviewsItem)
            .to.contain.text(locale['cinema-movie-reviews'].message);
        });

        it('with amount of reviews having correct URL', function () {
          expect(movieReviewsItem.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct director info', function () {
          expect(movieDirectorItem.querySelector('span'))
            .to.contain.text(locale['cinema-movie-director'].message);
          expect(movieDirectorItem.querySelector('.result'))
            .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
        });

        it('with director info having correct URL', function () {
          expect(movieDirectorItem.querySelector('.result').dataset.url)
            .to.contain(results[0].snippet.extra.rich_data.director.info.url);
        });

        it('with existing and correct cast info', function () {
          expect(movieStarsItems[0]).to.contain.text(locale['cinema-movie-cast'].message);

          const movieStars = movieStarsItems[1].querySelectorAll('span');
          expect(movieStarsItems[1]).have.class('stars-list');
          expect(movieStars.length).to.equal(results[0].snippet.extra.data.movie.cast.length);
          [...movieStars].forEach(function (star, i) {
            expect(star).to.contain.text(results[0].snippet.extra.data.movie.cast[i].name);
          });
        });

        it('with existing and correct extended cast URL', function () {
          const castUrl = movieStarsItems[2].querySelector('a.result');
          expect(castUrl).to.contain.text(locale['cinema-movie-full-cast'].message);
          expect(castUrl.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct trailer icon', function () {
          const movieTrailerIcon = movieTrailerItem.querySelector('.trailer-icon');
          expect(movieTrailerIcon).to.exist;
          expect(getComputedStyle(movieTrailerIcon).backgroundImage)
            .to.contain('play-icon-triangle.svg');
        });

        it('with existing and correct trailer URL', function () {
          const movieTrailerUrl = movieTrailerItem.querySelector('a.result').dataset.url;
          expect(movieTrailerUrl).to.exist;
          expect(movieTrailerUrl)
            .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
        });

        it('with existing and correct trailer label', function () {
          const movieTrailerLabel = movieTrailerItem.querySelector('a.result span');
          expect(movieTrailerLabel).to.exist;
          expect(movieTrailerLabel).to.contain.text(locale['cinema-movie-trailer'].message);
        });
      });

      context('renders cinemas and showings table', function () {
        const movieShowingsSelector = '.show-time';
        const cinemaRowSelector = '.show-time-row';
        const showingTimeSelector = '.show-time-info .show-time-span';
        let movieShowingsItem;
        let cinemaRowItems;
        let showingTimes;

        before(function () {
          movieShowingsItem = movieAreaItem.querySelector(movieShowingsSelector);
          cinemaRowItems = movieShowingsItem.querySelectorAll(cinemaRowSelector);
        });

        it('with existing and correct location info', function () {
          const locationInfoSelector = '.title span';
          const locationInfoItem = movieShowingsItem.querySelectorAll(locationInfoSelector);
          expect(locationInfoItem[0]).to.contain.text(locale['cinema-movie-showtimes'].message);
          expect(locationInfoItem[0]).to.contain.text(results[0].snippet.extra.data.movie.title);
          expect(getComputedStyle(locationInfoItem[1].querySelector('.location-icon')).backgroundImage)
            .to.contain('location-icon.svg');
          expect(locationInfoItem[1]).to.contain.text(results[0].snippet.extra.data.city);
        });

        it('with existing and correct table tabs', function () {
          const cinemaTabsAreaSelector = '.dropdown-tabs';
          const cinemaTabsAreaItem = movieShowingsItem.querySelector(cinemaTabsAreaSelector);
          expect(cinemaTabsAreaItem).to.exist;

          const cinemaTabsSelector = 'label.dropdown-tab-label';
          const cinemaTabsItems = cinemaTabsAreaItem.querySelectorAll(cinemaTabsSelector);
          expect(cinemaTabsItems.length)
            .to.equal(results[0].snippet.extra.data.showdates.length);
          [...cinemaTabsItems].forEach(function (tab, i) {
            expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
          });
        });

        it('with the first tab being selected as default', function () {
          const inputTabSelector = '.tab-radio-input';
          const inputTabItems = movieShowingsItem.querySelectorAll(inputTabSelector);
          const [
            firstTabItem,
            ...remainingTabItems
          ] = inputTabItems;
          expect(firstTabItem.checked).to.be.true;
          [...remainingTabItems].forEach(function (tab) {
            expect(tab.checked).to.be.false;
          });
        });

        it('with correct amount of cinemas', function () {
          expect(cinemaRowItems.length)
          // This is hardcoded to max 2
            // .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list.length);
            .to.equal(2);
        });

        it('with correct cinema names and addresses', function () {
          const cinemaNameSelector = '.cinema-info span';
          [...cinemaRowItems].forEach(function (cinema, i) {
            const cinemaInfo = cinema.querySelectorAll(cinemaNameSelector);
            expect(cinemaInfo[0])
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].name);
            expect(cinemaInfo[1].querySelector('span'))
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].address);
          });
        });

        it('with correct amount of showings hours', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            expect(showingTimes.length)
              .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list[i].showtimes.length);
          });
        });

        it('with correct showings booking URLs', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            [...showingTimes].forEach(function (showing, j) {
              expect(showing.querySelector('a').dataset.url)
                .to.equal(results[0].snippet.extra.data.showdates[0]
                  .cinema_list[i].showtimes[j].booking_link);
            });
          });
        });

        it('with existing and correct "Show more" item', function () {
          const showMoreSelector = '.expand-btn';
          const showMoreItem = movieShowingsItem.querySelector(showMoreSelector);
          expect(showMoreItem).to.exist;
          expect(showMoreItem).to.have.trimmed.text(locale['cinema-expand-button'].message);
          expect(showMoreItem.dataset.url).to.exist;
        });
      });
    });

    context('with "always" share location settings', function () {
      const movieAreaSelector = '.movie-cinema';
      let $resultElement;
      let movieAreaItem;
      const query = 'imdb the circle';

      before(function () {
        CliqzUtils.setPref('share_location', 'yes');
        respondWith({ results });
        withHistory([]);
        fillIn(query);
        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
          movieAreaItem = $resultElement.querySelector(movieAreaSelector);
        });
      });

      after(function () {
        CliqzUtils.setPref('share_location', config.settings.geolocation || 'ask');
      });

      it('doesn\'t render location question', function () {
        expect($resultElement.querySelector('.location .buttons')).to.not.exist;
      });

      context('renders parent result', function () {
        let parentMovieItem;

        before(function () {
          parentMovieItem = $resultElement.querySelector('a.result:not(.search)');
        });

        it('successfully', function () {
          expect(parentMovieItem).to.exist;
        });

        it('with an existing and correct title', function () {
          const parentMovieTitleSelector = '.abstract .title';
          const parentMovieTitleItem = parentMovieItem.querySelector(parentMovieTitleSelector);
          expect(parentMovieTitleItem).to.exist;
          expect(parentMovieTitleItem).to.have.text(results[0].snippet.title);
        });

        it('with an existing and correct domain', function () {
          const parentMovieDomainSelector = '.abstract .url';
          const parentMovieDomainItem = parentMovieItem.querySelector(parentMovieDomainSelector);
          expect(parentMovieDomainItem).to.exist;
          expect(parentMovieDomainItem).to.have.text(results[0].snippet.friendlyUrl);
        });

        it('with an existing and correct link', function () {
          const parentMovieLinkItem = parentMovieItem.dataset.url;
          expect(parentMovieLinkItem).to.exist;
          expect(parentMovieLinkItem).to.equal(results[0].url);
        });

        it('with an existing and correct description', function () {
          const parentMovieDescSelector = '.abstract .description';
          const parentMovieDescItem = parentMovieItem.querySelector(parentMovieDescSelector);
          expect(parentMovieDescItem).to.exist;
          expect(parentMovieDescItem).to.have.text(results[0].snippet.description);
        });

        it('with an existing icon', function () {
          const parentMovieIconSelector = '.icons .logo';
          const parentMovieIconItem = parentMovieItem.querySelector(parentMovieIconSelector);
          expect(parentMovieIconItem).to.exist;
        });
      });

      context('renders movie info area', function () {
        const movieReviewsSelector = '.info .reviews';
        const movieDirectorSelector = '.info .director';
        const movieStarsSelector = '.info .stars > span';
        const movieTrailerSelector = '.info .trailer';
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
          expect(movieAreaItem).to.exist;
        });

        it('with existing and correct poster', function () {
          const moviePosterSelector = '.movie .image';
          const moviePosterItem = movieAreaItem.querySelector(moviePosterSelector);
          expect(moviePosterItem).to.exist;
          expect(getComputedStyle(moviePosterItem).backgroundImage)
            .to.contain(results[0].snippet.extra.data.movie.poster_image_thumbnail);
        });

        it('with existing and correct star rating', function () {
          const starRatingSelector = '.info .rating-img';
          const starRatingItem = movieAreaItem.querySelector(starRatingSelector);
          expect(starRatingItem).to.exist;
          expect(getComputedStyle(starRatingItem).backgroundImage)
            .to.contain(results[0].snippet.extra.rich_data.rating.img);
        });

        it('with existing and correct numerical rating', function () {
          const numRatingSelector = '.info .score span';
          const numRatingItems = movieAreaItem.querySelectorAll(numRatingSelector);
          expect(numRatingItems.length).to.equal(2);

          const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;
          expect(numRatingItems[0]).to.have.text(score.toString());
          expect(numRatingItems[1])
            .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
        });

        it('with existing and correct amount of reviews', function () {
          expect(movieReviewsItem).to.exist;
          expect(movieReviewsItem)
            .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
          expect(movieReviewsItem)
            .to.contain.text(locale['cinema-movie-reviews'].message);
        });

        it('with amount of reviews having correct URL', function () {
          expect(movieReviewsItem.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct director info', function () {
          expect(movieDirectorItem.querySelector('span'))
            .to.contain.text(locale['cinema-movie-director'].message);
          expect(movieDirectorItem.querySelector('.result'))
            .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
        });

        it('with director info having correct URL', function () {
          expect(movieDirectorItem.querySelector('.result').dataset.url)
            .to.contain(results[0].snippet.extra.rich_data.director.info.url);
        });

        it('with existing and correct cast info', function () {
          expect(movieStarsItems[0]).to.contain.text(locale['cinema-movie-cast'].message);

          const movieStars = movieStarsItems[1].querySelectorAll('span');
          expect(movieStarsItems[1]).have.class('stars-list');
          expect(movieStars.length).to.equal(results[0].snippet.extra.data.movie.cast.length);
          [...movieStars].forEach(function (star, i) {
            expect(star).to.contain.text(results[0].snippet.extra.data.movie.cast[i].name);
          });
        });

        it('with existing and correct extended cast URL', function () {
          const castUrl = movieStarsItems[2].querySelector('a.result');
          expect(castUrl).to.contain.text(locale['cinema-movie-full-cast'].message);
          expect(castUrl.dataset.url).to.contain(results[0].url);
        });

        it('with existing and correct trailer icon', function () {
          const movieTrailerIcon = movieTrailerItem.querySelector('.trailer-icon');
          expect(movieTrailerIcon).to.exist;
          expect(getComputedStyle(movieTrailerIcon).backgroundImage)
            .to.contain('play-icon-triangle.svg');
        });

        it('with existing and correct trailer URL', function () {
          const movieTrailerUrl = movieTrailerItem.querySelector('a.result').dataset.url;
          expect(movieTrailerUrl).to.exist;
          expect(movieTrailerUrl)
            .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
        });

        it('with existing and correct trailer label', function () {
          const movieTrailerLabel = movieTrailerItem.querySelector('a.result span');
          expect(movieTrailerLabel).to.exist;
          expect(movieTrailerLabel).to.contain.text(locale['cinema-movie-trailer'].message);
        });
      });

      context('renders cinemas and showings table', function () {
        const movieShowingsSelector = '.show-time';
        const cinemaRowSelector = '.show-time-row';
        const showingTimeSelector = '.show-time-info .show-time-span';
        let movieShowingsItem;
        let cinemaRowItems;
        let showingTimes;

        before(function () {
          movieShowingsItem = movieAreaItem.querySelector(movieShowingsSelector);
          cinemaRowItems = movieShowingsItem.querySelectorAll(cinemaRowSelector);
        });

        it('with existing and correct location info', function () {
          const locationInfoSelector = '.title span';
          const locationInfoItem = movieShowingsItem.querySelectorAll(locationInfoSelector);
          expect(locationInfoItem[0]).to.contain.text(locale['cinema-movie-showtimes'].message);
          expect(locationInfoItem[0]).to.contain.text(results[0].snippet.extra.data.movie.title);
          expect(getComputedStyle(locationInfoItem[1].querySelector('.location-icon')).backgroundImage)
            .to.contain('location-icon.svg');
          expect(locationInfoItem[1]).to.contain.text(results[0].snippet.extra.data.city);
        });

        it('with existing and correct table tabs', function () {
          const cinemaTabsAreaSelector = '.dropdown-tabs';
          const cinemaTabsAreaItem = movieShowingsItem.querySelector(cinemaTabsAreaSelector);
          expect(cinemaTabsAreaItem).to.exist;

          const cinemaTabsSelector = 'label.dropdown-tab-label';
          const cinemaTabsItems = cinemaTabsAreaItem.querySelectorAll(cinemaTabsSelector);
          expect(cinemaTabsItems.length)
            .to.equal(results[0].snippet.extra.data.showdates.length);
          [...cinemaTabsItems].forEach(function (tab, i) {
            expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
          });
        });

        it('with the first tab being selected as default', function () {
          const inputTabSelector = '.tab-radio-input';
          const inputTabItems = movieShowingsItem.querySelectorAll(inputTabSelector);
          const [
            firstTabItem,
            ...remainingTabItems
          ] = inputTabItems;
          expect(firstTabItem.checked).to.be.true;
          [...remainingTabItems].forEach(function (tab) {
            expect(tab.checked).to.be.false;
          });
        });

        it('with correct amount of cinemas', function () {
          expect(cinemaRowItems.length)
          // This is hardcoded to max 2
            // .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list.length);
            .to.equal(2);
        });

        it('with correct cinema names and addresses', function () {
          const cinemaNameSelector = '.cinema-info span';
          [...cinemaRowItems].forEach(function (cinema, i) {
            const cinemaInfo = cinema.querySelectorAll(cinemaNameSelector);
            expect(cinemaInfo[0])
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].name);
            expect(cinemaInfo[1].querySelector('span'))
              .to.have.text(results[0].snippet.extra.data.showdates[0].cinema_list[i].address);
          });
        });

        it('with correct amount of showings hours', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            expect(showingTimes.length)
              .to.equal(results[0].snippet.extra.data.showdates[0].cinema_list[i].showtimes.length);
          });
        });

        it('with correct showings booking URLs', function () {
          [...cinemaRowItems].forEach(function (cinema, i) {
            showingTimes = cinema.querySelectorAll(showingTimeSelector);
            [...showingTimes].forEach(function (showing, j) {
              expect(showing.querySelector('a').dataset.url)
                .to.equal(results[0].snippet.extra.data.showdates[0]
                  .cinema_list[i].showtimes[j].booking_link);
            });
          });
        });

        it('with existing and correct "Show more" item', function () {
          const showMoreSelector = '.expand-btn';
          const showMoreItem = movieShowingsItem.querySelector(showMoreSelector);
          expect(showMoreItem).to.exist;
          expect(showMoreItem).to.have.trimmed.text(locale['cinema-expand-button'].message);
          expect(showMoreItem.dataset.url).to.exist;
        });
      });
    });
  });
}
