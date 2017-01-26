/* global CustomEvent, osAPI */

import CliqzUtils from 'core/utils';
import Storage from 'core/storage';
import { window, document, Hammer } from 'mobile-ui/webview';

const storage = new Storage();

let topSitesList = [], tempBlockedTopSites = [], newsVersion, displayedTopSitesCount;
const TOPSITES_LIMIT = 5, NEWS_LIMIT = 2;

function displayTopSites (list, isEditMode = false) {

  const blockedTopSites = storage.getObject('blockedTopSites', []);

  list = deduplicateTopsites(list);

  list = list.filter(item => blockedTopSites.indexOf(item.mainDomain) === -1);

  list = list.filter(item => tempBlockedTopSites.indexOf(item.mainDomain) === -1);

  displayedTopSitesCount = Math.min(list.length, TOPSITES_LIMIT);

  list = list.map(function (r) {
    const details = CliqzUtils.getDetailsFromUrl(r.url);
    const logo = CliqzUtils.getLogoDetails(details);
    return {
      title: r.title,
      displayUrl: details.domain || r.title,
      url: r.url,
      text: logo.text,
      backgroundColor: logo.backgroundColor,
      buttonsClass: logo.buttonsClass,
      style: logo.style,
      mainDomain: r.mainDomain,
      baseDomain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[0],
      domain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1]
    };
  });

  const isEmpty = list.length ? false : true;

  list = list.concat(Array(TOPSITES_LIMIT).fill(''));
  list = list.splice(0, TOPSITES_LIMIT);

  const div = document.getElementById('topSites');
  div.innerHTML = CLIQZ.freshtabTemplates.topsites({isEmpty, isEditMode, list});


  CliqzUtils.addEventListenerToElements('#doneEditTopsites', 'click', _ => {
    const delete_count = tempBlockedTopSites.length;
    const blockedTopSites = storage.getObject('blockedTopSites', []);
    storage.setObject('blockedTopSites', blockedTopSites.concat(tempBlockedTopSites));
    tempBlockedTopSites = [];
    displayTopSites(topSitesList);
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target: 'confirm_delete',
      count: displayedTopSitesCount,
      delete_count
    });
  });

  CliqzUtils.addEventListenerToElements('#cancelEditTopsites', 'click', () => {
    const delete_count = tempBlockedTopSites.length;
    tempBlockedTopSites = [];
    displayTopSites(topSitesList);
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target: 'cancel_delete',
      count: displayedTopSitesCount,
      delete_count
    });
  });

  CliqzUtils.addEventListenerToElements('.blockTopsite', 'click', function ({ target:element }) {
    tempBlockedTopSites.push(this.getAttribute('mainDomain'));
    displayTopSites(topSitesList, true);
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target: 'delete_topsite',
      count: displayedTopSitesCount,
      index: element.dataset.index
    });
  });

  function onLongpress ({ target: element }) {
    displayTopSites(topSitesList, true);
    CliqzUtils.telemetry({
      type: 'home',
      action: 'longpress',
      target: 'topsite',
      count: displayedTopSitesCount,
      index: element.dataset.index
    });
  }

  function onTap ({ target: element }) {
    osAPI.openLink(element.dataset.url);
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target_type: 'topsites',
      target_index: element.dataset.index
    });
  }

  const elements = document.querySelectorAll('.topSitesLink');
  for (let i = 0; i < elements.length; i++) {
    new Hammer(elements[i]).on('tap', onTap);
    new Hammer(elements[i]).on('press', onLongpress);
  }

}

function deduplicateTopsites(list) {
  let domains = {};
  return list.filter(item => !domains[item.mainDomain] && (domains[item.mainDomain] = true));
}

var News = {
  lastShowTime: 0,
  GENERIC_NEWS_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de',
  _recentHistory: {},
  getNews: function(url) {
    log('loading news');

    let method = 'PUT',
    callback = function(data) {
        try {
            const sResponse = JSON.parse(data.responseText);
            console.log('---- RH Response ----', sResponse);
            newsVersion = sResponse.results[0].snippet.extra.news_version;
            News.displayTopNews(sResponse.results[0].snippet.extra.articles);
        } catch(e) {
            log(e);
        }
    },
    onerror = function() {
      log('news error', arguments);
      setTimeout(News.getNews, 1500, url);
    },
    timeout = function() {
      log('timeout error', arguments);
      News.getNews(url);
    },
    data = {
      q: '',
      results: [
        {
          url: 'rotated-top-news.cliqz.com',
          snippet: {}
        }
      ]
    };
    CliqzUtils.httpHandler(method, url, callback, onerror, timeout, JSON.stringify(data));

  },
  displayTopNews: function(news) {
    if(!news) {
      return;
    }

    news = news.map(function(r){
      const details = CliqzUtils.getDetailsFromUrl(r.url);
      const logo = CliqzUtils.getLogoDetails(details);
      const type = r.breaking ? 'breakingnews' : 'topnews';
      return {
        breaking: r.breaking,
        title: r.title,
        description: r.description,
        short_title: r.short_title || r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style,
        type,
      };
    });
    news = news.splice(0, NEWS_LIMIT);
    const div = document.getElementById('topNews');
    div.innerHTML = CLIQZ.freshtabTemplates.topnews(news);
    CliqzUtils.addEventListenerToElements('.answer', 'click', function ({ currentTarget: item, target: element}) {
      osAPI.openLink(item.dataset.url)
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: item.dataset.type,
        element: element.dataset.extra,
        index: item.dataset.index,
      });
    });
    window.dispatchEvent(new CustomEvent('newsLoadingDone'));
    const breakingnews_count = news.reduce((count, item) => item.breaking ? count + 1 : count, 0);
    const topnews_count = news.length - breakingnews_count;
    CliqzUtils.telemetry({
      type: 'home',
      action: 'show',
      topsite_count: displayedTopSitesCount,
      topnews_version: newsVersion,
      topnews_count,
      breakingnews_count,
    });
  },

  getRecentHistory: function (history) {
    history.results.forEach(result => News._recentHistory[result.url] = true);
  },
  startPageHandler: function (list) {
    if (CliqzUtils.getPref("incognito") === "true") {
      return;
    }

    News.lastShowTime = Date.now();

    News.getNews(CliqzUtils.RICH_HEADER + CliqzUtils.getRichHeaderQueryString(''));

    topSitesList = [];
    let domain, domainArr, mainDomain;
    for(var i=0; i<list.length; i++) {
      domain = list[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
      domainArr = domain.split('.');
      mainDomain = domainArr[domainArr.length-2].substr(0, 10);
      mainDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      list[i].mainDomain = mainDomain;
      topSitesList.push(list[i]);
    }

    displayTopSites(topSitesList);
  },

  sendHideTelemetry: function () {
    const showDuration = Date.now() - News.lastShowTime;
    CliqzUtils.telemetry({
      type: 'home',
      action: 'hide',
      show_duration: showDuration,
    });
  },
};

function log() {
  CliqzUtils.log(arguments, 'News');
}
export default News;
