let eventIDs = {};
const port = chrome.runtime.connect({name: "encrypted-query"});
port.onMessage.addListener(function(response) {
    let cb = eventIDs[response.eID].cb;
    delete eventIDs[response.eID];
    cb && cb(response.data)
});

const CLIQZEnvironment = {
  LOG: 'https://logging.cliqz.com',
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'modules/static/templates/',
  LOCALE_PATH: 'modules/static/locale/',
  MIN_QUERY_LENGHT_FOR_EZ: 2,
  RERANKERS: [],
  RESULTS_TIMEOUT: 1000, // 1 second
  TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
    'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
    'spellcheck': 1,
    'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
    'pattern-hm': 1,
    'entity-portal': 3, 'topsites': 3,
    'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'stocks': 2, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
    'entity-search-1': 2, 'flightStatusEZ-2': 2, 'weatherEZ': 2, 'commicEZ': 3,
    'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
    'ligaEZ1Game': 2,
    'ligaEZUpcomingGames': 3,
    'ligaEZTable': 3,
    'local-movie-sc':3,
    'local-cinema-sc':3,
    'local-data-sc': 2,
    'recipe': 3,
    'rd-h3-w-rating': 1,
    'ez-generic-2': 3,
    'cpgame_movie': 3,
    'delivery-tracking': 2,
    'vod': 3,
    'liveTicker': 3
  },
  MESSAGE_TEMPLATES: [
    'footer-message',
    'onboarding-callout',
    'onboarding-callout-extended',
    'slow_connection',
    'partials/location/missing_location_2',
    'partials/location/no-locale-data'
  ],
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'partials/ez-title',
      'partials/ez-url',
      'partials/ez-history',
      'partials/ez-description',
      'partials/ez-generic-buttons',
      'EZ-history',
      'rd-h3-w-rating',
      'pcgame_movie_side_snippet',
      'partials/location/local-data',
      'partials/location/missing_location_1',
      'partials/timetable-cinema',
      'partials/timetable-movie',
      'partials/bottom-data-sc',
      'partials/download',
      'partials/streaming',
      'partials/lyrics'
  ],
  // TLD list extracted from http://www.iana.org/domains/root/db,
  // cc stands fro country code, the other are generic
  TLDs: {gw: 'cc', gu: 'cc', gt: 'cc', gs: 'cc', gr: 'cc', gq: 'cc', gp: 'cc', dance: 'na', tienda: 'na', gy: 'cc', gg: 'cc', gf: 'cc', ge: 'cc', gd: 'cc', gb: 'cc', ga: 'cc', edu: 'na', gn: 'cc', gm: 'cc', gl: 'cc', '\u516c\u53f8': 'na', gi: 'cc', gh: 'cc', tz: 'cc', zone: 'na', tv: 'cc', tw: 'cc', tt: 'cc', immobilien: 'na', tr: 'cc', tp: 'cc', tn: 'cc', to: 'cc', tl: 'cc', bike: 'na', tj: 'cc', tk: 'cc', th: 'cc', tf: 'cc', tg: 'cc', td: 'cc', tc: 'cc', coop: 'na', '\u043e\u043d\u043b\u0430\u0439\u043d': 'na', cool: 'na', ro: 'cc', vu: 'cc', democrat: 'na', guitars: 'na', qpon: 'na', '\u0441\u0440\u0431': 'cc', zm: 'cc', tel: 'na', futbol: 'na', za: 'cc', '\u0628\u0627\u0632\u0627\u0631': 'na', '\u0440\u0444': 'cc', zw: 'cc', blue: 'na', mu: 'cc', '\u0e44\u0e17\u0e22': 'cc', asia: 'na', marketing: 'na', '\u6d4b\u8bd5': 'na', international: 'na', net: 'na', '\u65b0\u52a0\u5761': 'cc', okinawa: 'na', '\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8': 'na', '\u05d8\u05e2\u05e1\u05d8': 'na', '\uc0bc\uc131': 'na', sexy: 'na', institute: 'na', '\u53f0\u7063': 'cc', pics: 'na', '\u516c\u76ca': 'na', '\u673a\u6784': 'na', social: 'na', domains: 'na', '\u9999\u6e2f': 'cc', '\u96c6\u56e2': 'na', limo: 'na', '\u043c\u043e\u043d': 'cc', tools: 'na', nagoya: 'na', properties: 'na', camera: 'na', today: 'na', club: 'na', company: 'na', glass: 'na', berlin: 'na', me: 'cc', md: 'cc', mg: 'cc', mf: 'cc', ma: 'cc', mc: 'cc', tokyo: 'na', mm: 'cc', ml: 'cc', mo: 'cc', mn: 'cc', mh: 'cc', mk: 'cc', cat: 'na', reviews: 'na', mt: 'cc', mw: 'cc', mv: 'cc', mq: 'cc', mp: 'cc', ms: 'cc', mr: 'cc', cab: 'na', my: 'cc', mx: 'cc', mz: 'cc', '\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8': 'cc', wang: 'na', estate: 'na', clothing: 'na', monash: 'na', guru: 'na', technology: 'na', travel: 'na', '\u30c6\u30b9\u30c8': 'na', pink: 'na', fr: 'cc', '\ud14c\uc2a4\ud2b8': 'na', farm: 'na', lighting: 'na', fi: 'cc', fj: 'cc', fk: 'cc', fm: 'cc', fo: 'cc', sz: 'cc', kaufen: 'na', sx: 'cc', ss: 'cc', sr: 'cc', sv: 'cc', su: 'cc', st: 'cc', sk: 'cc', sj: 'cc', si: 'cc', sh: 'cc', so: 'cc', sn: 'cc', sm: 'cc', sl: 'cc', sc: 'cc', sb: 'cc', rentals: 'na', sg: 'cc', se: 'cc', sd: 'cc', '\u7ec4\u7ec7\u673a\u6784': 'na', shoes: 'na', '\u4e2d\u570b': 'cc', industries: 'na', lb: 'cc', lc: 'cc', la: 'cc', lk: 'cc', li: 'cc', lv: 'cc', lt: 'cc', lu: 'cc', lr: 'cc', ls: 'cc', holiday: 'na', ly: 'cc', coffee: 'na', ceo: 'na', '\u5728\u7ebf': 'na', ye: 'cc', '\u0625\u062e\u062a\u0628\u0627\u0631': 'na', ninja: 'na', yt: 'cc', name: 'na', moda: 'na', eh: 'cc', '\u0628\u06be\u0627\u0631\u062a': 'cc', ee: 'cc', house: 'na', eg: 'cc', ec: 'cc', vote: 'na', eu: 'cc', et: 'cc', es: 'cc', er: 'cc', ru: 'cc', rw: 'cc', '\u0aad\u0abe\u0ab0\u0aa4': 'cc', rs: 'cc', boutique: 'na', re: 'cc', '\u0633\u0648\u0631\u064a\u0629': 'cc', gov: 'na', '\u043e\u0440\u0433': 'na', red: 'na', foundation: 'na', pub: 'na', vacations: 'na', org: 'na', training: 'na', recipes: 'na', '\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435': 'na', '\u4e2d\u6587\u7f51': 'na', support: 'na', onl: 'na', '\u4e2d\u4fe1': 'na', voto: 'na', florist: 'na', '\u0dbd\u0d82\u0d9a\u0dcf': 'cc', '\u049b\u0430\u0437': 'cc', management: 'na', '\u0645\u0635\u0631': 'cc', '\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc': 'na', kiwi: 'na', academy: 'na', sy: 'cc', cards: 'na', '\u0938\u0902\u0917\u0920\u0928': 'na', pro: 'na', kred: 'na', sa: 'cc', mil: 'na', '\u6211\u7231\u4f60': 'na', agency: 'na', '\u307f\u3093\u306a': 'na', equipment: 'na', mango: 'na', luxury: 'na', villas: 'na', '\u653f\u52a1': 'na', singles: 'na', systems: 'na', plumbing: 'na', '\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae': 'na', '\u062a\u0648\u0646\u0633': 'cc', '\u067e\u0627\u06a9\u0633\u062a\u0627\u0646': 'cc', gallery: 'na', kg: 'cc', ke: 'cc', '\u09ac\u09be\u0982\u09b2\u09be': 'cc', ki: 'cc', kh: 'cc', kn: 'cc', km: 'cc', kr: 'cc', kp: 'cc', kw: 'cc', link: 'na', ky: 'cc', voting: 'na', cruises: 'na', '\u0639\u0645\u0627\u0646': 'cc', cheap: 'na', solutions: 'na', '\u6e2c\u8a66': 'na', neustar: 'na', partners: 'na', '\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe': 'cc', menu: 'na', arpa: 'na', flights: 'na', rich: 'na', do: 'cc', dm: 'cc', dj: 'cc', dk: 'cc', photography: 'na', de: 'cc', watch: 'na', dz: 'cc', supplies: 'na', report: 'na', tips: 'na', '\u10d2\u10d4': 'cc', bar: 'na', qa: 'cc', shiksha: 'na', '\u0443\u043a\u0440': 'cc', vision: 'na', wiki: 'na', '\u0642\u0637\u0631': 'cc', '\ud55c\uad6d': 'cc', computer: 'na', best: 'na', voyage: 'na', expert: 'na', diamonds: 'na', email: 'na', wf: 'cc', jobs: 'na', bargains: 'na', '\u79fb\u52a8': 'na', jp: 'cc', jm: 'cc', jo: 'cc', ws: 'cc', je: 'cc', kitchen: 'na', '\u0a2d\u0a3e\u0a30\u0a24': 'cc', '\u0627\u06cc\u0631\u0627\u0646': 'cc', ua: 'cc', buzz: 'na', com: 'na', uno: 'na', ck: 'cc', ci: 'cc', ch: 'cc', co: 'cc', cn: 'cc', cm: 'cc', cl: 'cc', cc: 'cc', ca: 'cc', cg: 'cc', cf: 'cc', community: 'na', cd: 'cc', cz: 'cc', cy: 'cc', cx: 'cc', cr: 'cc', cw: 'cc', cv: 'cc', cu: 'cc', pr: 'cc', ps: 'cc', pw: 'cc', pt: 'cc', holdings: 'na', wien: 'na', py: 'cc', ai: 'cc', pa: 'cc', pf: 'cc', pg: 'cc', pe: 'cc', pk: 'cc', ph: 'cc', pn: 'cc', pl: 'cc', pm: 'cc', '\u53f0\u6e7e': 'cc', aero: 'na', catering: 'na', photos: 'na', '\u092a\u0930\u0940\u0915\u094d\u0937\u093e': 'na', graphics: 'na', '\u0641\u0644\u0633\u0637\u064a\u0646': 'cc', '\u09ad\u09be\u09b0\u09a4': 'cc', ventures: 'na', va: 'cc', vc: 'cc', ve: 'cc', vg: 'cc', iq: 'cc', vi: 'cc', is: 'cc', ir: 'cc', it: 'cc', vn: 'cc', im: 'cc', il: 'cc', io: 'cc', in: 'cc', ie: 'cc', id: 'cc', tattoo: 'na', education: 'na', parts: 'na', events: 'na', '\u0c2d\u0c3e\u0c30\u0c24\u0c4d': 'cc', cleaning: 'na', kim: 'na', contractors: 'na', mobi: 'na', center: 'na', photo: 'na', nf: 'cc', '\u0645\u0644\u064a\u0633\u064a\u0627': 'cc', wed: 'na', supply: 'na', '\u7f51\u7edc': 'na', '\u0441\u0430\u0439\u0442': 'na', careers: 'na', build: 'na', '\u0627\u0644\u0627\u0631\u062f\u0646': 'cc', bid: 'na', biz: 'na', '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629': 'cc', gift: 'na', '\u0434\u0435\u0442\u0438': 'na', works: 'na', '\u6e38\u620f': 'na', tm: 'cc', exposed: 'na', productions: 'na', koeln: 'na', dating: 'na', christmas: 'na', bd: 'cc', be: 'cc', bf: 'cc', bg: 'cc', ba: 'cc', bb: 'cc', bl: 'cc', bm: 'cc', bn: 'cc', bo: 'cc', bh: 'cc', bi: 'cc', bj: 'cc', bt: 'cc', bv: 'cc', bw: 'cc', bq: 'cc', br: 'cc', bs: 'cc', post: 'na', by: 'cc', bz: 'cc', om: 'cc', ruhr: 'na', '\u0627\u0645\u0627\u0631\u0627\u062a': 'cc', repair: 'na', xyz: 'na', '\u0634\u0628\u0643\u0629': 'na', viajes: 'na', museum: 'na', fish: 'na', '\u0627\u0644\u062c\u0632\u0627\u0626\u0631': 'cc', hr: 'cc', ht: 'cc', hu: 'cc', hk: 'cc', construction: 'na', hn: 'cc', solar: 'na', hm: 'cc', info: 'na', '\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd': 'cc', uy: 'cc', uz: 'cc', us: 'cc', um: 'cc', uk: 'cc', ug: 'cc', builders: 'na', ac: 'cc', camp: 'na', ae: 'cc', ad: 'cc', ag: 'cc', af: 'cc', int: 'na', am: 'cc', al: 'cc', ao: 'cc', an: 'cc', aq: 'cc', as: 'cc', ar: 'cc', au: 'cc', at: 'cc', aw: 'cc', ax: 'cc', az: 'cc', ni: 'cc', codes: 'na', nl: 'cc', no: 'cc', na: 'cc', nc: 'cc', ne: 'cc', actor: 'na', ng: 'cc', '\u092d\u093e\u0930\u0924': 'cc', nz: 'cc', '\u0633\u0648\u062f\u0627\u0646': 'cc', np: 'cc', nr: 'cc', nu: 'cc', xxx: 'na', '\u4e16\u754c': 'na', kz: 'cc', enterprises: 'na', land: 'na', '\u0627\u0644\u0645\u063a\u0631\u0628': 'cc', '\u4e2d\u56fd': 'cc', directory: 'na'},
  log: function(msg, key){
    console.log('[[' + key + ']]', msg);
  },
  trk: [],
  telemetry: (function(){
    var trkTimer = null,
        telemetrySending = [],
        TELEMETRY_MAX_SIZE = 500;

    function pushTelemetry() {
      // put current data aside in case of failure
      telemetrySending = CE.trk.slice(0);
      CE.trk = [];

      CE.httpHandler('POST', CE.LOG, pushTelemetryCallback,
          pushTelemetryError, 10000, JSON.stringify(telemetrySending));

      CE.log('push telemetry data: ' + telemetrySending.length + ' elements', 'Telemetry');
    }

    function pushTelemetryCallback(req){
      var response = JSON.parse(req.response);

      if(response.new_session){
        CE.setPref('session', response.new_session);
      }
      telemetrySending = [];
    }

    function pushTelemetryError(req){
      // pushTelemetry failed, put data back in queue to be sent again later
      CE.log('push telemetry failed: ' + telemetrySending.length + ' elements', 'Telemetry');
      CE.trk = telemetrySending.concat(CE.trk);

      // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
      var slice_pos = CE.trk.length - TELEMETRY_MAX_SIZE + 100;
      if(slice_pos > 0){
        CE.log('discarding ' + slice_pos + ' old telemetry data', 'Telemetry');
        CE.trk = CE.trk.slice(slice_pos);
      }

      telemetrySending = [];
    }

    return function(msg, instantPush) {
      if ((msg.type != 'environment') && CLIQZEnvironment.isPrivate())
        return;
      CE.log(msg, 'Utils.telemetry');
      msg.session = CE.getPref('session');
      msg.ts = Date.now();

      CE.trk.push(msg);
      CE.clearTimeout(trkTimer);

      if(instantPush || CE.trk.length % 100 == 0){
        pushTelemetry();
      } else {
        trkTimer = CE.setTimeout(pushTelemetry, 60000);
      }
    }
  })(),

  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CE.TEMPLATES[template]
  },
  getBrandsDBUrl: function(version){
    return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json';
  },
  getPref: function(pref, notFound){
    var mypref;
    if(mypref = CE.getLocalStorage().getItem(pref)) {
      if(mypref == 'false') return false;
      if(mypref == 'true') return true;
      return isNaN(mypref) ? mypref : parseInt(mypref);
    } else {
      return notFound;
    }
  },
  _prefListeners:[],
  addPrefListener: function(fun){
    CE._prefListeners.push(fun)
  },
  setPref: function(pref, val){
    CE.getLocalStorage().setItem(pref,val);

    CE._prefListeners.forEach(function(f){
      try {
        f(pref);
      } catch(e){
        // bummer
      }
    })
  },
  hasPref: function(pref){
    return pref in CE.getLocalStorage();
  },
  clearPref: function(pref){
    delete localStorage[pref];
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  tldExtractor: function(host){
    var v = host.toLowerCase().split('.'),
        tld = '';

    var first_level = CE.TLDs[v[v.length - 1]];
    tld = v[v.length - 1];

    if ((v.length > 2) && (first_level == 'cc')) {
      // check if we also have to remove the second level, only if 3 or more
      //  levels and the first_level was a country code
      if (CE.TLDs[v[v.length - 2]]) {
        tld = v[v.length - 2] + '.' + tld;
      }
    }

    return tld;
  },
  getLocalStorage: function(url) {
    return localStorage;
  },
  OS: 'chromium',
  isPrivate: function() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab: function(win) { return CE.isPrivate(); },
  getWindow: function(){ return { document: { getElementById() {} } } },
  XMLHttpRequest: XMLHttpRequest,
  httpHandler: function(method, url, callback, onerror, timeout, data, sync) {
    // Check if its a query and needs to sent via the encrypted channel.
    if(url.indexOf('newbeta.cliqz.com') > -1 && CLIQZEnvironment.getPref("hpn-query",false)) {
        let eID = Math.floor(Math.random() * 1000);
        eventIDs[eID] = {"cb": callback};
        let _q = url.replace(('https://newbeta.cliqz.com/api/v1/results?q='),"")
        let encrypted_query = {"action": "extension-query", "type": "cliqz", "ts": "", "ver": "1.5", "payload":_q }
        port.postMessage({msg: encrypted_query, eventID:eID});
    }
    else{
        var req = new CE.XMLHttpRequest();
        req.open(method, url, !sync)
        req.overrideMimeType && req.overrideMimeType('application/json');
        req.onload = function(){
          var statusClass = parseInt(req.status / 100);
          if(statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */){
            callback && callback(req);
          } else {
            onerror && onerror();
          }
        };
        req.onerror = function(){
          onerror && onerror();
        };

        req.ontimeout = function(){
          onerror && onerror();
        };

        if(callback && !sync){
          if(timeout){
            req.timeout = parseInt(timeout);
          } else {
            req.timeout = (method === 'POST'? 10000 : 1000);
          }
        }

        req.send(data);
        return req;
    }
  },

  historySearch: function(q, callback, searchParam, sessionStart) {
    chrome.cliqzSearchPrivate.queryHistory(q, (query, matches, finished) => {
      var res = matches.map(function(match) {
          return {
              value:   match.url,
              comment: match.description,
              style:   'favicon',
              image:   '',
              label:   ''
          };
      });
      callback({
        query: query,
        results: res,
        ready: true
      });
    });
  },

  openLink: function(win, url, newTab) {
    if (newTab)
      window.open(url);
    else
      window.location.href = url;
  },

  copyResult: function(val) {
    var backup = document.oncopy;
    try {
      document.oncopy = function(event) {
        event.clipboardData.setData("text/plain", val);
        event.preventDefault();
      };
      document.execCommand("copy", false, null);
    }
    finally {
      document.oncopy = backup;
    }
  },
  // debug
  _ENGINES: [{
    "name": "CLIQZ dummy search", "alias": "#qq", "default": true, "icon": "", "searchForm": "", "suggestionUrl": "", "base_url": "https://www.cliqz.com/search?q=", "prefix": "#qq", "code": 3
  }],
  getSearchEngines: function(){
    return CE._ENGINES.map(function(e){
      e.getSubmissionForQuery = function(q){
          //TODO: create the correct search URL
          return e.searchForm.replace("{searchTerms}", q);
      }

      e.getSuggestionUrlForQuery = function(q){
          //TODO: create the correct search URL
          return e.suggestionUrl.replace("{searchTerms}", q);
      }

      return e;
    });
  },
  updateAlias: function(){},
  getEngineByAlias: function(alias) {
    return CE._ENGINES.find(engine => { return engine.alias === alias; });
  },
  getEngineByName: function(name) {
    return CE._ENGINES.find(engine => { return engine.name === name; });
  },
  getNoResults: function() {
    const engines = CE.getSearchEngines().map(e => {
      e.style = CE.getLogoDetails(
          CE.getDetailsFromUrl(e.searchForm)).style;
      e.text =  e.alias.slice(1);
      return e;
    });
    const defaultName = CE.getDefaultSearchEngine().name;

    return CE.Result.cliqzExtra({
      data: {
        template: 'noResult',
        text_line1: CE.getLocalizedString('noResultTitle'),
        // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
        // we should take care of CE specific case differently on alternative platforms
        text_line2: CE.getLocalizedString('noResultMessage', defaultName),
        search_engines: engines,
        //use local image in case of no internet connection
        cliqz_logo: CE.SKIN_PATH + "img/cliqz.svg"
      },
      subType: JSON.stringify({empty:true})
    });
  },

  setDefaultSearchEngine: function(engine) {
    CE.getLocalStorage().setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    for (let e of CE.getSearchEngines()) {
      if (e.default)
        return e;
    }
  },
  onRenderComplete: function(query, urls){
    chrome.cliqzSearchPrivate.processResults(query, urls);
  },
  disableCliqzResults: function () {
    CE.ExpansionsProvider.enable();
  },
  enableCliqzResults: function () {
    CE.ExpansionsProvider.disable();
  }
};
const CE = CLIQZEnvironment;  // Shorthand alias.

export default CLIQZEnvironment;
