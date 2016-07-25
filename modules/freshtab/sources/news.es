import config from "core/config";

Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

var ONE_MINUTE = 60 * 1000,
    ONE_DAY = 24 * 60 * ONE_MINUTE,
    ONE_MONTH = 30 * ONE_DAY,
    SEND_INTERVAL = 20 * ONE_MINUTE,
    NEWS_CACHE_INTERVAL = 30 * ONE_MINUTE,
    DATA_CACHE_INTERVAL = ONE_DAY,
    t0, // timers
    news_domains = {178958752: true, 240417088: true, 34265112: true, 108380849: true, 169904261: true, 14839075: true, 70195478: true, 71051945: true, 135964756: true, 5357951: true, 146672137: true, 71790765: true, 6124559: true, 36104430: true, 147530643: true, 2511443: true, 136594333: true, 80384420: true, 5982326: true, 102857348: true, 184420634: true, 43614181: true, 148890453: true, 74231485: true, 141454235: true, 245292361: true, 147724433: true, 10929352: true, 75216604: true, 73453305: true, 148999872: true, 180898825: true, 140232211: true, 184542214: true, 83508049: true, 209425120: true, 76821306: true, 114075108: true, 137825482: true, 113436635: true, 113762528: true, 169382283: true, 175784971: true, 70630552: true, 139156437: true, 106463557: true, 248962108: true, 77474825: true, 16295799: true, 2997498: true, 108598008: true, 82809060: true, 209792714: true, 37794597: true, 15870603: true, 242777366: true, 48888990: true, 75759830: true, 72712697: true, 112934951: true, 83668076: true, 15923252: true, 82052855: true, 136713798: true, 144696931: true, 107727411: true, 40762155: true, 74516787: true, 172455381: true, 101023053: true, 45585948: true, 11737641: true, 68773555: true, 134355940: true, 12929557: true, 150613827: true, 140838989: true, 106867254: true, 74963860: true, 78966730: true, 36616645: true, 138634750: true, 107003152: true, 43523480: true, 174373373: true, 37350675: true, 112927802: true, 215164206: true, 5921576: true, 181374631: true, 71156889: true, 147460736: true, 37775008: true, 45490817: true, 39404899: true, 105504157: true, 4157585: true, 143002826: true, 76064334: true, 43103236: true, 136180937: true, 111313536: true, 40196024: true, 180198292: true, 248734759: true, 8639085: true, 138715048: true, 5891625: true, 42307527: true, 4454032: true, 109605547: true, 247233032: true, 178958795: true, 144944349: true, 37848620: true, 44614606: true, 69266294: true, 14210958: true, 149187007: true, 142675546: true, 113298437: true, 68531186: true, 201774982: true, 243041052: true, 75099086: true, 246602533: true, 104614242: true, 102881421: true, 113652989: true, 5759018: true, 179468108: true, 40815482: true, 72270683: true, 16553575: true, 2487332: true, 108090229: true, 76965235: true, 115271636: true, 243832777: true, 145526129: true, 248906303: true, 243524240: true, 145917300: true, 45285918: true, 13995383: true, 136808501: true, 251470487: true, 73353973: true, 183218837: true, 140810706: true, 81471951: true, 236458718: true, 82065538: true, 141793488: true, 2306320: true, 137667936: true, 108843334: true, 205558795: true, 80443423: true, 182967959: true, 171949145: true, 13956180: true, 145735407: true, 71039905: true, 6296201: true, 15363587: true, 104780054: true, 38607057: true, 10922616: true, 69472735: true, 238098952: true, 106180769: true, 175305615: true, 174752059: true, 6407576: true, 203545094: true, 789884: true, 209713987: true, 105365837: true, 81150235: true, 216243619: true, 140910568: true, 106652389: true, 79676979: true, 33736488: true, 6161388: true, 247014589: true, 243466225: true, 68105860: true, 37181072: true, 12722702: true, 168156548: true, 108523534: true, 117319634: true, 74661948: true, 76644610: true, 113095973: true, 13942670: true, 82442170: true, 251365296: true, 71632735: true, 6525262: true, 49548588: true, 10398446: true, 9892497: true, 77870507: true, 104278336: true, 173863644: true, 44768277: true, 79047610: true, 16063865: true, 115867194: true, 182341254: true, 37933409: true, 215753401: true, 215753398: true, 38686913: true, 234985930: true, 80093344: true, 248077469: true, 143998729: true, 113796197: true, 241173928: true, 115978914: true, 215437472: true, 112979754: true, 79476327: true, 108585199: true, 796680: true, 44175368: true, 211123764: true, 79743113: true, 245440575: true, 247103814: true, 243466268: true, 134230232: true, 37827792: true, 179374898: true, 6529331: true, 241863379: true, 82141174: true, 67904957: true, 239942081: true, 171233903: true, 4574823: true, 2189348: true, 465620: true, 4592036: true, 148532105: true, 150066519: true, 143689046: true, 111257651: true, 79660549: true, 201572094: true, 39527122: true, 111149262: true, 101198513: true, 6397677: true, 44437765: true, 170749808: true, 250561709: true, 202902407: true, 136954268: true, 206470712: true, 242422332: true, 34378709: true, 205726722: true, 71950061: true, 149024640: true, 73348137: true, 67532110: true, 76948360: true, 106494023: true, 149652911: true, 168693251: true, 207458364: true, 247500342: true, 44296786: true, 236142977: true, 9179572: true, 101941303: true, 206528356: true, 4384695: true, 8996919: true, 71759466: true, 112434967: true, 49945901: true, 40389129: true, 5807052: true, 245704031: true, 180095924: true, 45794709: true, 213331124: true, 1355159: true, 210459977: true, 3483613: true, 109662177: true, 216514350: true, 80690384: true, 138139369: true, 144770664: true, 214714184: true, 80717687: true, 33802677: true, 143261715: true, 141526403: true, 4504905: true, 182872720: true, 77071: true, 15971319: true, 114467095: true, 243466254: true, 241730435: true, 5972966: true, 170940909: true, 108568271: true, 81969172: true, 9583554: true, 242204751: true, 69620493: true, 109152934: true, 76484655: true, 143166170: true, 103752472: true, 81658130: true, 139923274: true, 68485914: true, 211939645: true, 135719188: true, 74755100: true, 137978005: true, 180948925: true, 3977446: true, 170718023: true, 2718777: true, 217706451: true, 140391363: true, 41314131: true, 113800544: true, 105372134: true, 4021948: true, 79513675: true, 42041884: true, 182576755: true, 105880115: true, 184043374: true, 216124125: true, 245082466: true, 145858766: true, 150359424: true, 145555265: true, 14345939: true, 173065324: true, 148531919: true, 112652137: true, 101314158: true, 106647141: true, 239119048: true, 135951735: true, 205798148: true, 44971794: true, 207641190: true, 210161238: true, 172336998: true, 102430744: true, 169904458: true, 167796712: true, 237422416: true, 15299156: true, 212983134: true, 42941135: true, 78449258: true, 136269672: true, 168119182: true, 110038646: true, 1857910: true, 36909212: true, 110344242: true, 77515611: true, 111033825: true, 116229637: true, 244002985: true, 1794758: true, 213411883: true, 34606719: true, 1271721: true, 139715282: true, 238595002: true, 181502899: true, 217546276: true, 77781318: true, 75180473: true, 207882325: true, 177387947: true, 75446711: true, 134453699: true, 243466315: true, 108671135: true, 168879163: true, 216598077: true, 170628400: true, 241982610: true, 106030056: true, 174171886: true, 183456569: true, 4771222: true, 72797110: true, 75387708: true, 243084430: true, 67320133: true, 134687466: true, 48573962: true, 248724254: true, 39472004: true, 147148965: true, 44025793: true, 247738870: true, 83094546: true, 80961546: true, 76971985: true, 6355568: true, 72264310: true, 34623041: true, 78462725: true, 139925606: true, 79317962: true, 46500457: true},
    hBasedNews = true,
    useIterests = false,
    hBasedNewsNumber = 3,
    topNewsMaxNumber = 30,
    CLIQZ_NEW_TAB_URL = "chrome://cliqz/content/fresh-tab-frontend/index.html";

function log(s){
  CliqzUtils.log(s, 'CliqzFreshTabNews');
}
var CliqzFreshTabNews = {
  _isStale: function() {
    var now = Date.now();
    return parseInt(CliqzUtils.getPref('freshTabNewsTime', '0')) + NEWS_CACHE_INTERVAL < now;
  },
    _isHdataStale: function() {
    var now = Date.now();
    return parseInt(CliqzUtils.getPref('freshTabDTime', '0')) + DATA_CACHE_INTERVAL < now;
  },
  init: function(){
    CliqzUtils.clearTimeout(t0);

    t0 = CliqzUtils.setTimeout(CliqzFreshTabNews.updateNews, ONE_MINUTE);

    log('init');
  },
  unload: function(){
    CliqzUtils.clearTimeout(t0);

    log('unloaded');
  },

  updateNews: function(callback){
    CliqzUtils.clearTimeout(t0);
    var bypassCache = CliqzUtils.getPref('freshTabByPassCache');
    var ls = CLIQZEnvironment.getLocalStorage(CLIQZ_NEW_TAB_URL);
    //remove version of the cache from the previous version
    if (ls.getItem('freshTab-news')){
      ls.removeItem('freshTab-news');
    }
    var cache = ls.getItem('freshTab-news-cache');

    if (CliqzFreshTabNews._isStale() || bypassCache || !cache){
      var bBasedNewsRequirement = [];
      if (bypassCache) {
        log("Bypassing cache");
      }

      if (hBasedNews) {
        getHbasedNewsList(hBasedNewsNumber).then(function(bBasedNewsRequirement){
          requestNews(bBasedNewsRequirement, callback);
        });
      } else {
        requestNews([], callback);
      }
    }
    log('update tick')
    t0 = CliqzUtils.setTimeout(CliqzFreshTabNews.updateNews, 1 * ONE_MINUTE);
  },
  getNews: function (){
    return new Promise(function (resolve, reject)  {
      var cache = getNewsFromLS();

      if (cache && !CliqzFreshTabNews._isStale() && CliqzUtils.getPref('freshTabByPassCache', false) === false) {
        log("Reading from Local Storage");
        log(cache);
        resolve(cache);
      } else {

        log("Reading live data");
        CliqzFreshTabNews.updateNews(function(){
          //log("Update news Done", getNewsFromLS())
          var c = getNewsFromLS();
          log(c);
          resolve(c);
        });
      }
    });
  }
};

function getNewsFromLS(){
  var ls = CLIQZEnvironment.getLocalStorage(CLIQZ_NEW_TAB_URL);
  var news_cache = ls.getItem('freshTab-news-cache');
  var recommend_cache = ls.getItem('freshTab-data');

  if (news_cache){
    return recommend_cache ? composeList(JSON.parse(news_cache), JSON.parse(recommend_cache)) : composeList(JSON.parse(news_cache));
  } else {
    return false;
  }
}

//personalized news
function getHbasedNewsList(hBasedNewsNumber){
  return new Promise(function (resolve, reject)  {
    var bypassCache = CliqzUtils.getPref('freshTabByPassCache');
    var ls = CLIQZEnvironment.getLocalStorage(CLIQZ_NEW_TAB_URL);
    var cache = ls.getItem("freshTab-data");
    if (CliqzFreshTabNews._isHdataStale()||(!(cache))||(bypassCache)){
      log('Compose hbased recommendations.');
      var topic_db_path = {},
        news_results = [],
        path_array = [],
        news_dcache = {},
        hash_list = [];

      CliqzHistoryManager.PlacesInterestsStorage._execute(
        'SELECT * FROM moz_places WHERE last_visit_date>:date',
          ['url', 'last_visit_date', 'visit_count'],
        function(result){
          var url_desc = CliqzUtils.getDetailsFromUrl(result.url);
          //check if domain is in the list of news domains
          var c = news_domains[parseInt(CliqzUtils.hash(url_desc.cleanHost))];
          if (c){
            // take visit count only for the exact domain and sub domains, not for articles' url
            path_array = url_desc.path.split('/');
            var last_path_element  = path_array[path_array.length - 1];
            if (!(last_path_element)||(path_array.length === 1) || (last_path_element === '')||(last_path_element.indexOf('index') === 0)){
              getTopicBasedOnUrl(url_desc, result.visit_count, topic_db_path);
            }else{
              getTopicBasedOnUrl(url_desc, 1, topic_db_path);
            }
          }
        },
        {
          date: (Date.now() - ONE_MONTH) * 1000
        }).then(
          function() {
            topic_db_path = normalizeUrlBasedCount(topic_db_path);
            log(topic_db_path);
            if (isNotEmpty(topic_db_path)){
              news_results = getNewsDistributionUrlBased(topic_db_path, hBasedNewsNumber);
            }else{
              news_results = [];
            }

            news_dcache['domain_list'] = news_results;

            // compose hashes for the secure calling of the back end
            if ((cache)&&(JSON.parse(cache))&&JSON.parse(cache).hash_list){
              hash_list = JSON.parse(cache).hash_list;
            }else{
              hash_list = [];
            }

            if (news_results.length !== 0){
              news_dcache['hash_list'] = randomizRequest(hash_list, news_results);
            }else{
              news_dcache['hash_list'] = [];
            }

            log(news_dcache);
            var ls = CLIQZEnvironment.getLocalStorage(CLIQZ_NEW_TAB_URL);
            if (ls) ls.setItem("freshTab-data", JSON.stringify(news_dcache));

            CliqzUtils.setPref('freshTabDTime', '' + Date.now());
            resolve(news_dcache);
          }
        );
    }else{
      log('Get hbased recommendations from cache.');
      resolve(JSON.parse(cache));
    }
  });
}

function randomizRequest(request_list, history_data){
  function randomValueOf(obj) {
    var keys = Object.keys(obj);
    var len = keys.length;
    var rnd = Math.floor(Math.random()*len);
    return parseInt(keys[rnd]);
  }

  function sortFunct(i, j){
    return i < j;
  }

  function subsRandomElement(request_list, history_hash_data, element_to_add){
    var random_hashes = request_list.filter(function(i){ return history_hash_data.indexOf(i) < 0;});

    var rn = random_hashes[randomValueOf(random_hashes)];
    if (element_to_add){
      request_list[request_list.indexOf(rn)] = element_to_add;
    }else{
      request_list[request_list.indexOf(rn)] = randomValueOf(news_domains);
    }
  }

  if (history_data.length !== 0){
    var randomised_array_size = 10,
      buffer_value = 0,
      number_of_elements_to_change = 0,
      history_hash_data = [];

    // fill array with up to necessary number
    while (request_list.length < randomised_array_size){
      request_list.push(randomValueOf(news_domains));
    }

    // transform domains to hash form
    history_data.forEach(function(val){
        buffer_value = parseInt(CliqzUtils.hash(val[0].split('/')[0]));
        history_hash_data.push(buffer_value);
      });

    // fill array with necessary domain hashes
    history_hash_data.forEach(function(val){
      if (request_list.indexOf(val) === -1){
        //substitute the necessary element
        subsRandomElement(request_list, history_hash_data, val);
        number_of_elements_to_change += 1
      }
    });

    while (number_of_elements_to_change > 0){
      //substitute additional rand. elements
      subsRandomElement(request_list, history_hash_data, false);
      number_of_elements_to_change -= 1
    }

    request_list.sort(sortFunct);

    return request_list;
  }else{
    return [];
  }
}

function getNewsDistributionUrlBased(topic_db, records_number){

  function getInterests(domain_key, count, interests_list){
    var interests_mapping = {};
    var c = interests_mapping[domain_key];
    if (c){
      interests_list.push({"key":c, "count":0, "sub":{}});
      return false;
    }else{
      return true;
    }
  }

  function sortFunct(i, j){
    return i.ratio < j.ratio;
  }

  function subDomainCount(res_list, subDomain, rn, pathList){

    var subDomainRatioThreshold = 0.6,
      subDomainList = [],
      added_at_level = 0;

    for (var k in subDomain) {
      subDomain[k]['key'] = k;
      subDomainList.push(subDomain[k]);
    }

    subDomainList.sort(sortFunct);
    var sumDomainRatio = 0;

    for (var i in subDomainList){
      if (subDomainList[i].ratio > subDomainRatioThreshold){

        sumDomainRatio += subDomainList[i].ratio;

        //records to add according to proportion of domian in general results
        var records_to_add = Math.min(Math.ceil(subDomainList[i].ratio*rn), rn - added_at_level);

        var cur_path_list = pathList.slice();
        cur_path_list.push(subDomainList[i].key);

        var res = subDomainCount(subDomainList[i].sub, records_to_add, cur_path_list);

        var added_at_sub_level = res[0];
        var addedRatio = res[1];

        added_at_level += added_at_sub_level;
        var r = records_to_add - added_at_sub_level;
        if (((1 - addedRatio) > subDomainRatioThreshold)&&(r > 0)){
          res_list.push([cur_path_list, r, 1]);
          added_at_level += r;
        }
      }
    }

    return [added_at_level, sumDomainRatio];
  }

  var results_list = [],
    path_list = [],
    topDomainsList = [],
    domainCountThreshold = 20,
    newsDistribution = [],
    addedRecords = 0,
    interests_list = [];

  //take the first three most frequent domains and interests
  for (var k in topic_db) {
    if ((!useIterests || getInterests(k, topic_db[k].count, interests_list))&&(topic_db[k].count > domainCountThreshold)){
      topic_db[k]['key'] = k;
      topDomainsList.push(topic_db[k]);
    }
  }

  if (isNotEmpty(topDomainsList)){
    topDomainsList.sort(sortFunct);
    topDomainsList = topDomainsList.slice(0,3);

    // insert interests news
    // and get distribution of news in the list depends from the number of frequent domains
    // [2,1] - the first number represents number of from the source, the second news type
    // 1 - history based news, 2 and more - interests types
    if (isNotEmpty(interests_list)){
      newsDistribution = {1:[[2,1], [1,2]], 2:[[1,1],[1,1],[1,2]],3:[[1,1],[1,1],[1,2],[1,1]]}[topDomainsList.length];
      if (topDomainsList.length < 3){
        topDomainsList.push(interests_list[0]);
      }else{
        topDomainsList.splice(2, 0, interests_list[0]);
      };
    }else{
      newsDistribution = {1:[[3,1]], 2:[[2,1],[1,1]],3:[[1,1],[1,1],[1,1]]}[topDomainsList.length];
    }

    for (var i in newsDistribution){
      // add path for subdomains
      addedRecords = subDomainCount(results_list, topDomainsList[i].sub, newsDistribution[i][0], [topDomainsList[i].key])[0];
      // if not all records were added on subdomain level, add on domain level
      if ((newsDistribution[i][0] - addedRecords) > 0){
        results_list.push([[topDomainsList[i].key], newsDistribution[i][0] - addedRecords, newsDistribution[i][1]]);
      }
    };

    // add the most frequent domain for the fallback
    results_list.push([[topDomainsList[0].key], 0, newsDistribution[i][1]]);

    // reconstract the urls
    for (var i in results_list){
      results_list[i][0] = results_list[i][0].join('/');
    }
  }
  return results_list;
}

function getTopicBasedOnUrl(url_desc, visit_count, topic_dict){

  function countSubCategories(urlSplit, urlSet, visit_count, i){
    var subDomain = '';

    //max level of sub domain is 5, for case of special urls
    if ((i < urlSet.length)&&(i < 4)){
      subDomain = urlSet[i];
      //if number of sublevels is bigger than one and it is the last level
      ///exclude 'index*' as sub domain
      //sub domain contains only one letter or more than 15, do not count
      if (!(subDomain)||(subDomain.indexOf('index') === 0)||(subDomain.length < 2)||(subDomain.length > 15)||((urlSet.length != 1)&&(i >= (urlSet.length-1)))){
          subDomain = '';
      }
    }

    if (subDomain){
      urlSplit[subDomain] = urlSplit[subDomain] || {count: 0, sub:{}};
      urlSplit[subDomain].count += visit_count;

      i += 1;
      urlSplit[subDomain].sub = countSubCategories(urlSplit[subDomain].sub, urlSet, visit_count, i);
    }
    return urlSplit;
  }

  //parse topics based on mapping
  var domain = url_desc.cleanHost;

  //add count on domain level
  topic_dict[domain] = topic_dict[domain] || {count: 0, sub: {}};
  topic_dict[domain].count += visit_count;

  //split url by "/"
  var keys_set = url_desc.path.split(/[\/\#\?]/);
  //cut the first empty part
  if (!(keys_set[0])) keys_set = keys_set.slice(1);

  topic_dict[domain].sub = countSubCategories(topic_dict[domain].sub, keys_set, visit_count, 0);
}

function requestNews(hcache, callback){
  // 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com', //url humanly made list of top news
  var NEWS_PROVIDER = CliqzUtils.RICH_HEADER + '&bmresult=rotated-top-news.cliqz.com', //url humanly made list of top news
      top_news_url = NEWS_PROVIDER + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale(),
      // 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com'
      RICH_HEADER = CliqzUtils.RICH_HEADER + '&bmresult=hb-news.cliqz.com',
      topic_news_url = RICH_HEADER + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale(), // news by domain and topik
      topic_news_url = topic_news_url + '&q=',
      news_urls = [],
      news_data_cache = {},
      history_data = [],
      cache_full_update_flag = true,
      i = 0;

  // add a call for top news
  news_urls.push([top_news_url, topNewsMaxNumber, 'top_h_news']);

  // add a call for hbased news if history exists
  news_data_cache = hcache;
  if (isNotEmpty(news_data_cache.hash_list)){
    // allways add random padding to the expected news
    // domains to avoid privacy leaks
    topic_news_url += JSON.stringify(news_data_cache.hash_list)

    history_data = news_data_cache.domain_list;
    news_urls.push([topic_news_url, hBasedNewsNumber, 'hb_news']);
  }

  //call news backend
  log(news_urls);
  var promises = news_urls.map(function(parameters){
    return new Promise(function(resolve, reject){
      CliqzUtils.httpGet(
        parameters[0],
        function(res){
          resolve({'res': JSON.parse(res.response || '{}'),
            'limit':parameters[1],
            'news_type':parameters[2]});
        },
        reject,
        5000
      );
    }).catch(function () {
      log('Error fetching news. Check CLIQZEnvironment.httpHandler errors.');
      return {};
    });
  });

  var responsesList = [];

  Promise.all(promises).then(function(vals){

    vals.forEach(function(u){
      if (!(isNotEmpty(u) && isNotEmpty(u.res))){
        cache_full_update_flag = false;
        log('FreshTab news of type are failded to retrive: ' + news_urls[i][2]);
        i += 1;
      }
    });

    updateFreshTabNewsCache(vals, cache_full_update_flag);
    if(callback) callback();
  });

}

function composeList(responsesList, historyCache){

  function checkDuplicates(url, res_list){
    for (var k in res_list){
      for (var e in res_list[k]){
          if (res_list[k][e]['url'] == url){
            // log('Url is already presented in results: ' + url);
            return false;
          }
      }
    }
    return true;
  }

  function mergeNews(input_list, results, news_type, domain, path, number_to_add, news_source, addWithoutCheck = false){
    var i = 0;
    // log(news_type);
    // log(number_to_add);
    while ((number_to_add > 0)&&(i < input_list.length)){
      //check duplication in results
      //check if article already been read, not for humanly made news
      //url should contain path sub path
      if (addWithoutCheck||(((checkDuplicates(input_list[i]['url'], results))&&((news_type == 'top_h_news')||checkIfInHistory(input_list[i]['url']))
          &&((path === '')||(input_list[i]['url'].indexOf(path) !== -1))))){
        var article_to_add = input_list[i];
        article_to_add['news_type'] = news_type;
        article_to_add['news_source'] = news_source;

        results[news_type] = results[news_type] || [];
        results[news_type].push(article_to_add);

        number_to_add -= 1;
      }
      i += 1;
    }
    return number_to_add;
  }

  function checkIfInHistory(url){

    var query = CliqzHistoryManager.getHistoryService().getNewQuery();
    query.beginTimeReference = query.TIME_RELATIVE_NOW;
    query.beginTime = -365 * 24 * 60 * 60 * 1000000; // 30 days ago
    query.endTimeReference = query.TIME_RELATIVE_NOW;
    query.endTime = 0; // now
    query.uri = CliqzHistoryManager.makeURI(url);

    var options = CliqzHistoryManager.getHistoryService().getNewQueryOptions();
    var result = CliqzHistoryManager.getHistoryService().executeQuery(query, options);

    //log(result.root);
    var cont = result.root;
    cont.containerOpen = true;

    if (cont.childCount == 0){
      cont.containerOpen = false;
      return true;
    }else{
      log('Url is already in history: ' + url);
      cont.containerOpen = false;
      return false;
    }
  }

  function sortByScore(list){
    function sortFunct(i, j){
      return (i.score || 32450)  < (j.score || 32450);
    }
    return list.sort(sortFunct);
  }

  function getDomainNumberInList(list){
    var domains = {};

    list.forEach(function(d){
      if (d[0]){
          domains[CliqzUtils.getDetailsFromUrl(d[0]).domain] = true;
      }
    });
    return Object.keys(domains).length;
  }

  function hbAppendToNewsList(val, history_data, news_results, add_intersts = false){
    var hbased_dict = val.res.results[0].news,
        list_to_merge = [];
    history_data.forEach(function(d){
      domain = d[0].split('/')[0];
      path = d[0];
      limit = d[1] + not_added_news;
      news_source = d[2];
      list_to_merge = hbased_dict[domain] || [];

      if ((news_source < 2) || ((news_source >= 2) && add_intersts)){
        not_added_news =  mergeNews(list_to_merge, news_results, val.news_type, domain, path, limit, news_source);
        // if sublevel was not merged try on domain level
        if (((news_source >=2)||(domain != path))&&(not_added_news > 0)){
          not_added_news =  mergeNews(list_to_merge, news_results, val.news_type, domain, '', not_added_news, news_source);
        }
      }
    });
  }

  //merge results
  var top_news_list_to_merge = [],
    domain = '',
    path = '',
    limit = 0,
    not_added_news = 0,
    news_results = {},
    history_data = [],
    news_source = 0;

  history_data = historyCache && historyCache.domain_list || [];

  //iterate over results
  responsesList.forEach(function(val){
      // merge results depends from type
      if ((val.res)&&(val.res.results)&&val.res.results[0]){
        if (val.news_type == 'hb_news'){

          hbAppendToNewsList(val, history_data, news_results, true);

          // extend the list in case if there is more than one frequent news domain from history
          /*
          if (news_results.hb_news && getDomainNumberInList(history_data) > 1){
            while (news_results.hb_news.length < 9){
              hbAppendToNewsList(val, history_data, news_results, false);
            }

            // take sort the last 6 articles based on score
            news_results.hb_news = news_results.hb_news.slice(0, 3).concat(sortByScore(news_results.hb_news.slice(3, 9)));
          }
          */
        }
        else if (val.news_type == 'top_h_news') {
          top_news_list_to_merge = val.res.results[0].articles;
          mergeNews(top_news_list_to_merge, news_results, val.news_type, '', '', val.limit, 0);
          if (val.res.results[0].news_version){
            news_results['top_news_version'] =  val.res.results[0].news_version;
          }
        }
      }else{
        log('FreshTab news of type are failded to retrive: ' + val.news_type);
      }
  });
  if (news_results.hb_news){
    if (news_results.hb_news.length < hBasedNewsNumber){
      delete news_results.hb_news;
      log('Not enough hbased news.');
    }
  }

  return news_results;

}

function isNotEmpty(ob){
  for(var i in ob){ return true;}
  return false;
}

function updateFreshTabNewsCache(news_results, cache_full_update_flag) {
  if (isNotEmpty(news_results)) {
    var ls = CLIQZEnvironment.getLocalStorage(CLIQZ_NEW_TAB_URL);
    if (ls) ls.setItem("freshTab-news-cache", JSON.stringify(news_results));
    //if not all news sources were retrieved, try again in a minute
    if (cache_full_update_flag){
      CliqzUtils.setPref('freshTabNewsTime', '' + Date.now());
      log("FreshTab news cache is updated");
    }else {
      log("FreshTab news cache is partially updated, not all sources were retrieved.");
    }
  }else{
    log("Fetched news list is empty, FreshTab news cache is not updated");
  }
}

function normalizeUrlBasedCount(topic_dict){

  function normalizeRecursion(subTopic, sum){
    for (var k in subTopic){
      subTopic[k]['ratio'] = subTopic[k].count/sum;
      subTopic[k].sub = normalizeRecursion(subTopic[k].sub, subTopic[k].count);
    }
    return subTopic;
  }

  var domain_sum = 0;

  for (var k in topic_dict){
    domain_sum += topic_dict[k].count;
  }

  for (var k in topic_dict) {
    topic_dict[k]['ratio'] = topic_dict[k].count/domain_sum;
    topic_dict[k].sub = normalizeRecursion(topic_dict[k].sub, topic_dict[k].count);
  }

  return topic_dict;
}

export { news_domains as NEWS_DOMAINS };
export default CliqzFreshTabNews;

