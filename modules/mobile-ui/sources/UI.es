/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

import DelayedImageLoader from 'mobile-ui/DelayedImageLoader';
import window from "platform/window";
import utils from 'core/utils';
import ViewPager from 'viewpager';

const ErrorHandlerReranker = {
  name: 'error-handler-reranker',

  afterResults: function (myResults, backendResults) {
    if (backendResults.isInvalid && myResults.query.length === utils._queryLastLength) {
      setTimeout(utils.search, 500, myResults.query, true);
      reconnectingDiv.innerHTML = '<h3>'+utils.getLocalizedString('mobile_reconnecting_msg')+'</h3>'
    } else {
      reconnectingDiv.innerHTML = '';
    }
    return Promise.resolve(backendResults);
  }
}


var resultsBox = null,
    reconnectingDiv = window.document.getElementById('reconnecting'),
    currentResults = null,
    imgLoader = null,
    progressBarInterval = null,
    PEEK = 25,
    currentResultsCount = 0,
    viewPager = null,
    FRAME = 'frame';

var UI = {
    isIncognito: false,
    currentPage: 0,
    lastResults: null,
    lastSearch: '',
    lastAutocompletion: '',
    CARD_WIDTH: 0,
    nCardsPerPage: 1,
    nPages: 1,
    DelayedImageLoader: null,
    VIEWS: {},
    init: function () {

      utils.RERANKERS.push(ErrorHandlerReranker);

      let box = window.document.getElementById('results');
      box.innerHTML = CLIQZ.templates.main();

      resultsBox = window.document.getElementById('cliqz-results', box);

      resultsBox.addEventListener('click', resultClick);

      // FIXME: import does not work
      UI.DelayedImageLoader = DelayedImageLoader;
    },
    onBoardingSwipe: function () {
      const DELAY = 1200;
      const PAUSE = 1000;
      setTimeout(viewPager.goToIndex, DELAY, 1, 1000)
      setTimeout(viewPager.goToIndex, DELAY + PAUSE, 0, 1000);
    },
    setDimensions: function () {
      UI.CARD_WIDTH = window.innerWidth  -  2 * PEEK;
      UI.CARD_WIDTH /= UI.nCardsPerPage;
    },
    renderResults: function(r) {

      if (!viewPager) {
        viewPager = UI.initViewpager();
      }

      if (UI.lastSearch !== r._searchString) {
        UI.currentPage = 0;
        viewPager.goToIndex(UI.currentPage);
      }

      UI.lastSearch = r._searchString;

      const renderedResults = UI.results(r);

      UI.lastResults = renderedResults;

      CLIQZ.UI.stopProgressBar();

      autoComplete(renderedResults[0] && renderedResults[0].url);
    },
    setTheme: function (incognito = false) {
      UI.isIncognito = incognito;
      window.document.body.style.backgroundColor = incognito ? '#4a4a4a' : '#E8E8E8';
    },
    results: function (r) {

      setCardCountPerPage(window.innerWidth);

      UI.setDimensions();

      var engine = utils.getDefaultSearchEngine();
      var details = utils.getDetailsFromUrl(engine.url);
      var logo = utils.getLogoDetails(details);

      var enhancedResults = enhanceResults(r._results);

      const title = utils.getLocalizedString(enhancedResults[0] ? 'mobile_more_results_title' : 'mobile_no_result_title');

      currentResults = {
        searchString: r._searchString,
        frameWidth: UI.CARD_WIDTH,
        results: enhancedResults,
        isInstant: false,
        isMixed: true,
        googleThis: {
          title,
          left: UI.CARD_WIDTH * enhancedResults.length,
          frameWidth: UI.CARD_WIDTH,
          searchString: r._searchString,
          searchEngineUrl: engine.url,
          logo: logo,
          background: logo.backgroundColor
        }
      };

      var query = currentResults.searchString || '';

      if (imgLoader) imgLoader.stop();

      redrawDropdown(CLIQZ.templates.results(currentResults), query);


      imgLoader = new UI.DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
      imgLoader.start();

      currentResultsCount = enhancedResults.length;

      setResultNavigation(currentResultsCount);

      return currentResults.results;
    },
    initViewpager: function () {
        var views = { 0: 1 },
            pageShowTs = Date.now(),
            innerWidth = window.innerWidth,
            offset = 0;

        return new ViewPager(resultsBox, {
          dragSize: window.innerWidth,
          prevent_all_native_scrolling: false,
          vertical: false,
          anim_duration:400,
          tipping_point:0.4,
          onPageScroll : function (scrollInfo) {
            offset = -scrollInfo.totalOffset;
            crossTransform(resultsBox, (offset * UI.CARD_WIDTH * UI.nCardsPerPage));
          },

          onPageChange : function (page) {
            page = Math.abs(page);

            if (page === UI.currentPage || !UI.isSearch()) return;

            views[page] = (views[page] || 0) + 1;
            const direction = page > UI.currentPage ? 'right' : 'left';
            const shownCardId = page < UI.lastResults.length - 1 ? `cqz-result-box-${page}` : 'defaultEngine';
            const position_type = getResultKind(window.document.getElementById(shownCardId));


            utils.telemetry({
              type: 'cards',
              action: `swipe_${direction}`,
              index: page,
              show_count: views[page],
              show_duration: Date.now() - pageShowTs,
              card_count: currentResultsCount,
              position_type,
            });

            pageShowTs = Date.now();

            UI.currentPage = page;
            autoComplete(UI.lastResults[page * UI.nCardsPerPage] && UI.lastResults[page * UI.nCardsPerPage].url);
          },
        });
    },
    updateSearchCard: function (engine) {
      var engineDiv = window.document.getElementById('defaultEngine');
      if (engineDiv && CliqzAutocomplete.lastSearch) {
        engineDiv.setAttribute('url', engine.url + encodeURIComponent(CliqzAutocomplete.lastSearch));
      }
    },
    startProgressBar: function () {
      // suspended
      return;
      if (progressBarInterval) {
        clearInterval(progressBarInterval);
      }
      var multiplier = parseInt(Math.ceil(window.innerWidth/100)),
      progress = window.document.getElementById('progress'),
      i = 0;
      progressBarInterval = setInterval(function () {
        i++;
        progress.style.width = (i*multiplier)+'px';
      },20);

      setTimeout(UI.stopProgressBar,4000);
    },

    stopProgressBar: function () {
      // suspended
      return;
      if (progressBarInterval) {
        clearInterval(progressBarInterval);
      }
      window.document.getElementById('progress').style.width = '0px';
    },
    isSearch: function () {
      return Boolean(UI.lastResults);
    }
};

function setCardCountPerPage(windowWidth) {
  UI.nCardsPerPage = Math.floor(windowWidth / 320) || 1;
}



function redrawDropdown(newHTML) {
  resultsBox.innerHTML = newHTML;
  setAccordionListeners();
}

function setAccordionListeners() {
  const acc = document.getElementsByClassName("accordion");

  for (let i = 0; i < acc.length; i++) {
      acc[i].onclick = function () {

          this.lastElementChild.classList.toggle("active");

          var panel = this.nextElementSibling;
          if (panel.style.display === "block") {
              panel.style.display = "none";
          } else {
              panel.style.display = "block";
          }
      }
  }
}

function getVertical(result) {
  let template;
  if (utils.TEMPLATES[result.template]) {
    template = result.template;
  } else {
    template = 'generic';
  }
  return template;
}

function getView(template) {
  let view = {};
  // don't pass Cliqz to generic view because it's mostly hardcoded
  if (template !== 'Cliqz') {
    view = UI.VIEWS[template] || UI.VIEWS.generic;
  }
  return view;
}

function enhanceResults(results) {

  let enhancedResults = [];
  let filteredResults = results.filter(function (r) { return !(r.data && r.data.extra && r.data.extra.adult); });

  filteredResults.forEach((r, index) => {
    const url = r.val || '';
    r.data.urlDetails = url && utils.getDetailsFromUrl(url);
    r.data.logo = r.data.urlDetails && utils.getLogoDetails(r.data.urlDetails);

    let historyStyle = '';
    if ((r.data.kind || []).find(kind => kind === 'C' || kind === 'H')) {
      r.data.historyStyle = 'history';
    }

    enhancedResults.push(enhanceSpecificResult({
      query: r.query,
      type: r.style,
      left: (UI.CARD_WIDTH * index),
      data: r.data,
      template: r.data.template,
      url,
      title: r.title,
    }));
  });

  return enhancedResults;
}

function enhanceSpecificResult(r) {
  const contentArea = {
    width: UI.CARD_WIDTH,
    height: window.screen.height
  };

  if (r.subType && r.subType.id) {
      // Indicate that this is a RH result.
      r.type = 'cliqz-extra';
  }

  const template = r.vertical = getVertical(r);
  const specificView = getView(template);
  specificView.enhanceResults && specificView.enhanceResults(r.data, contentArea);

  return r;

}

function crossTransform (element, x) {
  var platforms = ['', '-webkit-', '-ms-'];
  platforms.forEach(function (platform) {
    element.style[platform + 'transform'] = 'translate3d('+ x +'px, 0px, 0px)';
  });
}

function getResultKind(el) {
    return getResultOrChildAttr(el, 'kind').split(';');
}

// bubbles up maximum to the result container
function getResultOrChildAttr(el, attr) {
  if (el === null) return '';
  if (el.className === FRAME) return el.getAttribute(attr) || '';
  return el.getAttribute(attr) || getResultOrChildAttr(el.parentElement, attr);
}

function resultClick(ev) {
    var el = ev.target, url,
        extra,
        action;

    while (el) {
        extra = extra || el.getAttribute('extra');
        url = el.getAttribute('url');
        action = el.getAttribute('cliqz-action');

        if (url && url !== '#') {

            var card = window.document.getElementsByClassName('card')[UI.currentPage];
            var cardPosition = card.getBoundingClientRect();
            var coordinate = [ev.clientX - cardPosition.left, ev.clientY - cardPosition.top, UI.CARD_WIDTH];
            const result_order = currentResults && CliqzAutocomplete.prepareResultOrder(UI.lastResults);

            var signal = {
                type: 'activity',
                action: 'result_click',
                extra: extra,
                mouse: coordinate,
                position_type: getResultKind(el),
                current_position: UI.currentPage
            };

            if(!UI.isIncognito) {
              utils.resultTelemetry(
                UI.lastSearch,
                UI.lastAutocompletion,
                UI.currentPage,
                utils.isPrivateResultType(signal.position_type) ? '' : url,
                result_order,
                signal.extra,
              );

              utils.telemetry(signal);
            }

            utils.openLink(window, url);
            return;

        } else if (action) {
            switch (action) {
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    utils.copyResult(window.document.getElementById('calc-answer').innerHTML);
                    window.document.getElementById('calc-copied-msg').style.display = '';
                    window.document.getElementById('calc-copy-msg').style.display = 'none';
                    break;
            }
        }

        if (el.className === FRAME) break; // do not go higher than a result
        el = el.parentElement;
    }
}

function shiftResults() {
  var frames = window.document.getElementsByClassName('frame');
  for (var i = 0; i < frames.length; i++) {
    var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
    left = parseInt(left);
    left -= (left / (i + 1));
    UI.lastResults[i] && (UI.lastResults[i].left = left);
    frames[i].style.left = left + 'px';
  }
  currentResultsCount = UI.lastResults.length;

  setResultNavigation(currentResultsCount);
}


function setResultNavigation(resultCount) {

  const showGooglethis = 1;

  resultsBox.style.width = window.innerWidth + 'px';
  resultsBox.style.marginLeft = PEEK + 'px';

  // get number of pages according to number of cards per page
  UI.nPages = Math.ceil((currentResultsCount + showGooglethis) / UI.nCardsPerPage);

  if (window.document.getElementById('currency-tpl')) {
    window.document.getElementById('currency-tpl').parentNode.removeAttribute('url');
  }
}

function autoComplete(url) {
  const query = UI.lastSearch;

  if(url && url.length > 0) {
    url = url.replace(/http([s]?):\/\/(www.)?/,'');
    url = url.toLowerCase();
    const searchLower = query.toLowerCase();

    if(url.startsWith(searchLower)) {
      osAPI.autocomplete(url);
      UI.lastAutocompletion = url;
    } else {
      osAPI.autocomplete(query);
      UI.lastAutocompletion = query;
    }
  } else {
    osAPI.autocomplete(query);
    UI.lastAutocompletion = query;
  }
}

var resizeTimeout;
window.addEventListener('resize', function () {
  if (!UI.isSearch()) return;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function () {
    const lastnCardsPerPage = UI.nCardsPerPage;
    setCardCountPerPage(window.innerWidth);
    UI.setDimensions();
    const frames = window.document.getElementsByClassName(FRAME);
    for (let i = 0; i < frames.length; i++) {
      let left = UI.CARD_WIDTH * i;
      frames[i].style.left = left + 'px';
      UI.lastResults[i] && (UI.lastResults[i].left = left);
      frames[i].style.width = UI.CARD_WIDTH + 'px';
    }
    setResultNavigation(currentResultsCount);
    UI.currentPage = Math.floor(UI.currentPage * lastnCardsPerPage / UI.nCardsPerPage);
    viewPager.goToIndex(UI.currentPage, 0);
  }, 200);

});

export default UI;
