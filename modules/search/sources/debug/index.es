/* global CLIQZ, window, document */
import Rx from '../../platform/lib/rxjs';
import search from '../search';
import background from '../background';
import createUrlbarObservable from '../observables/urlbar';
import DEFAULT_CONFIG from '../config';
import Results from '../../dropdown/results';
import AdultAssistant from '../../dropdown/adult-content-assistant';
import LocationAssistant from '../../dropdown/location-sharing-assistant';
import Dropdown from '../../dropdown/dropdown';

const $ = window.document.querySelector.bind(window.document);

window.addEventListener('load', () => {
  const stylesheet = document.createElement('link');
  stylesheet.setAttribute('rel', 'stylesheet');
  stylesheet.setAttribute('href', `chrome://cliqz/content/dropdown/styles/styles.css?r=${Date.now()}`);
  document.head.appendChild(stylesheet);

  const $urlbar = $('#urlbar');
  const $results = $('#results');
  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  // TODO: adaptive debounce (only when typing fast)
  const query = createUrlbarObservable(
    Rx.Observable
      .fromEvent($urlbar, 'keyup')
      .map(() => $urlbar.value)
  );

  const focus = Rx.Observable
    .fromEvent($urlbar, 'focus')
    .share();

  const mix = search(query, focus, background.providers, DEFAULT_CONFIG);

  const dropdown = new Dropdown($results, window);

  mix.subscribe((r) => {
    const queryCliqz = () => {};
    const sessionCountPromise = new Promise((resolve) => {
      setTimeout(() => {
        const count = Math.floor(Math.random() * 10000) % 2000;
        resolve(count);
      }, 3000);
    });
    const adultAssistant = new AdultAssistant();
    const locationAssistant = new LocationAssistant({});

    const rr = new Results({
      query: 'aa',
      rawResults: r,
      sessionCountPromise,
      queryCliqz,
      adultAssistant,
      locationAssistant,
    });
    dropdown.renderResults(rr);
  });
});
