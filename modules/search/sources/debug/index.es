/* global CLIQZ, window, document */
import Rx from '../../platform/lib/rxjs';
import mixed from '../search';
import createUrlbarObservable from '../observables/urlbar';

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
const System = CLIQZ.System;
const Dropdown = System.get('dropdown/dropdown').default;
const Results = System.get('dropdown/results').default;
const AdultAssistant = System.get('dropdown/adult-content-assistant').default;
const LocationAssistant = System.get('dropdown/location-sharing-assistant').default;

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

  const mix = mixed(query, focus);

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
