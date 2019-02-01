import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  expect,
  fillIn,
  getComputedStyle,
  getLocalisedString,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsMovie';

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

    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn(query);
      await waitForPopup(1);
    });

    after(async function () {
      win.preventRestarts = false;
      await blurUrlBar();
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });

    context('renders movie info area', function () {
      it('successfully', async function () {
        const $movieArea = await $cliqzResults.querySelector(`${mainResultSelector} ${movieAreaSelector}`);
        expect($movieArea).to.exist;
      });

      it('with an existing and correct poster', async function () {
        const posterSelector = `${mainResultSelector} ${movieAreaSelector} ${moviePosterSelector}`;

        expect(await $cliqzResults.querySelector(posterSelector)).to.exist;
        expect(await getComputedStyle(posterSelector, 'backgroundImage'))
          .to.contain(results[0].snippet.extra.rich_data.image);
      });

      it('with an existing and correct star rating', async function () {
        const starsSelector = `${mainResultSelector} ${movieAreaSelector} ${starRatingSelector}`;

        expect(await $cliqzResults.querySelector(starsSelector)).to.exist;
        expect(await getComputedStyle(starsSelector, 'backgroundImage'))
          .to.contain(results[0].snippet.extra.rich_data.rating.img);
      });

      it('with an existing and correct numerical rating', async function () {
        const $numRatingScore = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${numRatingScoreSelector}`);
        const $numRatingScale = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${numRatingScaleSelector}`);
        const score = Math.round(results[0].snippet.extra.rich_data.rating.val * 10) / 10;

        expect($numRatingScore).to.exist;
        expect($numRatingScore).to.have.text(score.toString());
        expect($numRatingScale)
          .to.contain.text(results[0].snippet.extra.rich_data.rating.scale.toString());
      });

      it('with an existing and correct amount of reviews', async function () {
        const $reviews = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${reviewsSelector}`);

        expect($reviews).to.exist;
        expect($reviews)
          .to.contain.text(results[0].snippet.extra.rich_data.rating.nVote.toString());
        expect($reviews).to.contain.text(getLocalisedString('cinema_movie_reviews'));
        expect($reviews.href).to.exist;
        expect($reviews.href).to.contain(results[0].url);
      });

      it('with an existing and correct director info', async function () {
        const $directorLabel = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${directorLabelSelector}`);
        const $director = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${directorSelector}`);

        expect($directorLabel).to.exist;
        expect($directorLabel)
          .to.contain.text(results[0].snippet.extra.rich_data.director.title);
        expect($director).to.exist;
        expect($director)
          .to.contain.text(results[0].snippet.extra.rich_data.director.info.name);
        expect($director.href).to.exist;
        expect($director.href)
          .to.contain(results[0].snippet.extra.rich_data.director.info.url);
      });

      it('with an existing and correct cast info', async function () {
        const $starLabel = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${starLabelSelector}`);
        const $allStars = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${movieAreaSelector} ${starSelector}`);

        expect($starLabel).to.exist;
        expect($starLabel).to.contain.text(getLocalisedString('cinema_movie_cast'));
        expect($allStars.length).to.equal(results[0].snippet.extra.rich_data.cast.length);
        [...$allStars].forEach(function ($star, i) {
          expect($star).to.contain.text(results[0].snippet.extra.rich_data.cast[i].name);
          expect($star.href).to.exist;
          expect($star.href).to.contain(results[0].snippet.extra.rich_data.cast[i].url);
        });
      });

      it('with an existing and correct URL for extended cast', async function () {
        const $extendedCast = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${extendedCastSelector}`);

        expect($extendedCast).to.exist;
        expect($extendedCast).to.contain.text(getLocalisedString('cinema_movie_full_cast'));
        expect($extendedCast.href).to.exist;
        expect($extendedCast.href).to.contain(results[0].url);
      });

      it('with an existing and correct trailer icon', async function () {
        const iconSelector = `${mainResultSelector} ${movieAreaSelector} ${trailerIconSelector}`;

        expect(await $cliqzResults.querySelector(iconSelector)).to.exist;
        expect(await getComputedStyle(iconSelector, 'backgroundImage'))
          .to.contain('play-icon-triangle.svg');
      });

      it('with an existing and correct trailer info', async function () {
        const $trailer = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${trailerSelector}`);
        const $trailerLabel = await $cliqzResults
          .querySelector(`${mainResultSelector} ${movieAreaSelector} ${trailerLabelSelector}`);

        expect($trailerLabel).to.exist;
        expect($trailerLabel).to.contain.text(getLocalisedString('cinema_movie_trailer'));
        expect($trailer).to.exist;
        expect($trailer.href).to.exist;
        expect($trailer.href)
          .to.equal(results[0].snippet.extra.rich_data.categories[0].url);
      });
    });
  });
}
