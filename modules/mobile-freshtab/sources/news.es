/* global CustomEvent, window, document, osAPI */

import LongPress from 'mobile-touch/longpress';
import CliqzHandlebars from 'core/templates';
import CliqzUtils from 'core/utils';

var DEPENDENCY_STATUS = {
  NOT_LOADED: 'NOT_LOADED',
  LOADED: 'LOADED',
  GIVE_UP: 'GIVE_UP',
  RETRY_LIMIT: 20,
  retryCount: {}
};

var topSitesList = [], tempBlockedTopSites = [], newsVersion, displayedTopSitesCount, TOPSITES_LIMIT = 5;

function displayTopSites (list, isEditMode = false) {

  const blockedTopSites = CliqzUtils.getLocalStorage().getObject('blockedTopSites', []);

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

  const topSites = CliqzHandlebars.tplCache.topsites;
  const div = document.getElementById('topSites');
  const theme = (CliqzUtils.getPref('incognito', false) === 'true' ? 'incognito' : 'standard');
  div.innerHTML = topSites({isEmpty, isEditMode, list, theme});


  CliqzUtils.addEventListenerToElements('#doneEditTopsites', 'click', _ => {
    const blockedTopSites = CliqzUtils.getLocalStorage().getObject('blockedTopSites', []);
    CliqzUtils.getLocalStorage().setObject('blockedTopSites', blockedTopSites.concat(tempBlockedTopSites));
    tempBlockedTopSites = [];
    displayTopSites(topSitesList);
  });

  CliqzUtils.addEventListenerToElements('#cancelEditTopsites', 'click', _ => {
    tempBlockedTopSites = [];
    displayTopSites(topSitesList);
  });

  CliqzUtils.addEventListenerToElements('.blockTopsite', 'click', function () {
    tempBlockedTopSites.push(this.getAttribute('mainDomain'));
    displayTopSites(topSitesList, true);
  });

  function onLongpress () {
    displayTopSites(topSitesList, true);
  }

  function onTap (element) {
    osAPI.openLink(element.getAttribute('url'));
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target_type: 'topsites',
      target_index: element.dataset.index
    });
  }

  new LongPress('.topSitesLink', onLongpress, onTap);

}

function deduplicateTopsites(list) {
  let domains = {};
  return list.filter(item => !domains[item.mainDomain] && (domains[item.mainDomain] = true));
}

var News = {
  GENERIC_NEWS_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de',
  _recentHistory: {},
  getNews: function() {
    log('loading news');

    let method = 'GET',
    callback = function(data) {
        try {
            const sResponse = JSON.parse(data.responseText);
            newsVersion = sResponse.results[0].news_version;
            News.displayTopNews(sResponse.results[0].articles);
        } catch(e) {
            log(e);
        }
    },
    onerror = function() {
      log('news error', arguments);
      setTimeout(News.getNews, 1500);
    },
    timeout = function() {
      log('timeout error', arguments);
      News.getNews();
    },
    data = null;
    CliqzUtils.httpHandler(method, News.GENERIC_NEWS_URL, callback, onerror, timeout, data);

  },
  displayTopNews: function(top_news) {
    if(!top_news) {
      return;
    }

    top_news = top_news.map(function(r){
      const details = CliqzUtils.getDetailsFromUrl(r.url);
      const logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        description: r.description,
        short_title: r.short_title || r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        type: r.type,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      };
    });
    top_news = top_news.splice(0, 2);
    const dependencyStatus = News.getDependencyStatus('topnews');
    if(dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
      return setTimeout(News.displayTopNews, 100, top_news);
    } else if(dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
      return;
    }
    const topNews = CliqzHandlebars.tplCache.topnews;
    const div = document.getElementById('topNews');
    div.innerHTML = topNews(top_news);
    CliqzUtils.addEventListenerToElements('.topNewsLink', 'click', function () {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topnews',
        target_index: this.dataset.index
      });
    });
    window.dispatchEvent(new CustomEvent('newsLoadingDone'));

    CliqzUtils.telemetry({
      'type': 'home',
      'action': 'display',
      'historysites': displayedTopSitesCount,
      'topnews_version': newsVersion
    });
  },

  getRecentHistory: function (history) {
    history.results.forEach(result => News._recentHistory[result.url] = true);
  },
  startPageHandler: function (list) {
    const dependencyStatus = News.getDependencyStatus('topsites');
    if(dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
      return setTimeout(News.startPageHandler, 100, list);
    } else if(dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
      return;
    }

    News.getNews();

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
  // wait for logos, templates, and locale to be loaded
  getDependencyStatus: function(template) {
    if(DEPENDENCY_STATUS.retryCount[template] === undefined) {
      DEPENDENCY_STATUS.retryCount[template] = 0;
    }
    if(!CliqzUtils.BRANDS_DATABASE.buttons || !CliqzHandlebars.tplCache[template]) {
      return DEPENDENCY_STATUS.retryCount[template]++ < DEPENDENCY_STATUS.RETRY_LIMIT ? DEPENDENCY_STATUS.NOT_LOADED : DEPENDENCY_STATUS.GIVE_UP;
    }
    DEPENDENCY_STATUS.retryCount[template] = 0;
    return DEPENDENCY_STATUS.LOADED;
  }
};

function log() {
  CliqzUtils.log(arguments, 'News');
}
export default News;
