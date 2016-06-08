'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

import DelayedImageLoader from "mobile-ui/DelayedImageLoader";

//TODO: improve loading of these views!
import v1 from "mobile-ui/views/currency";
import v2 from "mobile-ui/views/entity-generic";
import v3 from "mobile-ui/views/generic";
import v4 from "mobile-ui/views/hq";
import v6 from "mobile-ui/views/local-data-sc";
import v7 from "mobile-ui/views/stocks";
import v8 from "mobile-ui/views/weatherAlert";
import v9 from "mobile-ui/views/weatherEZ";

var resultsBox = null,
    currentResults = null,
    imgLoader = null,
    progressBarInterval = null,
    PEEK = 20,
    PADDING = 16,
    currentResultsCount = 0,
    FRAME = 'frame';

var UI = {
    CARD_WIDTH: 0,
    init: function(){
        //check if loading is done
        if(!CliqzHandlebars.tplCache.main)return;
        var box = document.getElementById('results');
        box.innerHTML = CliqzHandlebars.tplCache.main();

        resultsBox = document.getElementById('cliqz-results', box);
        resultsBox.addEventListener('click', resultClick);
    },
    setDimensions: function() {
      UI.CARD_WIDTH = window.innerWidth - PADDING - 2 * PEEK;
    },
    results: function(r){
      UI.setDimensions();

      var engine = CLIQZEnvironment.getDefaultSearchEngine();
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
          logo: logo
        }
      }
        var query = currentResults.searchString || '';

        if (imgLoader) imgLoader.stop();

        // Results that are not ready (extra results, for which we received a callback_url)
        var asyncResults = currentResults.results.filter(assessAsync(true));
        currentResults.results = currentResults.results.filter(assessAsync(false));

        //TODO copy async
        redrawDropdown(CliqzHandlebars.tplCache.results(currentResults), query);

        if(asyncResults.length > 0) loadAsyncResult(asyncResults, query);

        imgLoader = new DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
        imgLoader.start();

        crossTransform(resultsBox, 0);
        setCardsHeight();

        setResultNavigation(currentResults.results);

        return currentResults;
    },
    VIEWS: {},
    initViewpager: function(numberPages) {
        var views = {},
            pageShowTs = Date.now(),
            innerWidth = window.innerWidth,
            offset = 0;

        crossTransform(resultsBox, Math.min((offset * innerWidth), (innerWidth * currentResultsCount)));

        return new ViewPager(resultsBox, {
          pages: numberPages,
          dragSize: window.innerWidth,
          prevent_all_native_scrolling: false,
          vertical: false,
          anim_duration:400,
          onPageScroll : function (scrollInfo) {
            offset = -scrollInfo.totalOffset;
            crossTransform(resultsBox, (offset * UI.CARD_WIDTH));
          },

          onPageChange : function (page) {
            page = Math.abs(page);
            if(page === CLIQZEnvironment.currentPage || !isSearch()) return;

            views[page] = (views[page] || 0) + 1;


            CliqzUtils.telemetry({
              type: 'activity',
              action: 'swipe',
              swipe_direction:
                page > CLIQZEnvironment.currentPage ? 'right' : 'left',
              current_position: page,
              views: views[page],
              prev_position: CLIQZEnvironment.currentPage,
              prev_display_time: Date.now() - pageShowTs
            });

            pageShowTs = Date.now();

            CLIQZEnvironment.currentPage = page;
          }
        });
    },
    hideResultsBox: function() {
          resultsBox.style.display = 'none';
    },
    updateSearchCard: function(engine) {
      var engineDiv = document.getElementById('defaultEngine');
      if(engineDiv && CliqzAutocomplete.lastSearch) {
        engineDiv.setAttribute('url', engine.url + encodeURIComponent(CliqzAutocomplete.lastSearch));
        var moreResults = document.getElementById('moreResults');
        moreResults && (moreResults.innerHTML = CliqzUtils.getLocalizedString('mobile_more_results_action', engine.name));
        var noResults = document.getElementById('noResults');
        noResults && (noResults.innerHTML = CliqzUtils.getLocalizedString('mobile_no_result_action', engine.name));
      }
    },
    startProgressBar: function() {
      if(progressBarInterval) {
        clearInterval(progressBarInterval);
      }
      var multiplier = parseInt(Math.ceil(window.innerWidth/100)),
      progress = document.getElementById('progress'),
      i = 0;
      progressBarInterval = setInterval(function() {
        i++;
        progress.style.width = (i*multiplier)+'px';
      },20);

      setTimeout(UI.stopProgressBar,4000);
    },

    stopProgressBar: function() {
      if(progressBarInterval) {
        clearInterval(progressBarInterval);
      }
      document.getElementById('progress').style.width = '0px';
    }
};

function loadAsyncResult(res, query) {
    for (var i in res) {
      var r = res[i];
      var query = r.text || r.query;
      var qt = query + ": " + new Date().getTime();
      CliqzUtils.log(r,"LOADINGASYNC");
      CliqzUtils.log(query,"loadAsyncResult");
      var loop_count = 0;
      var async_callback = function(req) {
          CliqzUtils.log(query,"async_callback");
          var resp = null;
          try {
            resp = JSON.parse(req.response).results[0];
          }
          catch(err) {
            res.splice(i,1);
          }
          if (resp &&  CliqzAutocomplete.lastSearch == query) {

            var kind = r.data.kind;
            if ("__callback_url__" in resp.data) {
                // If the result is again a promise, retry.
                if (loop_count < 10 /*smartCliqzMaxAttempts*/) {
                  setTimeout(function() {
                    loop_count += 1;
                    CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                  }, 100 /*smartCliqzWaitTime*/);
                }
                else if (currentResults.results.length == 0) {
                  redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                }
            }
            else {
              r.data = resp.data;
              r.url = resp.url;
              r.data.kind = kind;
              r.data.subType = resp.subType;
              r.data.trigger_urls = resp.trigger_urls;
              r.vertical = r.data.template;
              r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
              r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

              if(resultsBox && CliqzAutocomplete.lastSearch == query) {
                  // Remove all existing extra results
                  currentResults.results = currentResults.results.filter(function(r) { return r.type != "cliqz-extra"; } );
                  // add the current one on top of the list
                  currentResults.results.unshift(r);

                  if (currentResults.results.length > 0) {
                    redrawDropdown(CliqzHandlebars.tplCache.results(currentResults), query);
                  }
                  else {
                    redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                  }
              }
            }
          }
          // to handle broken promises (eg. Weather and flights) on mobile
          else if (r.data && r.data.__callback_url__) {
            shiftResults();
          }
          else {
            res.splice(i,1);
            if (currentResults.results.length == 0)
              redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
          }

      };
      CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
    }
}


function assessAsync(getAsync){
    return function(result){
        var isAsync = result.type == "cliqz-extra" && result.data && "__callback_url__" in result.data ;
        return getAsync ? isAsync : !isAsync;
    }
}

function redrawDropdown(newHTML){
    resultsBox.style.display = 'block';

    resultsBox.innerHTML = newHTML;
}

function enhanceResults(results){
    for(var i=0; i<results.length; i++) {
        var r = results[i];
        r.type = r.style;
        r.left = (UI.CARD_WIDTH * i);
        r.url = r.val || '';
        r.title = r.comment || '';

        r.data = r.data || {};

        enhanceSpecificResult(r);

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
        r.vertical = (r.data.template && CLIQZEnvironment.TEMPLATES.hasOwnProperty(r.data.template)) ? r.data.template : 'generic';

        //extract debug info from title
        var _tmp = getDebugMsg(r.title);
        r.title = _tmp[0];
        r.debug = _tmp[1];


    }
    var filteredResults = results.filter(function(r){ return !(r.data && r.data.adult); });

    // if there no results after adult filter - show no results entry
    if(filteredResults.length == 0){
      filteredResults.push(CliqzUtils.getNoResults());
      filteredResults[0].vertical = 'noResult';
    }

    return filteredResults
}

// debug message are at the end of the title like this: "title (debug)!"
function getDebugMsg(fullTitle){
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if(fullTitle === null) {
      return [null, null];
    }
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/)
    if(r && r.length >= 3)
        return [r[1], r[2]]
    else
        return [fullTitle, null]
}

function enhanceSpecificResult(r) {
    var specificView;
    if (r.subType && JSON.parse(r.subType).ez) {
        // Indicate that this is a RH result.
        r.type = "cliqz-extra";
    }
    if(r.data.superTemplate && CLIQZEnvironment.TEMPLATES.hasOwnProperty(r.data.superTemplate)) {
        r.data.template = r.data.superTemplate;
    }

    specificView = UI.VIEWS[r.data.template] || UI.VIEWS.generic;
    if (specificView && specificView.enhanceResults) {
        specificView.enhanceResults(r.data);
    }

    if(r.data.news) {
      r.data.news.forEach(function(article) {
        var urlDetails = CliqzUtils.getDetailsFromUrl(article.url),
        logoDetails = CliqzUtils.getLogoDetails(urlDetails);
        article.logo = logoDetails;
      });
    }
}

function crossTransform (element, x) {
  var platforms = ['', '-webkit-', '-ms-'];
  platforms.forEach(function(platform) {
    element.style[platform + 'transform'] = 'translate3d('+ x +'px, 0px, 0px)';
  });
}

function setCardsHeight() {
  var ezs = document.getElementsByClassName('cqz-result-box');

  var body = document.body,
      documentElement = document.documentElement,
      height;

  if (typeof document.height !== 'undefined') {
    height = document.height; // For webkit browsers
  } else {
    height = Math.max( body.scrollHeight, body.offsetHeight,documentElement.clientHeight, documentElement.scrollHeight, documentElement.offsetHeight );
  }

  for(var i=0; i < ezs.length; i++) {
    ezs[i].style.height = null;
    if(ezs[i].clientHeight+40 < height) {
      ezs[i].style.height = height-40 + 'px';
    }
  }
}

function getResultKind(el){
    return getResultOrChildAttr(el, 'kind').split(';');
}

// bubbles up maximum to the result container
function getResultOrChildAttr(el, attr){
  if(el == null) return '';
  if(el.className == FRAME) return el.getAttribute(attr) || '';
  return el.getAttribute(attr) || getResultOrChildAttr(el.parentElement, attr);
}

function resultClick(ev) {
    var el = ev.target, url,
        extra,
        action;

    while (el) {
        extra = extra || el.getAttribute("extra");
        url = el.getAttribute('url');
        action = el.getAttribute('cliqz-action');

        if (url && url != "#") {

            var card = document.getElementsByClassName('card')[CLIQZEnvironment.currentPage];
            var cardPosition = card.getBoundingClientRect();
            var coordinate = [ev.clientX - cardPosition.left, ev.clientY - cardPosition.top, UI.CARD_WIDTH];

            var signal = {
                action: "result_click",
                extra: extra,
                mouse: coordinate,
                position_type: getResultKind(el)
            };

            CliqzUtils.telemetry(signal);
            CLIQZEnvironment.openLink(window, url);
            return;

        } else if (action) {
            switch (action) {
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    CLIQZEnvironment.copyResult(document.getElementById('calc-answer').innerHTML);
                    document.getElementById('calc-copied-msg').style.display = "";
                    document.getElementById('calc-copy-msg').style.display = "none";
                    break;
            }
        }

        if (el.className == FRAME) break; // do not go higher than a result
        el = el.parentElement;
    }
}

function shiftResults() {
  var frames = document.getElementsByClassName('frame');
  for (var i = 0; i < frames.length; i++) {
    var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
    left = parseInt(left);
    left -= (left / (i + 1));
    CLIQZEnvironment.lastResults[i] && (CLIQZEnvironment.lastResults[i].left = left);
    frames[i].style.left = left + 'px';
  }
  setResultNavigation(CLIQZEnvironment.lastResults);
}


function setResultNavigation(results) {

  var showGooglethis = 1;
  if(!results[0] || results[0].data.template === 'noResult') {
    showGooglethis = 0;
  }

  resultsBox.style.width = (window.innerWidth * (results.length + showGooglethis)) + 'px';
  resultsBox.style.marginLeft = PEEK + 'px';


  var lastResultOffset = results.length ? results[results.length - 1].left || 0 : 0;

  currentResultsCount = lastResultOffset / UI.CARD_WIDTH + showGooglethis + 1;

  if( typeof CLIQZEnvironment.vp !== 'undefined' ) {
    CLIQZEnvironment.vp.destroy();
  }
  CLIQZEnvironment.currentPage = 0;
  CLIQZEnvironment.vp = UI.initViewpager(currentResultsCount);

  // CLIQZEnvironment.vp.goToIndex(1,0);

  if(document.getElementById('currency-tpl')) {
    document.getElementById('currency-tpl').parentNode.removeAttribute('url');
  }

}

function isSearch() {
  return resultsBox && resultsBox.style.display === 'block';
};

var resizeTimeout;
window.addEventListener('resize', function () {
  if(!isSearch()) return;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function () {
    UI.setDimensions();
    var w = window.innerWidth;
    var frames = document.getElementsByClassName(FRAME);
    var i;
    for(i=0;i<frames.length;i++) {
      frames[i].style.left = (UI.CARD_WIDTH*i) +"px";
      frames[i].style.width = UI.CARD_WIDTH+"px";
    }

    CLIQZEnvironment.vp.goToIndex(CLIQZEnvironment.currentPage,0);

    setCardsHeight();
    }, 50);

});

window.addEventListener('disconnected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.innerHTML = '<h3>'+CliqzUtils.getLocalizedString('mobile_reconnecting_msg')+'</h3>');
});

window.addEventListener('connected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.innerHTML = '');
});


UI.clickHandlers = {};
Object.keys(CliqzHandlebars.TEMPLATES).concat(CliqzHandlebars.MESSAGE_TEMPLATES).concat(CliqzHandlebars.PARTIALS).forEach(function (templateName) {
  UI.VIEWS[templateName] = Object.create(null);
  try {
    var module = System.get("mobile-ui/views/"+templateName);
    if (module) {
      UI.VIEWS[templateName] = new module.default(window);

      if(UI.VIEWS[templateName].events && UI.VIEWS[templateName].events.click){
        Object.keys(UI.VIEWS[templateName].events.click).forEach(function (selector) {
          UI.clickHandlers[selector] = UI.VIEWS[templateName].events.click[selector];
        });
      }
    }
  } catch (ex) {
    CliqzUtils.log(ex, 'UI');
  }
});

export default UI;
