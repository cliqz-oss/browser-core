/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

import DelayedImageLoader from 'mobile-ui/DelayedImageLoader';
import handlebars from "core/templates";
import { window, document } from 'mobile-ui/webview';

//TODO: improve loading of these views!
import v1 from 'mobile-ui/views/currency';
import v2 from 'mobile-ui/views/entity-generic';
import v3 from 'mobile-ui/views/generic';
import v4 from 'mobile-ui/views/hq';
import v6 from 'mobile-ui/views/local-data-sc';
import v7 from 'mobile-ui/views/stocks';
import v8 from 'mobile-ui/views/weatherAlert';
import v9 from 'mobile-ui/views/weatherEZ';
import v10 from 'mobile-ui/views/liveTicker';

var resultsBox = null,
    viewPager = null,
    currentResults = null,
    imgLoader = null,
    progressBarInterval = null,
    PEEK = 25,
    currentResultsCount = 0,
    FRAME = 'frame';

var UI = {
    currentPage: 0,
    lastResults: null,
    CARD_WIDTH: 0,
    nCardsPerPage: 1,
    nPages: 1,
    DelayedImageLoader: null,
    init: function () {
        //check if loading is done
        if (!handlebars.tplCache.main) return;
        let box = document.getElementById('results');
        box.innerHTML = handlebars.tplCache.main();

        resultsBox = document.getElementById('cliqz-results', box);

        resultsBox.addEventListener('click', resultClick);

        // FIXME: import does not work
        UI.DelayedImageLoader = System.get('mobile-ui/DelayedImageLoader').default;
        loadViews();
    },
    setDimensions: function () {
      UI.CARD_WIDTH = window.innerWidth  -  2 * PEEK;
      UI.CARD_WIDTH /= UI.nCardsPerPage;
    },
    renderResults: function(r) {

      if (!viewPager) {
        viewPager = UI.initViewpager();
      }

      const renderedResults = UI.results(r);

      UI.lastResults = renderedResults;

      CLIQZ.UI.stopProgressBar();

      return renderedResults;
    },
    setTheme: function (incognito = false) {
      window.document.body.style.backgroundColor = incognito ? '#4a4a4a' : '#E8E8E8';
    },
    setMobileBasedUrls: function  (o) {
      if (!o) return;
      const url = o.data && o.data.mobile_url;
      if (o.val) {
        o.val = url || o.val;
      }
      if (o.url) {
        o.url = url || o.url;
      }
      if (o.url && o.m_url) {
        o.url = o.m_url;
      }
      for (let i in o) {
        if (typeof(o[i]) === 'object') {
            UI.setMobileBasedUrls(o[i]);
        }
      }
    },
    results: function (r) {

      UI.currentPage = 0;
      viewPager.goToIndex(UI.currentPage);
      UI.setMobileBasedUrls(r);

      setCardCountPerPage(window.innerWidth);

      UI.setDimensions();

      var engine = CliqzUtils.getDefaultSearchEngine();
      var details = CliqzUtils.getDetailsFromUrl(engine.url);
      var logo = CliqzUtils.getLogoDetails(details);

      var enhancedResults = enhanceResults(r._results);

      currentResults = {
        searchString: r._searchString,
        frameWidth: UI.CARD_WIDTH,
        results: enhancedResults,
        isInstant: false,
        isMixed: true,
        googleThis: {
          title: CliqzUtils.getLocalizedString('mobile_more_results_title'),
          action: CliqzUtils.getLocalizedString('mobile_more_results_action', engine.name),
          left: UI.CARD_WIDTH * enhancedResults.length,
          frameWidth: UI.CARD_WIDTH,
          searchString: encodeURIComponent(r._searchString),
          searchEngineUrl: engine.url,
          logo: logo,
          background: logo.backgroundColor
        }
      };
        var query = currentResults.searchString || '';

        if (imgLoader) imgLoader.stop();

        // Results that are not ready (extra results, for which we received a callback_url)
        var asyncResults = currentResults.results.filter(assessAsync(true));
        currentResults.results = currentResults.results.filter(assessAsync(false));

        redrawDropdown(handlebars.tplCache.results(currentResults), query);

        if (asyncResults.length) loadAsyncResult(asyncResults, query);

        imgLoader = new UI.DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
        imgLoader.start();

        crossTransform(resultsBox, 0);

        setResultNavigation(currentResults.results);

        return currentResults.results;
    },
    VIEWS: {},
    initViewpager: function () {
        var views = {},
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


            CliqzUtils.telemetry({
              type: 'activity',
              action: 'swipe',
              swipe_direction: page > UI.currentPage ? 'right' : 'left',
              current_position: page,
              views: views[page],
              prev_position: UI.currentPage,
              prev_display_time: Date.now() - pageShowTs
            });

            pageShowTs = Date.now();

            UI.currentPage = page;
          }
        });
    },
    hideResultsBox: function () {
          resultsBox.style.display = 'none';
    },
    updateSearchCard: function (engine) {
      var engineDiv = document.getElementById('defaultEngine');
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
      progress = document.getElementById('progress'),
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
      document.getElementById('progress').style.width = '0px';
    },
    isSearch: function () {
      return resultsBox && resultsBox.style.display === 'block';
    }
};

function setCardCountPerPage(windowWidth) {
  UI.nCardsPerPage = Math.floor(windowWidth / 320) || 1;
}


function loadAsyncResult(res, query) {
    for (var i in res) {
      var r = res[i];
      var qt = query + ": " + new Date().getTime();
      CliqzUtils.log(r,"LOADINGASYNC");
      CliqzUtils.log(query,"loadAsyncResult");
      var loop_count = 0;
      var async_callback = function (req) {
          CliqzUtils.log(query,"async_callback");
          var resp = null;
          try {
            resp = JSON.parse(req.response).results[0];
          }
          catch(err) {
            res.splice(i,1);
          }
          if (resp &&  CliqzAutocomplete.lastSearch === query) {

            var kind = r.data.kind;
            if ("__callback_url__" in resp.data) {
                // If the result is again a promise, retry.
                if (loop_count < 10 /*smartCliqzMaxAttempts*/) {
                  setTimeout(function () {
                    loop_count += 1;
                    CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                  }, 100 /*smartCliqzWaitTime*/);
                }
                else if (!currentResults.results.length) {
                  redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                }
            }
            else {
              r.data = resp.data;
              r.url = resp.url;
              r.data.kind = kind;
              r.data.subType = resp.subType;
              r.data.trigger_urls = resp.trigger_urls;
              r.vertical = getVertical(r);
              r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
              r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

              if (resultsBox && CliqzAutocomplete.lastSearch === query) {
                  // Remove all existing extra results
                  currentResults.results = currentResults.results.filter(function (r) { return r.type !== 'cliqz-extra'; } );
                  // add the current one on top of the list
                  currentResults.results.unshift(r);

                  if (currentResults.results.length) {
                    redrawDropdown(handlebars.tplCache.results(currentResults), query);
                  }
                  else {
                    redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                  }
                  imgLoader = new UI.DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
                  imgLoader.start();
              }
            }
          }
          // to handle broken promises (eg. Weather and flights) on mobile
          else if (r.data && r.data.__callback_url__) {
            shiftResults();
          }
          else {
            res.splice(i,1);
            if (!currentResults.results.length) {
              redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
            }
          }

      };
      CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
    }
}


function assessAsync(getAsync) {
    return function (result) {
        var isAsync = result.type === 'cliqz-extra' && result.data && '__callback_url__' in result.data ;
        return getAsync ? isAsync : !isAsync;
    };
}

function redrawDropdown(newHTML) {
    resultsBox.style.display = 'block';

    resultsBox.innerHTML = newHTML;
}

function getVertical(result) {
  // if history records are less than 3 it goes to generic
  let template;
  if (result.data.template === 'pattern-h3') {
    template = 'history';
  } else if (CliqzUtils.TEMPLATES[result.data.superTemplate]) {
      template = result.data.superTemplate;
  } else if(CliqzUtils.TEMPLATES[result.data.template]) {
    template = result.data.template
  } else {
    template = 'generic';
  }
  return template;
}

function enhanceResults(results) {
  let enhancedResults = [];
  results.forEach((r, index) => {
    const _tmp = getDebugMsg(r.comment || '');
    const url = r.val || '';
    const urlDetails = CliqzUtils.getDetailsFromUrl(url);

    enhancedResults.push(enhanceSpecificResult({
      query: r.query,
      type: r.style,
      left: (UI.CARD_WIDTH * index),
      data: r.data || {},
      url,
      urlDetails,
      logo: CliqzUtils.getLogoDetails(urlDetails),
      title: _tmp[0],
      debug: _tmp[1]
    }));
  });

  let filteredResults = enhancedResults.filter(function (r) { return !(r.data && r.data.adult); });

  // if there no results after adult filter - show no results entry
  if (!filteredResults.length) {
    filteredResults.push(CliqzUtils.getNoResults());
    filteredResults[0].vertical = 'noResult';
  }

  return filteredResults;
}

// debug message are at the end of the title like this: "title (debug)!"
function getDebugMsg(fullTitle) {
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if (fullTitle === null) {
      return [null, null];
    }
    const r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/);
    if (r && r.length >= 3) {
      return [r[1], r[2]];
    }
    else {
      return [fullTitle, null];
    }
}

function enhanceSpecificResult(r) {
  const contentArea = {
    width: UI.CARD_WIDTH,
    height: window.screen.height
  };

  if (r.subType && JSON.parse(r.subType).ez) {
      // Indicate that this is a RH result.
      r.type = 'cliqz-extra';
  }

  const template = r.vertical = getVertical(r);

  const specificView = UI.VIEWS[template] || UI.VIEWS.generic;
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

            var card = document.getElementsByClassName('card')[UI.currentPage];
            var cardPosition = card.getBoundingClientRect();
            var coordinate = [ev.clientX - cardPosition.left, ev.clientY - cardPosition.top, UI.CARD_WIDTH];

            var signal = {
                type: 'activity',
                action: 'result_click',
                extra: extra,
                mouse: coordinate,
                position_type: getResultKind(el),
                current_position: UI.currentPage
            };

            CliqzUtils.telemetry(signal);
            CliqzUtils.openLink(window, url);
            return;

        } else if (action) {
            switch (action) {
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    CliqzUtils.copyResult(document.getElementById('calc-answer').innerHTML);
                    document.getElementById('calc-copied-msg').style.display = '';
                    document.getElementById('calc-copy-msg').style.display = 'none';
                    break;
            }
        }

        if (el.className === FRAME) break; // do not go higher than a result
        el = el.parentElement;
    }
}

function shiftResults() {
  var frames = document.getElementsByClassName('frame');
  for (var i = 0; i < frames.length; i++) {
    var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
    left = parseInt(left);
    left -= (left / (i + 1));
    UI.lastResults[i] && (UI.lastResults[i].left = left);
    frames[i].style.left = left + 'px';
  }
  setResultNavigation(UI.lastResults);
}


function setResultNavigation(results) {

  var showGooglethis = 1;
  if (!results[0] || results[0].data.template === 'noResult') {
    showGooglethis = 0;
  }

  resultsBox.style.width = window.innerWidth + 'px';
  resultsBox.style.marginLeft = PEEK + 'px';


  var lastResultOffset = results.length ? results[results.length - 1].left || 0 : 0;

  currentResultsCount = lastResultOffset / UI.CARD_WIDTH + showGooglethis + 1;

  // get number of pages according to number of cards per page
  UI.nPages = Math.ceil(currentResultsCount / UI.nCardsPerPage);

  if (document.getElementById('currency-tpl')) {
    document.getElementById('currency-tpl').parentNode.removeAttribute('url');
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
    const frames = document.getElementsByClassName(FRAME);
    for (let i = 0; i < frames.length; i++) {
      let left = UI.CARD_WIDTH * i;
      frames[i].style.left = left + 'px';
      UI.lastResults[i] && (UI.lastResults[i].left = left);
      frames[i].style.width = UI.CARD_WIDTH + 'px';
    }
    setResultNavigation(UI.lastResults);
    UI.currentPage = Math.floor(UI.currentPage * lastnCardsPerPage / UI.nCardsPerPage);
    viewPager.goToIndex(UI.currentPage, 0);
  }, 200);

});

window.addEventListener('disconnected', function () {
  let elem = document.getElementById('reconnecting');
  elem && (elem.innerHTML = '<h3>'+CliqzUtils.getLocalizedString('mobile_reconnecting_msg')+'</h3>');
});

window.addEventListener('connected', function () {
  let elem = document.getElementById('reconnecting');
  elem && (elem.innerHTML = '');
});

function loadViews() {
  UI.clickHandlers = {};
  Object.keys(CliqzHandlebars.TEMPLATES).concat(CliqzHandlebars.MESSAGE_TEMPLATES).concat(CliqzHandlebars.PARTIALS).forEach(function (templateName) {
    UI.VIEWS[templateName] = Object.create(null);
    try {
      let module = System.get('mobile-ui/views/' + templateName);
      if (module) {
        UI.VIEWS[templateName] = new module.default(window);

        if (UI.VIEWS[templateName].events && UI.VIEWS[templateName].events.click) {
          Object.keys(UI.VIEWS[templateName].events.click).forEach(function (selector) {
            UI.clickHandlers[selector] = UI.VIEWS[templateName].events.click[selector];
          });
        }
      } else {
        CliqzUtils.log('failed to load ' + templateName, 'UI');
      }
    } catch (ex) {
      CliqzUtils.log(ex, 'UI');
    }
  });
}

export default UI;
    