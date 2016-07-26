/* global CustomEvent, window, document, CLIQZEnvironment, CliqzLanguage, CliqzUtils, CliqzHandlebars, osAPI */

import LongPress from 'mobile-touch/longpress';

var DEPENDENCY_STATUS = {
  NOT_LOADED: 'NOT_LOADED',
  LOADED: 'LOADED',
  GIVE_UP: 'GIVE_UP',
  RETRY_LIMIT: 20,
  retryCount: {}
};

var topSitesList = [];

var NEWS_DOMAINS = {238777345: true, 205726722: true, 168693251: true, 116229637: true, 796680: true, 146672137: true, 150921227: true, 108523534: true, 6124559: true, 143261715: true, 12929557: true, 100682630: true, 69293591: true, 143002826: true, 205798148: true, 177381402: true, 45585948: true, 248842781: true, 42941135: true, 113298437: true, 74275360: true, 68212258: true, 217546276: true, 113393926: true, 184245020: true, 11737641: true, 5759018: true, 240903211: true, 38094382: true, 77319610: true, 45291057: true, 107727411: true, 211123764: true, 136808501: true, 106867254: true, 101941303: true, 206470712: true, 9179572: true, 115867194: true, 245704031: true, 74661948: true, 245440575: true, 34623041: true, 239814667: true, 138353806: true, 15713350: true, 16120391: true, 71113800: true, 101589065: true, 77201485: true, 12235342: true, 83345677: true, 80880326: true, 44296786: true, 2511443: true, 135964756: true, 12722702: true, 138610627: true, 247843929: true, 141036122: true, 242153487: true, 79047610: true, 114601207: true, 2306320: true, 3780195: true, 113796197: true, 207641190: true, 4574823: true, 46500457: true, 78449258: true, 79476327: true, 83668076: true, 8639085: true, 101314158: true, 115675761: true, 239942081: true, 182576755: true, 77474825: true, 5982326: true, 10922616: true, 102241915: true, 169723599: true, 34606719: true, 111313536: true, 45490817: true, 82065538: true, 68105860: true, 70195478: true, 244682053: true, 173483201: true, 6296201: true, 15870603: true, 102881421: true, 243084430: true, 182872720: true, 147724433: true, 5891625: true, 183218837: true, 251470487: true, 70630552: true, 4454032: true, 9136283: true, 184420634: true, 182419617: true, 115978914: true, 147148965: true, 109152934: true, 181374631: true, 244002985: true, 71790765: true, 240115886: true, 146427852: true, 108380849: true, 172655282: true, 47479667: true, 213331124: true, 145917300: true, 145307935: true, 100667580: true, 74231485: true, 148999872: true, 38686913: true, 242132674: true, 109253315: true, 237890166: true, 1794758: true, 136180937: true, 73809610: true, 79569783: true, 145858766: true, 148531919: true, 80690384: true, 77777528: true, 14345939: true, 465620: true, 75759830: true, 69361267: true, 5320408: true, 2189348: true, 143166170: true, 108568271: true, 44469468: true, 216124125: true, 236458718: true, 235505375: true, 209425120: true, 141793488: true, 3439569: true, 208318327: true, 134687466: true, 76735094: true, 36104430: true, 181700849: true, 80218356: true, 73353973: true, 73348137: true, 108598008: true, 73453305: true, 6427775: true, 113652989: true, 201572094: true, 149024640: true, 76644610: true, 213411883: true, 13675268: true, 43951400: true, 9792262: true, 250929793: true, 77984132: true, 137528788: true, 69620493: true, 107003152: true, 44971794: true, 37350675: true, 251443988: true, 171558165: true, 104780054: true, 103752472: true, 102857348: true, 106180769: true, 81150235: true, 239458076: true, 248724254: true, 210663045: true, 102999840: true, 208083746: true, 113095973: true, 45315878: true, 5921576: true, 10276572: true, 112979754: true, 40762155: true, 207521902: true, 207458364: true, 75783985: true, 72713242: true, 6529331: true, 181698195: true, 79743113: true, 15923252: true, 76821306: true, 75387708: true, 117337888: true, 104278336: true, 145555265: true, 141155138: true, 150613827: true, 14817092: true, 67320133: true, 170718023: true, 214714184: true, 245292361: true, 242422332: true, 6525262: true, 240417088: true, 83508049: true, 201557843: true, 13942670: true, 142977877: true, 183456569: true, 171598683: true, 212983134: true, 71632735: true, 80485432: true, 243524240: true, 245082466: true, 39404899: true, 112652137: true, 106215399: true, 184043374: true, 72277360: true, 167796712: true, 143968607: true, 76965235: true, 180898825: true, 108090229: true, 1857910: true, 16295799: true, 16063865: true, 79320954: true, 789884: true, 249189098: true, 5357951: true, 150359424: true, 236142977: true, 141526403: true, 39472004: true, 201774982: true, 202902407: true, 76948360: true, 9392012: true, 175540202: true, 168119182: true, 175305615: true, 208726208: true, 3462868: true, 45794709: true, 6407576: true, 137825482: true, 136594333: true, 244434847: true, 178958752: true, 71039905: true, 74071458: true, 143121315: true, 4592036: true, 170085797: true, 241173928: true, 1271721: true, 77870507: true, 68737437: true, 244009288: true, 181502899: true, 180095924: true, 33802677: true, 72797110: true, 238595002: true, 76471229: true, 72705985: true, 140391363: true, 36616645: true, 141856929: true, 246096328: true, 46924745: true, 150613963: true, 6448076: true, 44614606: true, 81471951: true, 76971985: true, 78534610: true, 177036313: true, 67532110: true, 43531093: true, 177387947: true, 242783198: true, 69472735: true, 216355379: true, 111033825: true, 134355940: true, 140081125: true, 105372134: true, 47271399: true, 140910568: true, 70748137: true, 171773418: true, 173399207: true, 108705261: true, 243466225: true, 40583031: true, 82141174: true, 76431864: true, 237976063: true, 171363: true, 174373373: true, 148890453: true, 36909212: true, 71156889: true, 242204751: true, 149187007: true, 76484655: true, 147460736: true, 110344242: true, 77515611: true, 237422416: true, 139923274: true, 217706451: true, 113800544: true, 42041884: true, 105504157: true, 4157585: true, 137667936: true, 108843334: true, 205558795: true, 169382283: true, 76064334: true, 43103236: true, 182967959: true, 72270683: true, 171949145: true, 39527122: true, 37933409: true, 13956180: true, 40196024: true, 6355568: true, 180198292: true, 80093344: true, 215753398: true, 169904419: true, 137978005: true, 248734759: true, 48888990: true, 238098952: true, 15363587: true, 71950061: true, 149652911: true, 143998729: true, 3977446: true, 67904957: true, 75180473: true, 207882325: true, 2997498: true, 215437472: true, 38607057: true, 170940909: true, 81658130: true, 141454235: true, 41314131: true, 144944349: true, 37848620: true, 75446711: true, 234985930: true, 206528356: true, 112934951: true, 4021948: true, 4384695: true, 8996919: true, 79513675: true, 142675546: true, 174752059: true, 72712697: true, 210459977: true, 112434967: true, 82052855: true, 49945901: true, 136713798: true, 40389129: true, 136954268: true, 105365837: true, 144696931: true, 216243619: true, 5807052: true, 71759466: true, 106030056: true, 1355159: true, 174171886: true, 106652389: true, 34591468: true, 79676979: true, 74516787: true, 243466315: true, 168879163: true, 172455381: true, 243466268: true, 168156548: true, 33736488: true, 211939645: true, 6161388: true, 101023053: true, 37827792: true, 179374898: true, 247014589: true, 49369415: true, 79317962: true, 241863379: true, 75216604: true, 48573962: true, 37181072: true, 244209282: true, 34378709: true, 68531186: true, 239119048: true, 16553575: true, 2487332: true, 106463557: true, 109605547: true, 75099086: true, 140232211: true, 184542214: true, 243041052: true, 169904261: true, 145526129: true, 113436635: true, 172336998: true, 102430744: true, 37794597: true, 111149262: true, 80961546: true, 114075108: true, 78966730: true, 80443423: true, 148532105: true, 77071: true, 15971319: true, 9282076: true, 114467095: true, 72264310: true, 150066519: true, 243466254: true, 108671135: true, 143689046: true, 5972966: true, 169904458: true, 49548588: true, 10398446: true, 139925606: true, 43523480: true, 111257651: true, 45285918: true, 6397677: true, 79660549: true, 81969172: true, 9583554: true, 215164206: true, 242777366: true, 110038646: true, 71051945: true, 147530643: true, 101198513: true, 37775008: true};

function displayTopSites (list, isEditMode = false) {

  const blockedTopSites = CLIQZEnvironment.getLocalStorage().getObject('blockedTopSites', []);

  list = list.filter(item => blockedTopSites.indexOf(item.mainDomain) === -1);

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

  list = list.concat('', '', '', ''); // 4 empty topsites to fill
  list = list.splice(0, 4);

  const topSites = CliqzHandlebars.tplCache.topsites;
  const div = document.getElementById('topSites');
  div.innerHTML = topSites({isEmpty, isEditMode, list});


  CLIQZEnvironment.addEventListenerToElements('#doneEditTopsites', 'click', _ => displayTopSites(topSitesList));

  CLIQZEnvironment.addEventListenerToElements('.blockTopsite', 'click', function () {
    const blockedTopSites = CLIQZEnvironment.getLocalStorage().getObject('blockedTopSites', []);
    blockedTopSites.push(this.getAttribute('mainDomain'));
    CLIQZEnvironment.getLocalStorage().setObject('blockedTopSites', blockedTopSites);
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

var News = {
  GENERIC_NEWS_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de',
  _recentHistory: {},
  getNews: function(newsDomains) {
    log('loading news');
    let cachedNews = CLIQZEnvironment.getLocalStorage().getObject('freshTab-news');
    if (cachedNews && cachedNews['top_h_news']) {
      CLIQZEnvironment.getLocalStorage().setObject('freshTab-news',cachedNews.top_h_news);
      cachedNews = cachedNews.top_h_news;
    }
    if(cachedNews) {
      News.displayTopNews(cachedNews);
    }


    if(newsDomains) {

        let seen = {};
        newsDomains = newsDomains.filter(item => seen.hasOwnProperty(item) ? false : (seen[item] = true));

        let hashedDomains = [];
        newsDomains.forEach(domain => {
          const hash = CliqzUtils.hash(domain);
          if (NEWS_DOMAINS[hash]) {
            hashedDomains.push(hash);
          }
        });

        // history based news
        const method = 'GET',
        url = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com' + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale() + '&q=' + JSON.stringify(hashedDomains),
        callback = function(data) {
            try {
                const sResponse = JSON.parse(data.responseText);
                const news = sResponse.results[0].news;
                let myNews = [];
                newsDomains.forEach(domain => {
                    if (news[domain]) {
                      for(var j in news[domain]) {
                        if(!News._recentHistory[news[domain][j].url]) {
                          news[domain][j].type = 'history';
                          myNews.push(news[domain][j]);
                          break;
                        }
                      }
                    }
                });
                News.collectNews('history',myNews);
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
          News.getNews(newsDomains);
        },
        data = null,
        asynchronous = true;
        CLIQZEnvironment.httpHandler(method, url, callback, onerror, timeout, data, asynchronous);
    }

    // temporary freshtab replacement for mobile
    let method = 'GET',
    callback = function(data) {
        try {
            const sResponse = JSON.parse(data.responseText);
            News.collectNews('standard', sResponse.results[0].articles);
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
    data = null,
    asynchronous = true;
    CLIQZEnvironment.httpHandler(method, News.GENERIC_NEWS_URL, callback, onerror, timeout, data, asynchronous);

  },

  collectNews: function(type, news) {
    if (type === 'history') {
        News.newsHistory = news;
    } else if (type === 'standard') {
        News.newsStandard = news;
    }
    if (News.newsHistory !== null && News.newsStandard) {
       if (News.newsHistory) {
          News.displayTopNews(News.newsHistory.concat(News.newsStandard));
       } else {
         News.displayTopNews(News.newsStandard);
       }
    }
  },
  displayTopNews: function(top_news) {

    News.newsHistory = News.newsStandard = null;
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
    CLIQZEnvironment.addEventListenerToElements('.topNewsLink', 'click', function () {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topnews',
        target_index: this.dataset.index
      });
    });
    window.dispatchEvent(new CustomEvent('newsLoadingDone'));
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

    osAPI.searchHistory('', 'News.getRecentHistory');

    let indexList = {}, myList = [], domain, domainArr, mainDomain, newsDomainList = [];
    for(var i=0; i<list.length; i++) {
      domain = list[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
      domainArr = domain.split('.');
      newsDomainList.push(domainArr[domainArr.length-2] + '.' + domainArr[domainArr.length-1]);
      mainDomain = domainArr[domainArr.length-2].substr(0, 10);
      mainDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      list[i].mainDomain = mainDomain;
      indexList[mainDomain] = list[i];
    }

    // kick out history based news
    // News.getNews(newsDomainList);
    News.getNews();

    for(i in indexList) {
      myList.push(indexList[i]);
    }
    list = myList;

    topSitesList = list;
    displayTopSites(list);
  },
  // wait for logos, templates, and locale to be loaded
  getDependencyStatus: function(template) {
    if(DEPENDENCY_STATUS.retryCount[template] === undefined) {
      DEPENDENCY_STATUS.retryCount[template] = 0;
    }
    if(!CliqzUtils.BRANDS_DATABASE.buttons || !CliqzHandlebars.tplCache[template] || CliqzUtils.getLocalizedString('freshtab_top_sites') === 'freshtab_top_sites') {
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
