import TableChangeObserver from 'hm/table-change-observer';
import IncrementalStorage from 'hm/incremental-storage';
import SimpleStorage from 'hm/simple-storage';
import { ngrams, len, comp_url, is_search_url, normalize,
 url_norm, zip, has } from 'hm/helpers';
import GatherData from 'hm/gather-data';
import md5 from 'core/helpers/md5';

Components.utils.import('resource://gre/modules/PlacesUtils.jsm');

const Ci = Components.interfaces;

const URL_MAP = {
  c: 0,
  cl: 1,
  cl_q: 2,
  cl_visits: 3,
  count: 4,
  desc: 5,
  eng: 6,
  frec: 7,
  last_visit: 8,
  q: 9,
  title: 10,
  u: 11,
  visits: 12,
  w: 13,
  eng_cnt: 14,
  last_visit_real: 15,
  all_urls: 16,
  in_sc: 17,
  in_sc_lab: 18,
};

// TODO: This should not be hardcoded, should be dependant on the index!
function getUrlVal(url, name) {
  if (has(URL_MAP, name)) {
    return url[URL_MAP[name]];
  }
  throw new Error(`Unknown url param ${name}`);
}


function updateUrlWords(url, field) {
  const values = [];
  if (field === 'u') {
    const [dom, p1, p2, qs] = comp_url(getUrlVal(url, 'u'));
    values.push([dom, 'd'], [p1, 'p1'], [p2, 'p2'], [qs, 'qs']);
  } else if (field === 'q') {
    const q = (getUrlVal(url, 'q') || []).join(' ');
    values.push([q, 'q']);
  } else if (field === 'desc') {
    const desc = getUrlVal(url, 'desc');
    values.push([desc, 'de']);
  } else if (field === 'title') {
    const title = getUrlVal(url, 'title');
    values.push([title, 't']);
  }
  const w = getUrlVal(url, 'w');
  for (const [p, lab] of values) {
    if (!p) {
      continue;
    }
    const normp = normalize(p);
    const vnormp = normp.split(' ').filter(t => len(t) > 0);
    if (len(vnormp) > 0) {
      w[lab] = vnormp;
    }
  }
}

function setUrlVal(url, name, val) {
  const mutUrl = url;
  if (has(URL_MAP, name)) {
    mutUrl[URL_MAP[name]] = val;
    updateUrlWords(mutUrl, name);
  } else {
    throw new Error(`Unknown url param ${name}`);
  }
}

function findUrlIdx(url, data) {
  if (url) {
    const nurl = url_norm(url);
    const k = md5(nurl);
    if (has(data.incl_urls, k)) {
      return data.incl_urls[k];
    }
    const idx = data.urls.findIndex(u => u && url_norm(getUrlVal(u, 'u')) === nurl);
    return idx !== -1 ? idx : null;
  }
  return null;
}

function findUrl(url, data) {
  const idx = findUrlIdx(url, data);
  return idx !== null ? data.urls[idx] : null;
}

function getUrlWords(url) {
  const words = new Set();
  const ww = getUrlVal(url, 'w');
  Object.keys(ww).forEach(k => {
    (ww[k] || []).forEach(w => words.add(w));
  });

  const [dom] = comp_url(getUrlVal(url, 'u'));
  for (const t of dom.toLowerCase().split('.').slice(0, -1)) {
    for (let i = 1; i < len(t) + 1; ++i) {
      words.add(t.slice(0, i));
    }
  }
  return words;
}


// Info: w2uid is built after url dropping, so no need to worry about any url having been dropped
function removeWeightsW2uid(array, data) {
  const tmp = [];
  const domFreq = {};
  for (let i = 0; i < len(array); i += 2) {
    const uid = array[i];
    const sc = array[i + 1];
    const u = getUrlVal(data.urls[uid], 'u');
    const [dom] = comp_url(u);
    domFreq[dom] = (domFreq[dom] || 0) + 1;
    const scMod = sc / Math.pow(0.9, domFreq[dom]);
    tmp.push([uid, scMod]);
  }
  return tmp;
}

function applyWeightsW2uid(array, data) {
  const mutArray = array;
  array.sort((a, b) => b[1] - a[1]);
  const domFreq = {};
    // Weighting scores again
  for (let i = 0; i < array.length; ++i) {
    const [uid] = array[i];
    const u = getUrlVal(data.urls[uid], 'u');
    const [dom] = comp_url(u);
    domFreq[dom] = (domFreq[dom] || 0) + 1;
    mutArray[i][1] *= Math.pow(0.9, domFreq[dom]);
  }
  array.sort((a, b) => b[1] - a[1]);
  const cap = len(array) > 1000 ? 300 : 200;
  const ret = [];
  for (const [a, b] of array.slice(0, cap)) {
    ret.push(a);
    ret.push(b);
  }
  return ret;
}

function updatemm2(word, data) {
  const cap = 100;
  const mm2 = data.mm2;
  const N = word.length;

  if (N > 38) {
    return;
  }

  let done = false;
  for (let i = 1; i <= N; ++i) {
    const w = word.slice(0, i);
    if (has(mm2, w)) {
      const words = mm2[w];
      const n = words.length;
      if (n > 0 && n / 2 < cap) {
        words.push(word, words[n - 1] * 0.9);
        done = true;
      }
    }
  }

    // If not done, retry without non-empty restriction, and break on first success
  if (!done) {
    for (let i = 1; !done && i <= N; ++i) {
      const w = word.slice(0, i);
      if (!has(mm2, w)) {
        mm2[w] = [];
      }
      const words = mm2[w];
      const n = words.length;
      if (n / 2 < cap) {
        words.push(word, 1); // Anything better than 1?
        done = true;
      }
    }
  }
}

function removemm2(w, data) {
  const mm2 = data.mm2;
  const N = w.length;
  if (N > 38) {
    return;
  }

  for (let r = N; r > 0; --r) {
    const ngv = ngrams(w, r);
    const ngvLen = len(ngv);
    for (let i = 0; i < ngvLen; ++i) {
      const ng = ngv[i];
      if (has(mm2, ng)) {
        const words = mm2[ng];
        const idx = words.indexOf(w);
        if (idx >= 0) {
          words.splice(idx, 2);
        }
        if (words.length === 0) {
          delete mm2[ng];
        }
      }
    }
  }
}

function removeWord(uid, w, data) {
  const mutData = data;
  if (has(data.w2uid, w)) {
    const array = removeWeightsW2uid(data.w2uid[w], data);
    const idx = array.findIndex(x => x[0] === uid);
    if (idx >= 0) {
      array.splice(idx, 1);
    }
    if (array.length === 0) {
      removemm2(w, data);
      delete mutData.w2uid[w];
      delete mutData.wwd[w];
    } else {
      mutData.w2uid[w] = applyWeightsW2uid(array, data);
    }
  }
}

function handleDeletedWords(uid, oldWords, newWords, data) {
  oldWords.forEach(w => {
    if (!newWords.has(w)) {
      removeWord(uid, w, data);
    }
  });
}

// Pre: !has(data.incl_urls, md5(url_norm(u)))
// We always create the url and push it to data.urls, but sometimes it will
// be in incl_urls and sometimes in excl_urls (if it is search url or was
// already excluded)
function makeEmptyUrl(u, data) {
  const uid = len(data.urls);
  const url = [];
  // setUrlVal will trigger updateUrlWords for some cases, so we need to set this first
  setUrlVal(url, 'w', {});
  setUrlVal(url, 'c', [0, 0, 0, 0, 0]);
  setUrlVal(url, 'cl', false);
  setUrlVal(url, 'cl_q', []);
  setUrlVal(url, 'cl_visits', 0);
  setUrlVal(url, 'count', 0);
  setUrlVal(url, 'desc', null);
  setUrlVal(url, 'eng', [0, 0, 0]);
  setUrlVal(url, 'eng_cnt', [0, 0, 0]);
  setUrlVal(url, 'frec', 0);
  setUrlVal(url, 'last_visit', null);
  setUrlVal(url, 'q', []);
  setUrlVal(url, 'title', null);
  setUrlVal(url, 'u', u);
  setUrlVal(url, 'visits', []);
  setUrlVal(url, 'in_sc', null);
  setUrlVal(url, 'in_sc_lab', null);
  setUrlVal(url, 'last_visit_real', null);
  setUrlVal(url, 'all_urls', [u]);

  const k = md5(url_norm(u));
  const idx = data.excl_urls.indexOf(k); // Expensive?
  if (idx === -1) {
    const [isQuery] = is_search_url(u);
    if (isQuery) { // If it is a query, for sure we mark it as excluded
      // we only do this to be able to extract queries to other (included) pages
      data.excl_urls.push(k);
    } else {
      const mutData = data;
      mutData.incl_urls[k] = uid;
    }
  }
  data.urls.push(url);
  return url;
}

function pushQuery(query, url) {
  if (!query) {
    return;
  }
  let q = getUrlVal(url, 'q');
  if (!q) {
    q = [];
    setUrlVal(url, 'q', q);
  }
  const nquery = normalize(query);
  let idxOf = q.findIndex(x => x[0] === nquery);
  if (idxOf > -1) {
    q[idxOf][1]++;
    while (idxOf > 0 && q[idxOf][1] > q[idxOf - 1][1]) {
      [q[idxOf], q[idxOf - 1]] = [q[idxOf - 1], q[idxOf]];
      idxOf--;
    }
  } else {
    q.push([nquery, 1]);
  }
  updateUrlWords(url, 'q');
}

function popQuery(query, url) {
  if (!query) {
    return;
  }
  const q = getUrlVal(url, 'q');
  if (!q) {
    return;
  }
  const nquery = normalize(query);
  let idxOf = q.findIndex(x => x[0] === nquery);
  if (idxOf > -1) {
    if (--q[idxOf][1] > 0) {
      while (idxOf < q.length - 1 && q[idxOf][1] < q[idxOf + 1][1]) {
        [q[idxOf], q[idxOf + 1]] = [q[idxOf + 1], q[idxOf]];
        idxOf++;
      }
    } else {
      q.splice(idxOf, 1);
    }
    updateUrlWords(url, 'q');
  }
}

function cmapGen(data) {
  const cmap = {};
  Object.keys(data.labsc).forEach(i => {
    cmap[data.labsc[i]] = i;
  });
  return cmap;
}

function isUrlIncluded(url, data) {
  if (!url) {
    return false;
  }
  const nu = url_norm(getUrlVal(url, 'u'));
  return has(data.incl_urls, md5(nu));
}

// TODO: try to do this incrementally
// TODO: we could use url[uid].w
function updateW2uid(uid, data) {
  const url = data.urls[uid];
  if (!isUrlIncluded(url, data)) {
    return;
  }
  const cmap = cmapGen(data);
  const u = getUrlVal(url, 'u');
  const [dom, p1, p2, qs] = comp_url(u);
  const title = getUrlVal(url, 'title') || '';
  const desc = getUrlVal(url, 'desc') || '';
  const q = (getUrlVal(url, 'q') || []).map(([qq]) => qq).join(' ');
  const ww = {};
  const c = getUrlVal(url, 'c');
  const scu = Math.log(c[cmap.all] + 1) +
    Math.log(c[cmap['180']] + 1) + Math.log(c[cmap['30']] + 1);
  if (scu === 0) {
    return;
  }
  const itvals = zip(
    [dom, p1, p2, qs, title, q, desc],
    [1.0, 0.8, 0.7, 0.5, 0.8, 1.0, 0.8],
    ['dom', 'p1', 'p2', 'qs', 'title', 'q', 'desc']
  );
  for (const [p, ty, l] of itvals) {
    if (p) {
      const normp = normalize(p);
      const vnormp = normp.split(' ').filter(t => len(t) > 0);

      for (const w of vnormp) {
        ww[w] = (ww[w] || 0) + scu * ty;
      }

      if (l === 'dom') {
        for (const t of p.toLowerCase().split('.').slice(0, -1)) {
          for (let i = 1; i < len(t) + 1; ++i) {
            const w = t.slice(0, i);
            ww[w] = (ww[w] || 0) + scu * ty;
          }
        }
      }
    }
  }

  Object.keys(ww).forEach(w => {
    if (!has(data.w2uid, w)) {
      updatemm2(w, data);
      const mutData = data;
      mutData.w2uid[w] = [];
    }
        // TODO: maybe this is too costly and complicated...
        // Unweighting scores
    const array = removeWeightsW2uid(data.w2uid[w], data);
    const elem = array.find(x => x[0] === uid);
    if (elem) {
      elem[1] = ww[w];
    } else {
      array.push([uid, ww[w]]);
    }
    const cap = len(array) > 1000 ? 300 : 200;
    const mutData = data;
    mutData.w2uid[w] = applyWeightsW2uid(array, data).slice(0, cap);
  });
}

function removeUrl(uid, data) {
  const mutData = data;
  const u = data.urls[uid];
  if (u) {
    // TODO: this does not remove all references to uid
    handleDeletedWords(uid, getUrlWords(u), new Set(), data);
    delete mutData.clusters[uid];
    delete mutData.net2_out[uid];
    delete mutData.net2_in[uid];
    delete mutData.net_time[uid];
    delete mutData.urls[uid];

    const url = getUrlVal(u, 'u');
    const nurl = url_norm(url);
    const k = md5(nurl);
    if (has(data.incl_urls, k)) {
      delete mutData.incl_urls[k];
    } else {
      const idx = data.excl_urls.findIndex(uu => uu === k);
      if (idx >= 0) {
        data.excl_urls.splice(idx, 1);
      }
    }
  }
}

//
// Event handlers
//
function handlePlacesEvent(e, data, action) {
  const { url, title } = e;
  let u = findUrl(url, data);
  if (action === 'delete') {
    if (!u) {
      return;
    }
    const allurls = new Set(getUrlVal(u, 'all_urls'));
    allurls.delete(url);
    setUrlVal(u, 'all_urls', [...allurls]);
    if (allurls.size === 0) {
      removeUrl(findUrlIdx(url, data), data);
    } else {
      // TODO: We cannot replace title to previous one, because we didn't backup...
    }
  } else {
    if (!u) {
      u = makeEmptyUrl(url, data);
    } else {
      const allurls = new Set(getUrlVal(u, 'all_urls'));
      allurls.add(url);
      setUrlVal(u, 'all_urls', [...allurls]);
    }
    if (title) {
      const PROBS = ['404', 'not found', 'error', 'problem', 'sorry', 'be found'];
      const oldtitle = getUrlVal(u, 'title') || '';
      const titleProb = PROBS.some(s => title.toLowerCase().includes(s));
      const oldTitleProb = PROBS.some(s => oldtitle.toLowerCase().includes(s));
      const replaceTitle = (
          !oldtitle ||
          (oldTitleProb && title) ||
          (!titleProb && len(oldtitle) < 15 && len(title) > 30)
      ); // TODO: check if this logic is equal/better than the original one
      if (replaceTitle) {
        const oldWords = getUrlWords(u);
        setUrlVal(u, 'title', title);
        const urlIdx = findUrlIdx(url, data);
        handleDeletedWords(urlIdx, oldWords, getUrlWords(u), data);
        updateW2uid(urlIdx, data);
      }
    }
  }
}

function findVisit(visits, visitDate, visitType, fromUrl) {
  return visits.findIndex(x => x[0] === visitDate && x[1] === visitType && x[2] === fromUrl);
}

function handleHistoryVisitsEvent(e, data, action) {
  const { visit_date: visitDate, visit_type: visitType, url, from_url: fromUrl } = e;
  let u = findUrl(url, data);
  if (action === 'delete') {
    if (!u) {
      return;
    }
    const urlIdx = findUrlIdx(url, data);
    setUrlVal(u, 'count', getUrlVal(u, 'count') - 1);
    const visits = getUrlVal(u, 'visits');
    const visitIdx = findVisit(visits, visitDate, visitType, findUrlIdx(fromUrl, data));
    if (visitIdx >= 0) {
      if (fromUrl) {
        const [isQuery, query] = is_search_url(fromUrl);
        const uu = findUrl(fromUrl, data);
        if (isQuery && query) {
          const oldWords = getUrlWords(u);
          popQuery(query, u);
          handleDeletedWords(urlIdx, oldWords, getUrlWords(u), data);
        } else if (uu) {
          for (const vv of getUrlVal(uu, 'visits')) {
            if (vv[2] !== null) {
              const uuu = data.urls[vv[2]];
              if (uuu) { // Careful! url with uid vv[2] might be have been dropped!!!!
                const [isQuery2, query2] = is_search_url(getUrlVal(uuu, 'u'));
                if (isQuery2 && query2) {
                  const oldWords = getUrlWords(u);
                  popQuery(query2, u);
                  handleDeletedWords(urlIdx, oldWords, getUrlWords(u), data);
                }
              }
            }
          }
        }
      }
      visits.splice(visitIdx, 1);
      if (visits.length > 0) {
        setUrlVal(u, 'last_visit', visits[visits.length - 1][0]);
      }
      const cnts = getUrlVal(u, 'c');
      cnts.forEach((_, i) => {
        cnts[i] = Math.max(1, cnts[i] - 1);
      });
      updateW2uid(urlIdx, data);
    }
  } else {
    const pushVisit = !u || (visitDate - getUrlVal(u, 'last_visit') || 0) > 1000 * 1000 * 4 * 3600;
    if (!u) {
      u = makeEmptyUrl(url, data);
    } else {
      const allurls = new Set(getUrlVal(u, 'all_urls'));
      allurls.add(url);
      setUrlVal(u, 'all_urls', [...allurls]);
    }
    setUrlVal(u, 'count', getUrlVal(u, 'count') + 1);
    if (pushVisit) {
      setUrlVal(u, 'last_visit', visitDate);
      getUrlVal(u, 'visits').push([
        visitDate,
        visitType,
        findUrlIdx(fromUrl, data),
      ]);

      // We just increment all counters. Actually a new visit event might be changing these counters
      // for all urls, so they are properly updated in fullPass.
      const cnts = getUrlVal(u, 'c');
      cnts.forEach((_, i) => cnts[i]++);

      // TODO: This query updating is not exactly the same, since we do not have forward pointers,
      // just backwards. So a visit may change the q value of a posterior visit (to_url, reverse of
      // fromUrl) and we would not update.
      if (fromUrl) {
        const [isQuery, query] = is_search_url(fromUrl);
        const uu = findUrl(fromUrl, data);
        // TODO: do the ancestors
        if (isQuery && query) {
          pushQuery(query, u);
        } else if (uu) {
          const visits = getUrlVal(uu, 'visits');
          for (const vv of visits) {
            if (vv[2] !== null) {
              const uuu = data.urls[vv[2]];
              if (uuu) { // Careful! url with uid vv[2] might be have been dropped!!!!
                const [isQuery2, query2] = is_search_url(getUrlVal(uuu, 'u'));
                if (isQuery2 && query2) {
                  pushQuery(query2, u);
                }
              }
            }
          }
        }
      }
      updateW2uid(findUrlIdx(url, data), data);
    }
  }
}

function makeEmptyIndex() {
  let labs = Object.keys(URL_MAP).map(k => [URL_MAP[k], k]);
  labs.sort((a, b) => a[0] - b[0]);
  labs = labs.map(x => x[1]);
  return {
    urls: [],
    w2uid: {},
    mm2: {},
    net_time: {},
    wwd: {},
    net2_out: {},
    net2_in: {},
    susp_dom: [],
    incl_urls: {},
    excl_urls: [],
    clusters: [],
    labs,
    labsc: ['2', '7', '30', '180', 'all'],
    labse: ['ki', 'si', 'ts'],
  };
}

export default class IndexBuilder {
  constructor() {
    this.buildingPromises = [];

    // Simple storage for index metadata (num events, last build time...)
    this.ss = new SimpleStorage();

    // This is the storage for the index
    // Tried to move this into SimpleStorage, but the proxy object
    // creation for large objects (like the index) is extremely slow
    this.storage = new IncrementalStorage();
  }
  checkInit() {
    if (!this.isInit) {
      throw new Error('indexbuilder not init');
    }
  }
  get index() {
    return this.storage.obj;
  }
  // eslint-disable-next-line no-unused-vars
  set index(val) {
    throw new Error('index is readonly');
  }

  get lastBuildTime() {
    this.checkInit();
    return this.ss.get('lastBuildTime');
  }
  set lastBuildTime(val) {
    this.checkInit();
    this.ss.set('lastBuildTime', val);
  }

  get numEvents() {
    this.checkInit();
    return this.ss.get('numEvents') || 0;
  }
  set numEvents(val) {
    this.checkInit();
    this.ss.set('numEvents', val);
  }

  get lastRows() {
    this.checkInit();
    return this.ss.get('lastRows') || 0;
  }
  set lastRows(val) {
    this.checkInit();
    this.ss.set('lastRows', val);
  }

  static placesDBExecutor(sql) {
    const conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
    return new Promise((resolve, reject) => {
      const results = [];
      conn.createAsyncStatement(sql).executeAsync({
        handleCompletion() {
          resolve(results);
        },

        handleError(error) {
          reject(error);
        },

        handleResult(resultSet) {
          let row = resultSet.getNextRow();
          while (row) {
            const res = [];
            try {
              for (let i = 0; ; ++i) {
                res.push(row.getResultByIndex(i));
              }
            } catch (e) {
              // Foo
            }
            results.push(res);
            row = resultSet.getNextRow();
          }
        },
      });
    });
  }

  get isInit() {
    return this.ss.isInit && this.storage.isOpen;
  }

    // Inits storage and table observers (and thus incremental updates)
  init() {
    return this.ss.open('index_metadata.json', 'HMSearch', true, true)
      .then(() => this.storage.open('data.json', e => this.processEvent(e), 'HMSearch', true))
      .then(() => {
        if (Object.keys(this.storage.obj).length === 0) {
          return this.storage.snapshot(makeEmptyIndex());
        }
        return Promise.resolve();
      })
      .then(() => {
          // TODO: Should we wait for all these inits in a Promise.all?
        this.mozHistoryVisitsObs = new TableChangeObserver();
        this.mozHistoryVisitsObs.ondiscardedevents = () => this.buildIndex();
        const urlExpr = '(SELECT mp.url FROM moz_places mp WHERE mp.id = %.place_id)';
        const fromUrlExpr = '(SELECT mp.url FROM moz_places mp, moz_historyvisits ' +
         'hv WHERE hv.place_id = mp.id AND hv.id = %.from_visit)';
        this.mozHistoryVisitsObs.init(IndexBuilder.placesDBExecutor, 'moz_historyvisits', e => {
          if (this.lastBuildTime) {
            if (!e.row.url) {
              CliqzUtils.log('NULL URL', 'ERROR');
            } else {
              CliqzUtils.log(e, 'applying event...');
              this.numEvents = (this.numEvents || 0) + 1;
              this.storage.processEvent(e);
            }
          } else {
            CliqzUtils.log('Ignoring event because index has not been fully built yet');
          }
        }, [{ // Additional fields for the trigger inserts
          name: 'url',
          type: 'TEXT',
          expr: urlExpr,
        }, {
          name: 'from_url',
          type: 'TEXT',
          expr: fromUrlExpr,
        }]);
        this.mozPlacesObs = new TableChangeObserver();
        this.mozPlacesObs.ondiscardedevents = () => this.buildIndex();
        this.mozPlacesObs.init(IndexBuilder.placesDBExecutor, 'moz_places', e => {
          if (this.lastBuildTime) {
            CliqzUtils.log(e, 'applying event...');
            this.numEvents = (this.numEvents || 0) + 1;
            this.storage.processEvent(e);
          } else {
            CliqzUtils.log('Ignoring event because index has not been fully built yet');
          }
        });
        return this.index;
      })
      .then(() => {
        this.pacemakerInterval = CliqzUtils.setInterval(() => this.pacemaker(), 5000);
      });
  }
  unload() {
  // TODO: Should we wait for all these inits in a Promise.all?
    this.mozHistoryVisitsObs.unload();
    this.mozPlacesObs.unload();
    CliqzUtils.clearInterval(this.pacemakerInterval);
    this.pacemakerInterval = null;
    return Promise.all([this.storage.close(), this.ss.close()]);
  }
  processEvent(e) {
    switch (e.table) {
      case 'moz_historyvisits':
        return handleHistoryVisitsEvent(e.row, this.index, e.action);
      case 'moz_places':
        return handlePlacesEvent(e.row, this.index, e.action);
      default:
        throw new Error(`unknown event table ${e.table}`);
    }
  }

  realBuildIndex() {
    return GatherData.getRawData()
      .then(data => {
        const promise = new Promise((resolve, reject) => {
          this.buildingPromises.push([resolve, reject]);
          if (!this.runComputation) {
            this.lastRows = data[0].length + data[1].length;
            this.runComputation = new Worker('index-worker.js');
            this.runComputation.postMessage([data]);
            this.runComputation.onmessage = e => {
              this.scheduledBuild = false;
              this.runComputation.terminate();
              this.runComputation = null;
              this.lastBuildTime = Date.now();
              this.numEvents = 0;
              const pr = this.storage.snapshot(e.data);
              this.buildingPromises.splice(0, this.buildingPromises.length).forEach(x => {
                try {
                  x[0](pr);
                } catch (e2) {
                  // Ignore exception
                }
              });
            };
            this.runComputation.onerror = e => {
              this.scheduledBuild = false;
              this.runComputation = null;
              this.buildingPromises.splice(0, this.buildingPromises.length).forEach(x => {
                try {
                  x[1](e);
                } catch (e3) {
                  // Ignore exception
                }
              });
            };
          }
        });
        return promise;
      });
  }

  buildIndex() {
    return new Promise((resolve, reject) => {
      this.scheduledBuild = true;
      this.buildingPromises.push([resolve, reject]);
    });
  }

  pacemaker() {
    const MAX_TIME = 1000 * 3600 * 24 * 7; // 7 days in ms
    const timeDiff = Date.now() - (this.lastBuildTime || 0);
    if (this.scheduledBuild || this.numEvents > this.lastRows / 4 || timeDiff > MAX_TIME) {
      if (!this.runComputation) {
        this.realBuildIndex();
      }
    }
  }

  _findUrlIdx(url) {
    return findUrlIdx(url, this.index);
  }
}
