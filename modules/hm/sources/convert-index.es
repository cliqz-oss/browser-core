import { ngrams, len, comp_url, is_search_url, btoa_safe, atob_safe, normalize, items, zip, range, dict, url_norm, has } from 'hm/helpers';
import md5 from 'core/helpers/md5';

// Data is an array of arrays. Internal arrays are:
// [moz_places, moz_inputhistory, moz_historyvisits, urltitles, urldescriptions, visits]
function mergeData(data) {
  let most_recent_visit_date = -1;
  const urls = {};
  const test = {};
  const desc_cl = {};
  const titles_cl = {};
  const urls_cl = {};
  for (const results of data) {
    const infile_id2url = {};
    const infile_url2id = {};

    results[0].forEach(row => {
      let { id, url, title, visit_count, hidden, typed, frecency } = row;
      id = id.toString();

      if (!has(infile_id2url, id)) {
        infile_id2url[id] = url;
      }
      if (!has(infile_url2id, url)) {
        infile_url2id[url] = id;
      }
      if (!has(urls, url)) {
        // Frecency is not aggregated, we use the first one we see (might be different to the python script)
        urls[url] = { count: visit_count, frec: frecency, visits: [], title };
      }
      else {
        urls[url].count += visit_count;
        if (!urls[url].title) {
          urls[url].title = title;
        }
      }
    });

    results[1].forEach(row => {
      let { place_id, input, use_count } = row;
      place_id = place_id.toString();
      if (!has(test, input)) {
        test[input] = {};
      }
      test[input][infile_id2url[place_id]] = (test[input][infile_id2url[place_id]] || 0) + use_count;
    });

    const visits = {};
    results[2].forEach(row => {
      let { id } = row;
      id = id.toString();
      visits[id] = row;
    });
    for (const id in visits) {
      const row = visits[id];
      let { from_visit, place_id, visit_date, visit_type } = row;
      place_id = place_id.toString();
      from_visit = from_visit.toString();
      let from_url = null;

      if (has(visits, from_visit)) {
        const fromID = visits[from_visit].place_id.toString();
        from_url = infile_id2url[fromID] || null;
      }
      urls[infile_id2url[place_id]].visits.push({
        visit_type,
        visit_date,
        from_url,
      });
      if (visit_date > most_recent_visit_date) {
        most_recent_visit_date = visit_date;
      }
    }

    results[3].forEach(row => {
      let { url, title } = row;
      if (!has(titles_cl, url)) {
        titles_cl[url] = title;
      }
      else if (title && (!titles_cl[url] || titles_cl[url].length < title.length)) { // Check if this is correct
        titles_cl[url] = title;
      }
    });

    results[4].forEach(row => {
      let { url, description: desc } = row;
      url = url_norm('http://' + url);
      if (!has(desc_cl, url)) {
        desc_cl[url] = desc;
      }
      else if (desc && (!desc_cl[url] || desc_cl[url].length < desc.length)) { // This was corrected, ask
        desc_cl[url] = desc;
      }
    });

    results[5].forEach(row => {
      const { url } = row;
      if (!has(urls_cl, url)) {
        urls_cl[url] = [];
      }
      delete row.id;
      delete row.url;
      urls_cl[url].push(row);
    });
  }
  return [urls, urls_cl, titles_cl, desc_cl, most_recent_visit_date, test];
}

export default function buildIndex(data) {
  let [urls, urls_cl, titles_cl, desc_cl, most_recent_visit_date, test] = mergeData(data);
  const time = Date.now();
  let [urls_cons, url2id, id2url, susp_dom, urls_class] = consolidate_sources(urls, urls_cl, titles_cl, desc_cl, most_recent_visit_date);
  const res = build_index2(urls_cons, url2id, id2url, susp_dom, urls_class);
  console.log('Elapsed(s): ', (Date.now() - time) / 1000);
  return res;
}

function _dominant_urls_count(urls, urls_cl, u) {
  let c = 0;
  if (has(urls, u)) {
    c += urls[u].count;
  }
  if (has(urls_cl, u)) {
    c += len(urls_cl[u]);
  }
  return c;
}

function dominant_urls(list_urls, urls, urls_cl, titles_cl) {
  const with_tit = {};
  let num_with_titles = 0;
  for (const u of list_urls) {
    const tit = (has(urls, u) ? urls[u].title : titles_cl[u]) || '';
    if (tit.length > 0) {
      if (!has(with_tit, tit)) {
        with_tit[tit] = [];
      }
      with_tit[tit].push(u);
      num_with_titles++;
    }
  }
  if (num_with_titles === 1) {
    return with_tit[Object.keys(with_tit)[0]][0];
  }
  else if (num_with_titles === 0) {
    const ww = list_urls.map(u => [u, _dominant_urls_count(urls, urls_cl, u)]).filter(u => u[1] > 1);
    if (len(ww) === 0) {
      return null;
    }
    ww.sort((a, b) => b[1] - a[1]);
    return ww[0][0];
  }
    else {
    const _urls_with_titles = {};
    for (const k in with_tit) {
      for (const v of with_tit[k]) {
        _urls_with_titles[v] = true;
      }
    }
    const list_urls_with_titles = Object.keys(_urls_with_titles);
    const wws = list_urls_with_titles.map(u => [u, _dominant_urls_count(urls, urls_cl, u)]);
    wws.sort((a, b) => b[1] - a[1]);
    return wws[0][0];
  }
}

function merge_urls(list_urls, sink_url, urls, urls_cl, titles_cl, desc_cl) {
  const p = {
    count: 0,
    cl: false,
    cl_q: [],
    frec: 0,
    eng: {},
    eng_cnt: {},
    cl_visits: 0, // FIXME: Bug! Fix in python, counting sink_url visits twice!
    visits: [],
    title: titles_cl[sink_url] || null,
    desc: desc_cl[url_norm(sink_url)] || null, // Why url_norm here?
    last_visit_real: null,
    all_urls: [],
  };

  for (const slab of ['si', 'ki', 'ts']) {
    p.eng[slab] = 0;
  }

  if (p.title === null) {
    if (has(urls, sink_url)) {
      p.title = urls[sink_url].title;
    }
  }

  const _setUrls = {};
  for (const u of list_urls) {
    _setUrls[u] = true;
  }
  _setUrls[sink_url] = true;

  for (const u in _setUrls) {
    if (has(urls, u)) {
      p.count += urls[u].count;
      p.visits = p.visits.concat(urls[u].visits);
      p.last_visit_real = Math.max(p.last_visit_real, ...urls[u].visits.map(x => x.visit_date));
    }
    else {
      p.visits = p.visits.concat((urls_cl[u] || []).map(v => ({ from_url: null, visit_type: -1, visit_date: v.visit_date * 1000 })));
    }

    if (has(urls_cl, u)) {
      p.cl = true;
      p.cl_visits += len(urls_cl[u]);
      const new_title = titles_cl[u] || '';
            // FIXME: new_title might be prob (title_prob = true), but we are inserting it anyway,
            // and might not get replaced by a good one later
      if (!p.title) {
        p.title = new_title;
      }
      let title_prob = false;
      for (const s of ['404', 'not found', 'error', 'problem', 'sorry', 'be found']) {
        if (new_title.toLowerCase().includes(s)) {
          title_prob = true;
        }
      }
      if (!title_prob) {
        if (len(p.title) < 15 && len(new_title) > 30) {
          p.title = new_title;
        }
      }
      for (let [lab, thres, slab] of [['scroll_interaction', 1500, 'si'], ['keyboard_interaction', 0, 'ki'], ['time_spent', 0, 'ts']]) {
        const per = urls_cl[u].filter(x => x[lab] > thres).map(x => x[lab]);
        p.eng[slab] = (p.eng[slab] || 0);
        p.eng_cnt[slab] = (p.eng_cnt[slab] || 0);
                // TODO: check correctness of this
        if (per.length > 0) {
          p.eng[slab] = (p.eng_cnt[slab] * p.eng[slab] + per.reduce((oldVal, newVal) => oldVal + newVal)) / (p.eng_cnt[slab] + per.length);
        }
        p.eng_cnt[slab] += per.length;
      }

      for (const x of urls_cl[u]) {
        if (x.time_spent > 1000 && x.last_query) {
          const diff = Math.abs(x.last_query_date - x.visit_date);
          if (diff < 10 * 60 * 1000) {
            p.cl_q.push(x.last_query);
          }
        }
      }
    }
  }
  p.cl_q = [...(new Set(p.cl_q))];
  p.visits.sort((a, b) => a.visit_date - b.visit_date);
  return p;
}

function valid_query(q) {
  if (!q) {
    return false;
  }

  if (len(q) > 80) {
    return false;
  }

  for (const x of q.split(' ')) {
    if (len(x) > 30) {
      return false;
    }
  }

  return true;
}

function valid_query_strict(q) {
  if (!valid_query(q)) {
    return false;
  }

  if (q.includes('://')) {
    return false;
  }

  const v = q.split('.');

  if (len(v) > 2) {
    return false;
  }

  if (len(v) === 2 && !q.includes(' ')) {
    return false;
  }

  return true;
}

function queries_from_ancestor(urls, u) {
  const resh = {};
  for (const v of urls[u].visits) {
    const u2 = v.from_url;
    if (u2 !== null) {
      const vq2 = (urls[u2] || {}).q || [];
      for (const [q, ] of vq2) {
        resh[q] = (resh[q] || 0) + 1;
      }
    }
  }
  const _res = [];
  for (const key in resh) {
    const val = resh[key];
    _res.push([key, val]);
  }
  _res.sort((a, b) => b[1] - a[1]);
  return _res;
}


function link_visits(v1, v2, gap_in_sec) {
  const lv1 = len(v1);
  const lv2 = len(v2);
  for (let i = 0; i < lv1; ++i) {
    for (let j = 0; j < lv2; ++j) {
      const diff = Math.abs(v1[i] - v2[j]) / (1000 * 1000);
      if (diff < gap_in_sec) {
        return true;
      }
    }
  }
  return false;
}

function consolidate_sources(urls, urls_cl, titles_cl, desc_cl, most_recent_visit_date) {
  const mergeables = {};
  const urls_class = {};
  for (const url in urls) {
    const nurl = url_norm(url);
    if (!has(mergeables, nurl)) {
      mergeables[nurl] = {};
    }
    mergeables[nurl][url] = true;
  }
  for (const url in urls_cl) {
    if (!has(urls, url)) {
      const nurl = url_norm(url);
      if (!has(mergeables, nurl)) {
        mergeables[nurl] = {};
      }
      mergeables[nurl][url] = true;
    }
  }
    // Now mergeables contains mappings from normalized urls to original urls

  for (const url in urls_cl) {
    const visits_with_stay = urls_cl[url].filter(v => v.time_spent >= 0);
    if (visits_with_stay.length > 0) {
      urls_cl[url] = visits_with_stay;
    }
        // TODO: otherwise we keep them?
  }
    // We have filtered out visits with time_spent < 0 (if there was any)

  const url2id = {};
  const id2url = {};
  let id = 0;
  for (const u in urls) {
    url2id[u] = id;
    id2url[id] = u;
    id++;
  }
  for (const u in urls_cl) {
    if (!has(urls, u)) {
      url2id[u] = id;
      id2url[id] = u;
      id++;
    }
  }
  const now = (new Date()) * 1000; // TODO: max resolution is in milliseconds, hopefully enough
    // TODO: is this ok? now gets cancelled, right? so equal to most_recent_visit_date + 24*3600*1000*1000
  const curr_time = now - (now - most_recent_visit_date) + 24 * 3600 * 1000 * 1000;
  const ll = [];
  for (const k in mergeables) {
    const v = mergeables[k];
    const keys = Object.keys(v);
    if (keys.length > 1) {
      ll.push([k, keys]);
    }
  }

  console.log('There are ' + ll.length + ' \'duplicated\' urls');
  const len_bef = len(urls);
  const rev_mergeables = {};
  const processed_urls = {};
  const new_urls = {};
  for (let [nurl, list_urls] of ll) {
    for (const u of list_urls) {
      processed_urls[u] = true;
    }
    const sink_url = dominant_urls(list_urls, urls, urls_cl, titles_cl);
    if (sink_url !== null) {
      const p = merge_urls(list_urls, sink_url, urls, urls_cl, titles_cl, desc_cl);
      if (p !== null) { // TODO: check if the check must be explicit to not null
        new_urls[sink_url] = p;
        urls_class[sink_url] = sink_url;
        for (const u of list_urls) {
          rev_mergeables[u] = sink_url;
          urls_class[u] = sink_url;
        }
      }
    }
  }

  for (const u of Object.keys(urls).concat(Object.keys(urls_cl))) {
    if (!has(processed_urls, u)) {
      processed_urls[u] = true;
      const sink_url = u;
      const list_urls = [];
      const p = merge_urls(list_urls, sink_url, urls, urls_cl, titles_cl, desc_cl);
      if (p !== null) {
        new_urls[sink_url] = p;
        urls_class[sink_url] = sink_url;
        for (const u of list_urls) {
          rev_mergeables[u] = sink_url;
          urls_class[u] = sink_url;
        }
      }
    }
  }
  urls = new_urls;

  console.log('Before merge: ' + len_bef + ' After: ' + len(urls) + ' (' + len(urls_class) + ')');
  console.log('Removing urls that are SERP:');

  const search_urls = {};
  for (const u in urls) {
    let [is_query, query] = is_search_url(u);
    if (is_query) {
      search_urls[u] = query;
    }
  }

  let _cntQueryExtracted = 0;
  const _searchUrlsValues = {};
  for (const key in search_urls) {
    const x = search_urls[key];
    if (x !== null) {
      ++_cntQueryExtracted;
    }
    _searchUrlsValues[x] = true;
  }

  console.log(len(search_urls) + ' urls that are SERP, '
     + _cntQueryExtracted + ' had query extracted, ' + len(_searchUrlsValues)
     + ' unique queries');

  const words_hist = {};
  const words_freq2 = {};
  const hist_times = {};
  let drop_urls = {};
  const drop_dom = {};

  for (const u in urls) {
    if (has(search_urls, u)) {
      continue;
    }
    let [dom, p1, p2, qs] = comp_url(u);
    const title = urls[u].title;
    const acc = [];
    urls[u].original_visits = urls[u].visits;
    const len_visits = urls[u].visits.length;
    if (len_visits > 0) {
      acc.push(urls[u].visits[0]);
    }
        // Visits are ordered by visit date
    for (let i = 1; i < len_visits; ++i) {
      const v1 = acc[acc.length - 1];
      const v2 = urls[u].visits[i];
      const diff = v2.visit_date - v1.visit_date;
      if (diff > 1000 * 1000 * 4 * 3600) {
        acc.push(v2);
      }
    }
    const agg_vis = acc;
    if (agg_vis.length === 0) {
      drop_urls[u] = true;
      drop_dom[dom] = (drop_dom[dom] || 0) + 1;
    }
    else {
      urls[u].c = { all: agg_vis.length };
      urls[u].last_visit = agg_vis[agg_vis.length - 1].visit_date;
      urls[u].visits = agg_vis;

      const intervals = [2, 7, 30, 180];
      for (const interval of intervals) {
        urls[u].c[interval.toString()] = 0;
      }
      for (const interval of intervals) {
        const thres = curr_time - interval * 24 * 3600 * 1000 * 1000;
        const count = urls[u].visits.filter(x => x.visit_date >= thres).length;
        urls[u].c[interval.toString()] = count;
        if (count > 0) {
          hist_times[interval] = (hist_times[interval] || 0) + 1;
        }
      }
      if (urls[u].c['180'] < 3 && qs !== null && len(qs) > 200) {
        drop_urls[u] = true;
        drop_dom[dom] = (drop_dom[dom] || 0) + 1;
      }
    }
  }

    // Compute urls[u].q
  for (const u in urls) {
    if (has(search_urls, u)) {
      continue;
    }
    for (const v of urls[u].visits) {
      const u2 = v.from_url;
      if (u2 !== null && has(search_urls, u2)) {
        const q = search_urls[u2];
        if (q) {
          if (valid_query(q)) {
            if (!has(urls[u], 'q')) {
              urls[u].q = [];
            }
            urls[u].q.push(q);
          } // If not, should we go to the other else?
        }
        else {
          for (const v2 of urls[u2].visits) {
            const u3 = v2.from_url;
            if (u3 !== null && has(search_urls, u3)) {
              const q = search_urls[u3];
              if (q && valid_query(q)) {
                if (!has(urls[u], 'q')) {
                  urls[u].q = [];
                }
                urls[u].q.push(q);
              }
            }
          }
        }
      }
    }
  }

  for (const u in urls) {
    if (has(urls[u], 'q')) {
      const qh = {};
      const qh_original = {};
      for (const q of urls[u].q) {
        const nq = normalize(q);
        if (!has(qh, nq)) {
          qh[nq] = 0;
          qh_original[nq] = q;
        }
        qh[nq]++;
      }
      const tmp = [];
      for (const key in qh) {
        const val = qh[key];
        tmp.push([key, val]);
      }
      tmp.sort((a, b) => b[1] - a[1]);
      urls[u].q = tmp.map(([nq, sc]) => [qh_original[nq], sc]);
    }
  }

  let num_queries = 0;
  let qh = {};
  for (const u in urls) {
    if (len(urls[u].q || []) > 0) {
      num_queries++;
      for (const [q,] of urls[u].q) {
        qh[q] = true;
      }
    }
  }

  console.log(num_queries + ' urls have a query associated with from SERP, ' + len(qh)
        + ' different queries');

  const rev_search_urls = {};
  for (const u in search_urls) {
    const q = search_urls[u];
    if (q !== null) {
      const q_norm = normalize(q);
      if (!has(rev_search_urls, q_norm)) {
        rev_search_urls[q_norm] = [];
      }
      rev_search_urls[q_norm].push(u);
    }
  }

    // Apparently, adding some more queries extracted from the cliqz table and url ancestors
  const add_queries = {};
  const add_queries_ref = {};
  for (const u in urls) {
    const vq_cl = urls[u].cl_q || [];
    const vq = urls[u].q || [];
    if (len(vq_cl) > 0 && len(vq) === 0) {
            // Adding queries from ancestors if they are in cliqz queries (vq_cl)
      const q_ancestor = queries_from_ancestor(urls, u);
      for (let [q, sc] of q_ancestor) {
        if (vq_cl.indexOf(q) > -1) { // Array search, might be expensive
          if (valid_query_strict(q)) {
            if (!has(add_queries, u)) {
              add_queries[u] = [];
            }
            add_queries[u].push([q, sc]);
          }
        }
      }
            // For each cliqz query for this url, find the search urls it comes from,
            // then if any visit from url u can be linked to visit to the search url we add query
      const visits_u = urls[u].visits.map(x => x.visit_date);
      for (const x of vq_cl) {
        const nx = normalize(x);
        if (has(rev_search_urls, nx)) {
          for (const u2 of rev_search_urls[nx]) {
            const visits_u2 = urls[u2].visits.map(x => x.visit_date);
            if (link_visits(visits_u, visits_u2, 15)) {
              if (!has(add_queries_ref, u)) {
                add_queries_ref[u] = {};
              }
              for (const q of vq_cl) {
                if (valid_query_strict(q)) {
                  add_queries_ref[u][q] = (add_queries_ref[u][q] || 0) + 1;
                }
              }
            }
          }
        }
      }
    }
    if (has(add_queries_ref, u)) {
      const _tmp = [];
      for (const key in add_queries_ref[u]) {
        const val = add_queries_ref[u][key];
        _tmp.push([key, val]);
      }
      _tmp.sort((a, b) => b[1] - a[1]);
      add_queries_ref[u] = _tmp;
    }
  }

  for (const u in add_queries) {
    const vq = add_queries[u];
    if (!has(urls[u], 'q')) {
      urls[u].q = [];
    }
    for (let [q, sc] of vq) {
      urls[u].q.push([q, sc]);
    }
    urls[u].q.sort((a, b) => b[1] - a[1]);
  }

  for (const u in add_queries_ref) {
    const vq = add_queries_ref[u];
    if (!has(urls[u], 'q')) {
      urls[u].q = [];
    }
    for (let [q, sc] of vq) {
      urls[u].q.push([q, sc]);
    }
    urls[u].q.sort((a, b) => b[1] - a[1]);
  }

  num_queries = 0;
  qh = {};
  for (const u in urls) {
    if (len(urls[u].q || []) > 0) {
      num_queries++;
      for (const [q,] of urls[u].q) {
        qh[q] = true;
      }
    }
  }

  console.log(num_queries + ' urls have a query associated with from SERP, ' + len(qh)
        + ' different queries');

  for (const k in drop_urls) {
    urls_class[k] = null;
    delete urls[k];
  }
  for (const k in search_urls) {
    urls_class[k] = null;
    delete urls[k];
  }

  console.log('After dropping: ' + len(urls) + ', dropped: ' +
        + len(drop_urls) + ', dropped serps and redirects: ' + len(search_urls));

  drop_urls = {};

    // Dropping more urls based on several checks
  for (const u in urls) {
    let [dom, p1, p2, qs] = comp_url(u);
    const title = urls[u].title;

    if (qs !== null && len(qs) > 30) {
      if (urls[u].frec <= 0 && urls[u].c.all < 4) {
        drop_urls[u] = 'frec';
        drop_dom[dom] = (drop_dom[dom] || 0) + 1;
      }
    }

    if (len(urls[u].visits) > 0) {
      const visits_with_type_6 = urls[u].visits.filter(v => v.from_url !== null && v.visit_type === 6);
      if (len(visits_with_type_6) === len(urls[u].visits)) {
        if (qs !== null && len(qs) > 30) {
          drop_urls[u] = 'visits_6';
          drop_dom[dom] = (drop_dom[dom] || 0) + 1;
        }
      }
    }

    if (len(urls[u].visits) > 4) {
      const visits_with_type_6_or_5 = urls[u].visits.filter(v => v.from_url !== null && (v.visit_type === 6 || v.visit_type === 5));
      if (len(visits_with_type_6_or_5) === len(urls[u].visits)) {
        let has_query = false;
        for (const v of urls[u].visits) {
          if (v.from_url !== null) {
            const [is_search, ] = is_search_url(v.from_url);
            has_query = has_query || is_search;
          }
        }
        if (!has_query) {
          drop_urls[u] = 'visits_6_5_and_not_query';
          drop_dom[dom] = (drop_dom[dom] || 0) + 1;
        }
      }
    }
  }

  for (const k in drop_urls) {
    urls_class[k] = null;
    delete urls[k];
  }

  console.log('After dropping: ' + len(urls) + ', dropping based on suspicious patterns: ' +
        + len(drop_urls));

  const rem_dom = {};
  for (const u in urls) {
    let [dom, p1, p2, qs] = comp_url(u);
    rem_dom[dom] = (rem_dom[dom] || 0) + 1;
  }
  const _srem = new Set(Object.keys(rem_dom));
  const sdom = Object.keys(drop_dom).filter(x => _srem.has(x));
  const _potential_remove = sdom.filter(i => rem_dom[i] / drop_dom[i] < 0.1 && drop_dom[i] > 10 && rem_dom[i] < 20);
  const potential_remove = {};
  for (const i of sdom) {
    if (rem_dom[i] / drop_dom[i] < 0.1 && drop_dom[i] > 10 && rem_dom[i] < 20) {
      potential_remove[i] = [i, rem_dom[i], drop_dom[i], rem_dom[i] / drop_dom[i]];
    }
  }

  drop_urls = {};
  for (const u in urls) {
    let [dom, p1, p2, qs] = comp_url(u);
    if (has(potential_remove, dom)) {
      if (p2 !== null || qs !== null) {
        drop_urls[u] = true;
      }
    }
  }

  for (const k in drop_urls) {
    urls_class[k] = null;
    delete urls[k];
  }
  console.log('After dropping: ' + len(urls) + ' dropping based mixed domains: ' + len(drop_urls));

  const drop_urls_time = {};

    // Again, must be visits sorted by time?
  for (const u in urls) {
    const num_visits = len(urls[u].visits);
    const thres = 1000000 * 3600 * 24 * 365 * (num_visits > 2 ? 3 : 2);
    if (urls[u].visits[num_visits - 1].visit_date < (curr_time - thres)) {
      drop_urls_time[u] = true;
    }
  }

  for (const k in drop_urls_time) {
    urls_class[k] = null;
    delete urls[k];
  }

  console.log('After dropping: ' + len(urls) + ', dropping based on time: ' + len(drop_urls_time));

  for (const u in urls) {
    for (const v of urls[u].visits) {
      if (v.from_url !== null && has(rev_mergeables, v.from_url)) {
        v.from_url = rev_mergeables[v.from_url];
      }
    }
  }

  drop_urls = {};
  for (const url in urls) {
    if (len(url) > 1024) {
      drop_urls[url] = true;
    }
    const tit = urls[url].title || '';
    if (len(tit) > 1024) {
      drop_urls[url] = true;
    }
  }

  console.log(len(drop_urls) + ' urls are longer than 1024 chars');
  for (const k in drop_urls) {
    delete urls[k];
    urls_class[k] = null;
  }

  drop_urls = {};
  const valid_protocols = ['http:', 'https:', 'ftp:', 'about:', 'ws:', 'file'];
  for (const url in urls) {
    const ul = url.toLowerCase();
    let found = false;
    for (const p of valid_protocols) {
      if (ul.startsWith(p)) {
        found = true;
        break;
      }
    }
    if (!found) {
      drop_urls[url] = true;
    }
  }

  console.log(len(drop_urls) + ' urls without a valid protocol');
  for (const k in drop_urls) {
    delete urls[k];
    urls_class[k] = null;
  }

    // sanity checks
  let _l1 = 0;
  for (const u in urls_class) {
    const k = urls_class[u];
    if (u === k) {
      _l1++;
    }
  }
  let _l2 = 0;
  for (const u in urls_class) {
    const k = urls_class[u];
    if (u === k && has(urls, u)) {
      _l2++;
    }
  }


  console.log('URL2ID and IDURL size? ' + (len(url2id) === len(id2url)));
  console.log('URLS and URLSCLASS consistent on size? ' + (_l1 === len(urls)));
  console.log('ALL URLS_CLASS IN URL? ' + (_l2 === len(urls)));

  return [urls, url2id, id2url, [], urls_class];
}

function build_index2(urls, url2id, id2url, susp_dom, urls_class) {
    // net_time[uid1][uid2] = number of times uid1 and uid2 are neighbours (inside a time window of 10 minutes)
    // inside whole timeline
  const net_time = {};
    // net2_in[uid][visit_type] = number of times uid has received some visit of that type from another url
  const net2_in = {};
    // net2_out[uid][visit_type] = number of times uid has done some visit of that type to another url
  const net2_out = {};

  for (const u in urls) {
    const uid1 = url2id[u];
    for (const v of urls[u].visits) {
      if (v.from_url !== null && has(urls, v.from_url)) {
        const uid2 = url2id[v.from_url];
        if (!has(net2_in, uid1)) {
          net2_in[uid1] = {};
        }
        if (!has(net2_in[uid1], v.visit_type)) {
          net2_in[uid1][v.visit_type] = {};
        }

        net2_in[uid1][v.visit_type][uid2] = (net2_in[uid1][v.visit_type][uid2] || 0) + 1;

        if (!has(net2_out, uid2)) {
          net2_out[uid2] = {};
        }
        if (!has(net2_out[uid2], v.visit_type)) {
          net2_out[uid2][v.visit_type] = {};
        }

        net2_out[uid2][v.visit_type][uid1] = (net2_out[uid2][v.visit_type][uid1] || 0) + 1;
      }
    }
  }
    // Compute timeline[time_in_min][url_uid] = true for all visits
  const timeline = {};
  for (const u in urls) {
    const uid1 = url2id[u];
    if (len(urls[u].visits) < 10) {
      for (const v of urls[u].visits) {
        const time_in_min = Math.floor(v.visit_date / (1000000 * 60));
        if (!has(timeline, time_in_min)) {
          timeline[time_in_min] = {};
        }
        timeline[time_in_min][uid1] = true;
      }
    }
  }
    // For all time events, compute all neighbours (in a window of 10 minutes), then increment
    // net_time[uid1][uid2] and viceversa for all pairs of neighbours
  const time_events = Object.keys(timeline).map(a => parseInt(a));
  for (const te of time_events) {
    let neigh = {};
    for (let r = te - 10; r < te + 11; ++r) {
      if (has(timeline, r)) {
        for (const uid in timeline[r]) {
          neigh[uid] = true;
        }
      }
    }
    neigh = Object.keys(neigh);
    const _lneigh = len(neigh);
    for (let i = 0; i < _lneigh; ++i) {
      for (let j = i + 1; j < _lneigh; ++j) {
        const uid1 = neigh[i];
        const uid2 = neigh[j];
        if (uid1 !== uid2) {
          if (!has(net_time, uid1)) {
            net_time[uid1] = {};
          }
          if (!has(net_time, uid2)) {
            net_time[uid2] = {};
          }
          net_time[uid1][uid2] = (net_time[uid1][uid2] || 0) + 1;
          net_time[uid2][uid1] = (net_time[uid2][uid1] || 0) + 1;
        }
      }
    }
  }

  const words_f = {}; // words_f[w] score for each word (sum for all urls of sc_u*ty)
  const words_url = {}; // words_url[w][url] whether word w is related with url
    // let words_dom = {}; // words_dom[w][dom] = whether word w is related with domain dom (unused)
  const words_with_dots = {}; // words_with_dots[w] = count of number times word w was preceded by a dot

  for (const u in urls) {
    urls[u].w = {};
        // Score of url based on number of visits, giving some more importance to recent visits
    const sc_u = Math.log(urls[u].c.all + 1) + Math.log(urls[u].c['180'] + 1) + Math.log(urls[u].c['30'] + 1);
    let [dom, p1, p2, qs] = comp_url(u);
    const title = urls[u].title || '';
    const desc = urls[u].desc || '';
    const q = (urls[u].q || []).map(([q, sc]) => q).join(' ');

    for (let [p, ty, lab] of [[dom, 1.0, 'd'], [p1, 0.8, 'p1'], [p2, 0.6, 'p2'], [qs, 0.3, 'qs'], [title, 0.9, 't'], [q, 1.0, 'q'], [desc, 0.8, 'de']]) {
      if (!p) {
        continue;
      }

      const normp = normalize(p);
      const vnormp = normp.split(' ').filter(t => len(t) > 0);

      if (['d', 'p1', 'p2'].indexOf(lab) > -1) {
        for (const w of vnormp) {
          const ind = p.toLowerCase().indexOf(w);
          if (ind > 0) {
            if (p[ind - 1] === '.' && ind + len(w) > len(p) - 2) {
              words_with_dots[w] = (words_with_dots[w] || 0) + 1;
            }
          }
        }
      }

      if (len(vnormp) > 0) {
        urls[u].w[lab] = vnormp;
      }

      for (const w of vnormp) {
        words_f[w] = (words_f[w] || 0) + sc_u * ty;
        if (!has(words_url, w)) {
          words_url[w] = {};
        }
        words_url[w][u] = true;

                // if (!has(words_dom, w)) {
                //     words_dom[w] = {};
                // }
                // words_dom[w][dom] = true;
      }
    }
  }
    // Now words_url[w] = num of urls related with word w
  for (const key in words_url) {
    words_url[key] = len(words_url[key]);
  }
    // Remove words_with_dots if the count is less than 6
  for (const w in words_with_dots) {
    if (words_with_dots[w] <= 5) {
      delete words_with_dots[w];
    }
  }
    // Divide words_f by the num of urls related with that word (some kind of idf normalization?)
  const words_fn = {};
  for (const k in words_f) {
    words_fn[k] = words_f[k] / Math.log(words_url[k] + 10.0);
  }

  const mm = {}; // mm[ng][w] = score of the ngram for word w (ng_sc * w_sc) FIXME: if ngram is repeated, then they get replaced
  let cc = 0;
  for (const w in words_fn) {
    const w_sc = words_fn[w];
    if (len(w) > 38) {
      continue;
    }

    for (let r = len(w); r > 0; --r) {
      const ngv = ngrams(w, r);
      for (let i = 0; i < len(ngv); ++i) {
        const ng = ngv[i];
        let ng_sc;
        if (i === 0) {
          ng_sc = 1.0;
        }
        else if (i === len(ngv) - 1) {
          ng_sc = 0.5;
        }
                else if (len(ngv) > 8) {
                  ng_sc = 0.0;
                }
                else {
                  ng_sc = 0.2;
                }
        ng_sc *= Math.pow(r / len(w), 0.5);

        if (ng_sc > 0.0) {
          if (!has(mm, ng)) {
            mm[ng] = {};
          }

          mm[ng][w] = ng_sc * w_sc;
        }
      }
    }
    cc++;
    if (cc % 1000 === 0) {
      console.log('done ' + cc + ' words of ' + len(words_fn));
    }
  }
  const mm2 = {}; // mm2[ng] => [[w, sc],...] For each ngram the list of words with most score (after some capping and filtering)
  for (const w in mm) {
    const _tmp = [];
    for (const key in mm[w]) {
      _tmp.push([key, mm[w][key]]);
    }
    _tmp.sort((a, b) => b[1] - a[1]);
    mm[w] = _tmp;
    const cap = 120;
    if (len(mm[w]) > 1) {
      mm2[w] = mm[w].slice(0, Math.floor(cap / 3)).concat(
                mm[w].slice(Math.floor(cap / 3) + 1).filter(([w2, sc2]) => w2.startsWith(w)).slice(0, Math.floor(cap / 2))
            );
    }
  }
  console.log('Size mm2: ' + len(JSON.stringify(mm2)) / 1000000 + 'MB');
  const w2uid = {}; // w2uid[w][uid] = score of word w for url uid
  const dom_by_uid = {}; // domain for each url
  for (const u in urls) {
    const sc_u = Math.log(urls[u].c.all + 1) + Math.log(urls[u].c['180'] + 1) + Math.log(urls[u].c['30'] + 1);
    const uid = url2id[u];
    let [dom, p1, p2, qs] = comp_url(u);
    const title = urls[u].title || '';
    const desc = urls[u].desc || '';

    const q = (urls[u].q || []).map(([q, sc]) => q).join(' ');

    dom_by_uid[uid] = dom;

    for (let [p, ty, l] of zip([dom, p1, p2, qs, title, q, desc], [1.0, 0.8, 0.7, 0.5, 0.8, 1.0, 0.8], ['dom', 'p1', 'p2', 'qs', 'title', 'q', 'desc'])) {
      if (p) {
        const normp = normalize(p);
        const vnormp = normp.split(' ').filter(t => len(t) > 0);

        for (const w of vnormp) {
          if (has(mm, w)) {
            if (!has(w2uid, w)) {
              w2uid[w] = {};
            }
            w2uid[w][uid] = (w2uid[w][uid] || 0) + sc_u * ty;
          }
        }

        if (l === 'dom') {
          for (const t of p.toLowerCase().split('.').slice(0, -1)) {
            for (let i = 1; i < len(t) + 1; ++i) {
              const w = t.slice(0, i);
              if (!has(w2uid, w)) {
                w2uid[w] = {};
              }
              w2uid[w][uid] = (w2uid[w][uid] || 0) + sc_u * ty;
            }
          }
        }
      }
    }
  }

    // w2uid[w] = list of N urls with most score for word w (we penalize urls with repeated domain)
  for (const w in w2uid) {
    w2uid[w] = items(w2uid[w]);
    w2uid[w].sort((a, b) => b[1] - a[1]);
    const tmp = [];
    const dom_freq = {};
    for (let [uid, sc] of w2uid[w]) {
      dom_freq[dom_by_uid[uid]] = (dom_freq[dom_by_uid[uid]] || 0.0) + 1.0;
      const sc_mod = sc * Math.pow(0.9, dom_freq[dom_by_uid[uid]]);
      tmp.push([parseInt(uid), sc_mod]);
    }
    tmp.sort((a, b) => b[1] - a[1]);
    const cap = len(tmp) > 1000 ? 300 : 200;
    w2uid[w] = tmp.slice(0, cap);
  }

  console.log('Size w2uid: ' + len(JSON.stringify(w2uid)) / 1000000 + 'MB');

  const included_urls = {};
  const excluded_urls = [];
  for (const u in urls_class) {
    const v = urls_class[u];
    const k = md5(url_norm(u));
    if (v === null) {
      excluded_urls.push(k);
    }
    else {
      if (!has(url2id, v)) {
        console.log('!!!!!!!');
      }
      included_urls[k] = url2id[v];
      if (urls[v]) {
        urls[v].all_urls.push(u);
      }
    }
  }

  const data_old_format = {
    urls,
    url2id,
    id2url,
    w2uid,
    mm2,
    net_time,
    wwd: words_with_dots,
    net2_out,
    net2_in,
    susp_dom,
    incl_urls: included_urls,
    excl_urls: excluded_urls,
  };
    // note that the following analysis use the final format instead of the old one, this is because
    // those operation might be redone on query time, thus we need the same input to reuse code
  let data_new_format = reduce_size(data_old_format);

    // yes, we need this, because the online functions of search assume file is loaded from disk,
    // and json.loads converts numeric keys on hash to strings
  data_new_format = JSON.parse(JSON.stringify(data_new_format));

  const uid = 0;
  for (let uid = 0; uid < data_new_format.urls.length; ++uid) {
    const x = data_new_format.urls[uid];
    if (x !== null) {
      const page = uid2page(uid, data_new_format);
      let [in_sc, in_sc_lab] = score_incoming(page, data_new_format);
      x.push(in_sc);
      x.push(in_sc_lab);
      data_new_format.urls[uid] = x;
    }
  }
  data_new_format.labs = data_new_format.labs.concat(['in_sc', 'in_sc_lab']);


  const clusters = new Array(len(data_new_format.urls));
  let count = 0;

  const by_dom = {};
  const posu = data_new_format.labs.indexOf('u');

  for (let uid = 0; uid < data_new_format.urls.length; ++uid) {
    const x = data_new_format.urls[uid];
    if (x !== null) {
      const url = data_new_format.urls[uid][posu];
      let [dom, , , ] = comp_url(url);
      if (!has(by_dom, dom)) {
        by_dom[dom] = [];
      }
      by_dom[dom].push(uid);
    }
  }

  for (let uid = 0; uid < data_new_format.urls.length; ++uid) {
    const x = data_new_format.urls[uid];
    if (x !== null) {
      let [, url, title, time_sc, stren_sc, count_all] = get_minimal_data(uid, data_new_format);
      const clust_items = clustering_single(uid, url, title, data_new_format, {}, by_dom);
      if (len(clust_items) > 0) {
        clusters[uid] = clust_items;
      }
    }
    count++;
    if (count % 1000 === 0) {
      console.log('doing clustering: ' + count);
    }
  }

  data_new_format.clusters = clusters;

  console.log('Final Size data: ' + len(JSON.stringify(data_new_format)) / 1000000);
  return data_new_format;
}

function clustering_single(uid, url, title, data, comp_url_cache, by_dom = null) {
  const page = uid2page(uid, data);

    // neighbours out of referrals
  const out2 = get_outgoing(uid, data, 2);
  let outl = items(out2);
  outl.sort((a, b) => b[1] - a[1]);
  outl = outl.slice(0, 10);

    // neighbours out of url patterns
  const out3 = get_continuations(uid, data, by_dom).slice(0, 10);

  const posinsc = data.labs.indexOf('in_sc');

  const candidates = {};
  const url2id = {};

  for (let [suid2, suid2_sc] of outl) {
    const uid2 = parseInt(suid2);
    const dd = get_minimal_data(uid2, data);
    if (dd !== null) {
      const in_sc = data.urls[parseInt(suid2)][posinsc];
            // exclude form adding pages with bad score on incoming_links
      if (in_sc > 0.75) {
        if (page.c.all < 10 || dd[5] > 3 || dd[5] / page.c.all > 0.1) {
                    // URL, TITLE, TIME_VISIT, STRENGTH_VISIT, RATIO_LINKS
          candidates[uid2] = [dd[1], dd[2], dd[3], dd[4], suid2_sc / page.c.all];
          url2id[dd[1]] = uid2;
        }
      }
    }
  }

  for (const dd of out3) {
    const uid2 = dd[0];
    if (!has(candidates, uid2)) {
      const in_sc = data.urls[uid2][posinsc];
      if (in_sc > 0.75) {
        if (page.c.all < 10 || dd[5] > 3 || dd[5] / page.c.all > 0.1) {
                    // we assume that it has 2 visits :) to make the data homogeneous
                    // candidates[uid2] = [dd[1], dd[2], dd[3], dd[4], 2.0/float(page['c']['all'])]
          candidates[uid2] = [dd[1], dd[2], dd[3], dd[4], 0.25];
          url2id[dd[1]] = uid2;
        }
      }
    }
  }

  const cands = items(candidates);
  const _mySort = x => x[1][2] * x[1][3] * Math.max(x[1][4], 0.25);
  cands.sort((a, b) => _mySort(b) - _mySort(a));

  const url1 = url;
  const tit1 = title;

  const clust_items = [];
  let clust_items_ids = [];
  for (let i = 0; i < Math.min(len(cands), 8); ++i) {
    const url2 = cands[i][1][0];
    const tit2 = cands[i][1][1];

    const lab_url = label_by_url(url1, url2, comp_url_cache);
    const lab_tit = label_by_title(tit1, tit2, url1, url2, comp_url_cache);

    if (lab_url === null && lab_tit === null) {
      continue;
    }
    let label;
    if (!lab_url) {
      label = lab_tit;
    }
    else if (!lab_tit) {
      label = lab_url;
    }
        else if (len(lab_url) < len(lab_tit)) {
          label = lab_url;
        }
        else {
          label = lab_tit;
        }

    if (label === '' || len(label) < 2) {
            // label = '>>' + '/'.join(url2.split('/')[1:])
            // skip because of not label
      continue;
    }
    else {
      if (len(label) > 25) {
        label = label.slice(0, 25) + '...';
      }

      clust_items.push([url2, tit2 || 'N/A', label]);
      clust_items_ids.push([url2id[url2], label]);
    }
  }

  if (len(clust_items) > 0) {
    const seen_label = {};
    const clust_items2 = [];
    const clust_items_ids2 = [];
    for (let [_x, _x_ids] of zip(clust_items, clust_items_ids)) {
      if (!has(seen_label, _x[2])) {
        seen_label[_x[2]] = true;
        clust_items_ids2.push(_x_ids);
      }
    }

    clust_items_ids = clust_items_ids2;
  }
  return clust_items_ids;
}

function get_outgoing(uid, data, r) {
  uid = uid.toString();
  const out2 = {};
  for (let [tt, v] of items(data.net2_out[uid] || {})) {
    for (let [uid2, sc] of items(v)) {
      out2[uid2] = (out2[uid2] || 0) + sc;
    }
  }

  if (r > 1) {
    const list_uids2 = Object.keys(out2);
    for (const uid2 of list_uids2) {
      if (uid2 !== uid) {
        const out2b = get_outgoing(uid2, data, r - 1);
        for (let [_uid2, _sc] of items(out2b)) {
          if (_uid2 !== uid) {
            out2[_uid2] = (out2[_uid2] || 0) + (_sc / r);
          }
        }
      }
    }
    return out2;
  }
  else {
    return out2;
  }
}

function get_continuations(uid, data, by_dom = null) {
  const page = uid2page(uid, data);
  const posu = data.labs.indexOf('u');

  const cand = [];
  let uids_to_test;
  if (by_dom !== null) {
    let [dom, , , ] = comp_url(page.u);
    uids_to_test = by_dom[dom] || [];
  }
  else {
    uids_to_test = data.urls.filter(item => item !== null).map(item => item[posu]);
  }

  for (const uid2 of uids_to_test) {
    if (uid2 !== uid) {
      if (data.urls[uid2][posu].startsWith(page.u)) {
        const page2 = uid2page(uid2, data);
                // stren_sc = math.log(page2['c']['180']+1.0)+math.log(page2['c']['all']+1.0)+math.log(page2['c']['30']+1.0
        const stren_sc = Math.log(page2.c['180'] + page2.c.all + 1.0);
        cand.push([uid2, page2.u, page2.title, time_score(page2.c), stren_sc, page2.c.all]);
      }
    }
  }
  cand.sort((a, b) => b[3] * b[4] - a[3] * a[4]);
  return cand;
}

function label_by_url(url1, url2, comp_url_cache) {
  if (!has(comp_url_cache, url1)) {
    comp_url_cache[url1] = comp_url(url1);
  }

  if (!has(comp_url_cache, url2)) {
    comp_url_cache[url2] = comp_url(url2);
  }

  let l1 = (comp_url_cache[url1][1] || '') + '/' + (comp_url_cache[url1][2] || '');
  let l2 = (comp_url_cache[url2][1] || '') + '/' + (comp_url_cache[url2][2] || '');

  if (l1.includes('.')) {
    l1 = l1.slice(0, l1.indexOf('.'));
  }
  l1 = (comp_url_cache[url1][0] || '').split('.').slice(0, -1).join('.') + '/' + l1;

  if (l2.includes('.')) {
    l2 = l2.slice(0, l2.indexOf('.'));
  }

  l2 = (comp_url_cache[url2][0] || '').split('.').slice(0, -1).join('.') + '/' + l2;

  const nl2 = normalize(l2).split(' ');
  for (const t of normalize(l1).split(' ')) {
    if (t !== '') {
      if (nl2.indexOf(t) > -1) {
        nl2.splice(nl2.indexOf(t), 1);
      }
    }
  }
  return nl2.filter(t => len(t) > 0).join(' ');
}

function label_by_title(t1, t2, url1, url2, comp_url_cache) {
  const l1 = t1 || '';
  let l2 = t2 || '';
  const nl2 = normalize(l2).split(' ');
  for (const t of normalize(l1).split(' ')) {
    if (t !== '') {
      if (nl2.indexOf(t) > -1) {
        nl2.splice(nl2.indexOf(t), 1);
      }
    }
  }
  l2 = nl2.filter(t => len(t) > 0).join(' ');

    // print "lab2 title: {}".format(l2.encode('utf-8'))

  return l2;
}


function score_incoming(page, data) {
  if (page.q && len(page.q) > 0) {
    return [1.0, null];
  }

  const posv = data.labs.indexOf('visits');
  const posu = data.labs.indexOf('u');
  const uid = page.uid.toString();
  const num_vis = len(page.visits);
  let out_5or6 = 0;
  let times_next = [];
  let nv_next = 0;
  for (let [tt, huids] of items(data.net2_out[uid] || {})) {
    for (let [uid2, uid2_sc] of items(huids)) {
      nv_next += uid2_sc;
      if (tt === '5' || tt === '6') {
        out_5or6 += uid2_sc;
      }
      times_next = times_next.concat(data.urls[parseInt(uid2)][posv].map(item => item[0]));
    }
  }

  let times_prev = [];
  let nv_prev = 0;
  const url_prev = {};
  for (let [tt, huids] of items(data.net2_in[uid] || {})) {
    for (let [uid2, uid2_sc] of items(huids)) {
      nv_prev += uid2_sc;
      times_prev = times_prev.concat(data.urls[parseInt(uid2)][posv].map(item => item[0]));
      const url2 = data.urls[parseInt(uid2)][posu];
      url_prev[url2] = (url_prev[url2] || 0) + uid2_sc;
    }
  }

  const times_curr = page.visits.map(item => item[0]);

  if (nv_next === num_vis) {
    const t1 = times_curr; // What is this?
    times_curr.sort();
    const t2 = times_next;
    times_next.sort(); // And this?
    const num = len(zip(t1, t2).filter(([a, b]) => Math.abs(a - b) / 1000000 < 2.0));

    if (num / num_vis > 0.9) {
      return [0.0, 'pass'];
    }
  }


  const visits_with_from = page.visits.filter(item => item[2] !== null);
  if (len(times_prev) === 0 && len(visits_with_from) > 1) {
    return [0.0, 'pass'];
  }

  if (len(url_prev) > 0) {
    let cum_sc2 = 0;
    for (let [url2, sc2] of items(url_prev)) {
      if (true || sc2 > len(times_curr)) {
        const v = url2.split('?');
        const diff = len(url2) - len(v[0]);
        if (diff > 60) {
          cum_sc2 += sc2;
        }
      }
    }

    if (cum_sc2 > len(times_curr) * 0.80) {
      return [0.0, 'pass'];
    }
  }

  if (len(times_prev) === len(times_next)) {
        // page might be a loop (for instance the ads that take the full screen and
        // then go back to the page)
    const t1 = times_curr;
    const t2 = times_next;
    t1.sort();
    t2.sort();
    const mm = compare_time_series(t1, t2, 5.0);
    if (mm / len(t1) > 0.5) {
      return [0.0, 'pass'];
    }
  }
  return [1.0, null];
}

function compare_time_series(t1, t2, gap) {
    // assume they are sorted

  if (len(t1) > len(t2)) {
        // t1 must be the small one
    const tbkp = t2;
    t2 = t1;
    t1 = tbkp;
  }

  if (len(t1) === 0 || len(t2) === 0) {
    return 0;
  }

  let j = 0;
  let i = 0;
  let matches = 0;

  const thres = 1000000 * gap / 2.0;

  while (true) {
    const v1 = t1[i];
    const v2 = t2[j];
    const diff = (v1 - v2);

    if (diff < -thres) {
            // v1 is more than two seconds in the past
      i += 1;
    }
    else if (diff > thres) {
            // v1 is more than two seconds in the future
      j += 1;
    }
        else {
            // in 4 seconds
            // it's a match
      matches += 1;
      i += 1;
      j += 1;
    }

    if (i >= len(t1) || j >= len(t2)) {
      break;
    }
  }
  return matches;
}

function uid2page(uid, data, labs_it = null, labsc_it = null) {
  if (labs_it === null) {
    labs_it = [];
    for (let i = 0; i < len(data.labs); ++i) {
      labs_it.push([data.labs[i], i]);
    }
  }
  if (labsc_it === null) {
    labsc_it = [];
    for (let i = 0; i < len(data.labsc); ++i) {
      labsc_it.push([data.labsc[i], i]);
    }
  }
  const page = { uid };
  for (let [lab, ilab] of labs_it) {
    if (lab === 'c') {
      page.c = {};
      for (let [labc, ilabc] of labsc_it) {
        page.c[labc] = data.urls[uid][ilab][ilabc];
      }
    }
    else if (lab === 'q') {
      if (data.urls[uid][ilab] !== null) {
        page[lab] = data.urls[uid][ilab];
      }
    }
        else {
      page[lab] = data.urls[uid][ilab];
    }
  }
  return page;
}


function time_score(hist) {
  let sc = 0.0;
  if (hist.all > 30) {
    sc = 0.60;
  } else if (hist.all > 20) { // Corrected? from python
    sc = 0.55;
  } else if (hist.all > 10) {
    sc = 0.5;
  } else if (hist.all > 2) {
    sc = 0.40;
  } else if (hist.all > 1) {
    sc = 0.35;
  } else if (hist.all > 0) {
    sc = 0.30;
  }

  const rest = [];
  if (hist['2'] > 1) {
    rest.push(1.0);
  } else if (hist['2'] > 0) {
    rest.push(0.75);
  }

  if (hist['7'] > 3) {
    rest.push(1.0);
  } else if (hist['7'] > 1) {
    rest.push(0.75);
  } else if (hist['7'] > 0) {
    rest.push(0.5);
  }

  if (hist['30'] > 5) {
    rest.push(0.9);
  } else if (hist['30'] > 2) {
    rest.push(0.7);
  } else if (hist['30'] > 0) {
    rest.push(0.4);
  }

  if (hist['180'] > 20) {
    rest.push(0.70);
  } else if (hist['180'] > 10) {
    rest.push(0.60);
  } else if (hist['180'] > 5) {
    rest.push(0.50);
  } else if (hist['180'] > 2) {
    rest.push(0.40);
  } else if (hist['180'] > 0) {
    rest.push(0.20);
  }
  const mm = len(rest) > 0 ? Math.max(...rest) : 0;

  const strength = Math.log(Math.min(hist.all, 50) + 1.0) / Math.log(50 + 1);

    // sc = sc + min((1.0-sc),0.5) *mm
  sc += (1.0 - sc) * mm;

  if (hist.all === 1) {
    sc *= 0.75;
  } else if (hist.all === 2) {
    sc *= 0.85;
  }

  sc += (1.0 - sc) * 0.20 * strength;


  // if hist['all'] == 1 and sc > 0.7:
  //    sc = sc * 0.7
  // elif hist['all'] == 1 and sc > 0.5:
  //    sc = sc * 0.8

  return sc;
}
function get_minimal_data(uid, data) {
  if (data.urls[uid] === null) {
    return null;
  }
  const posl = dict(zip(data.labs, range(0, len(data.labs))));
  const hc = dict(zip(data.labsc, data.urls[uid][posl.c]));
  const time_sc = time_score(hc);

    // stren_sc = math.log(+1.0)+math.log(hc['all']+1.0)+math.log(hc['30']+1.0
  const stren_sc = Math.log(hc['180'] + hc.all + 1.0);
  return [uid, data.urls[uid][posl.u], data.urls[uid][posl.title] || '', time_sc, stren_sc, hc.all];
}

function reduce_size(data) {
  console.log('Size data: ' + len(JSON.stringify(data)) / 1000000 + 'MB');
  const num_urls = Object.keys(data.id2url).reduce((oldVal, newVal) => Math.max(oldVal, newVal), -1) + 1;
  const urls = new Array(num_urls);

  const labs = ['c', 'cl', 'cl_q', 'cl_visits', 'count', 'desc', 'eng', 'frec', 'last_visit', 'q', 'title', 'u', 'visits', 'w', 'eng_cnt', 'last_visit_real', 'all_urls'];
  const labsc = ['2', '7', '30', '180', 'all'];
  const labse = ['ki', 'si', 'ts'];


  for (const _uid in data.id2url) {
    const uid = parseInt(_uid);
    const suid = _uid.toString();
    const url = data.id2url[_uid];

    if (!has(data.urls, url)) {
      continue;
    }

    urls[uid] = data.urls[url];
    urls[uid].u = url;
    const vis = [];
    for (const v of data.urls[url].visits) {
      const v2 = [v.visit_date, v.visit_type, null];
      if (v.from_url !== null) {
        v2[2] = data.url2id[v.from_url];
      }
      vis.push(v2);
    }

    urls[uid].visits = vis;

    const dd = [];
    for (const lab of labs) {
      let val = (has(urls[uid], lab) ? urls[uid][lab] : null);
      if (lab === 'c') {
        const val2 = labsc.map(labc => val[labc]);
        val = val2;
      }
      else if (lab === 'eng' || lab === 'eng_cnt') {
        const val2 = labse.map(labe => val[labe]);
        val = val2;
      }
      dd.push(val);
    }
    urls[uid] = dd;
  }


  delete data.url2id;
  delete data.id2url;
  delete data.urls;

  data.urls = urls;
  data.labs = labs;
  data.labse = labse;
  data.labsc = labsc;

  for (const tt of ['net_time']) {
    const nn = {};
    for (const k in data[tt]) {
      const v = data[tt][k];
      const lll = items(v);
      lll.sort((a, b) => b[1] - a[1]);
      nn[k] = [];
      for (const sublist of lll) {
        for (let ind = 0; ind < len(sublist); ++ind) {
          const item = sublist[ind];
          nn[k].push(ind === 0 ? parseInt(item) : item);
        }
      }
    }
    data[tt] = nn;
  }

  for (const tt of ['w2uid']) {
    const nn = {};
    for (const k in data[tt]) {
      const v = data[tt][k];
      const lll = v;
      lll.sort((a, b) => b[1] - a[1]);
      nn[k] = [];
      for (const sublist of lll) {
        for (let ind = 0; ind < len(sublist); ++ind) {
          const item = sublist[ind];
          nn[k].push(ind === 0 ? parseInt(item) : item);
        }
      }
    }
    data[tt] = nn;
  }

  for (const tt of ['mm2']) {
    const nn = {};
    for (const k in data[tt]) {
      const v = data[tt][k];
      const lll = v;
      lll.sort((a, b) => b[1] - a[1]);
      nn[k] = [];
      for (const sublist of lll) {
        for (let ind = 0; ind < len(sublist); ++ind) {
          const item = sublist[ind];
          nn[k].push(item);
        }
      }
    }
    data[tt] = nn;
  }


    // print "Size data: {}MB".format(len(json.dumps(data))/float(1000000))
    // new_data = {'urls': urls, 'url2id': url2id, 'id2url': id2url, 'w2uid': w2uid, 'mm2': mm2, 'net': net, 'net_time': net_time, 'wwd': words_with_dots}

  return data;
}
