/*
 * This module is the replacement for Firefox History Manager
 *
 * USE REFERENCE cliqz/hm
 */

// TIPS
// Whenever you want to play with the integration with the extension,
//
// Templates:

// egrep 'pattern-hm' * -R | egrep -v ^build


import { ngrams, url_norm, comp_url, normalize } from 'hm/helpers';
import IndexBuilder from 'hm/index-builder';

const { utils: Cu } = Components;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/NetUtil.jsm');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// for dummies:
// var CliqzHM = CliqzUtils.getWindow().CLIQZ.System.get("hm/main").default;
//

const CliqzHM = {
  VERSION: '0.1',
  get data() {
    if (CliqzHM.indexBuilder) {
      return CliqzHM.indexBuilder.index;
    }
    return CliqzHM._data;
  },
  set data(val) {
    CliqzHM._data = val;
  },
  data: null,
  test_data: null,
  fetchData: null,
  _verbose: false,
  mrt: null,
  hist_search_type: null,
  init(local) {
        // loading the index data
        // the source directory:
        // specific/firefox/cliqz\@cliqz.com/chrome/content/hm_search_index.json

    if (!local) local = false;

    if (local) {
      CliqzUtils.httpGet(
                'chrome://cliqz/content/hm/extern/hm_search_index.json',
                function success(req) {
                  CliqzHM.data = JSON.parse(req.response);
                });

      CliqzUtils.httpGet(
                'chrome://cliqz/content/hm/extern/hm_search_test.json',
                function success(req) {
                  CliqzHM.test = JSON.parse(req.response);
                });
    }
    else if (!CliqzHM.indexBuilder) {
      CliqzHM.indexBuilder = new IndexBuilder();
      CliqzHM.indexBuilder.init()
            .catch(e => CliqzUtils.log(e.stack, 'ERROR'));
    }

    CliqzHM.hist_search_type = CliqzUtils.getPref('hist_search_type', 0);
    CliqzUtils.setPref('hist_search_type', CliqzHM.hist_search_type);
  },
  unload() {
    if (CliqzHM.indexBuilder) {
      return CliqzHM.indexBuilder.unload();
    }
  },
  buildIndex() {
    if (!CliqzHM.indexBuilder) {
      return Promise.reject('no IndexBuilder found');
    }
    return CliqzHM.indexBuilder.buildIndex();
  },
  aux_url_norm(s) {
    return url_norm(s);
  },
  remove_url_tokens_from_query(query_o) {
    const remaining = [];
    const bad_tokens = ['http', 'https', 'www', 'do', 'jsp', 'asp', 'html', 'hml', 'php'];

    query_o['vqn'].forEach(t => {
      if (bad_tokens.indexOf(t) == -1) {
        remaining.push(t);
      }
    });

    if (remaining.length > 1) {
      query_o['vqn'].forEach(t => {
        if (remaining.indexOf(t) == -1) {
          query_o['ws'][t] = { 'exps': [], 'subs': [] };
        }
      });

      query_o['converted_to_not_navig'] = true;
      query_o['vqn'] = remaining;
      return query_o;
    }
    else return null;
  },
  do_search(q, cluster, cap) {
    if (CliqzHM.data == null) CliqzHM.init();
    if (cluster == undefined) cluster = true;

    if (cap == undefined) cap = 3;

    let [res, cont, vtime, res2, query_o] = CliqzHM.do_search_int(q, cluster);

    res = res.slice(0, cap);

    let elapsed = 0.0;
    for (let i = 0; i < vtime.length; i++) elapsed += vtime[i][1];

    const r = { 'result': res, elapsed };

    if (cont && cont.length > 0) {
      r['cont'] = cont.slice(0, 5);
    }

    if (CliqzHM._verbose) {
      CliqzUtils.log('---> Query took ' + elapsed + 'ms, cluster: ' + cluster + ', ' + res.length + ' results', 'CliqzHM');
      res.slice(0, 10).forEach(item => {
        CliqzUtils.log('-> ' + item[0] + ' ' + item[1], 'CliqzHM');
        CliqzUtils.log('----------------> ' + JSON.stringify(item[2]), 'CliqzHM');

        if (item[3].hasOwnProperty('q') && item[3]['q'].length > 0) {
          let query_labs = 'Queries: ';
          item[3]['q'].forEach(item2 => {
            query_labs = '"' + item2 + '", ';
          });
          CliqzUtils.log('----- queries --> ' + query_labs, 'CliqzHM');
        }
        if (item[3].hasOwnProperty('c') && item[3]['c'].length > 0) {
          let clust_labs = '';
          item[3]['c'].forEach(item2 => {
            clust_labs = clust_labs + '[' + item2[2].trim() + '] ';
          });
          CliqzUtils.log('----- cluster --> ' + clust_labs, 'CliqzHM');
        }
      });
    }


    return r;
  },
  do_search_int(q, cluster) {
    var vtime = [];

    var [query_o, vtime] = CliqzHM.query_proc(q, vtime);

    const navigational = query_o['nav'];
    let navigational_failed = false;

    if (navigational) {
      var [r, vtime] = CliqzHM.rank_navig_4(query_o, vtime);
      if (r.length > 0) return [r, [], vtime, r, query_o];
      else {
                // remove tokens related to URL for sanity
        const alt_query_o = CliqzHM.remove_url_tokens_from_query(query_o);
        if (alt_query_o) {
          query_o = alt_query_o;
          navigational_failed = true;
        }
        else {
          return [[], [], vtime, [], query_o];
        }
      }
    }

    if (!navigational || navigational_failed) {
      var [r, cont, [pages, comp_url_cache], vtime] = CliqzHM.rank_4(query_o, vtime);

      r = CliqzHM.duplicates_title(r);

      if (cluster) [r, vtime] = CliqzHM.clustering_4(r, pages, comp_url_cache, vtime);
      return [r, cont, vtime, r, query_o];
    }
  },
  rank_4(query_o, vtime) {
    let [vpages, terms_count, allw, pos] = CliqzHM.rank_4_step1(query_o, vtime);
    const items = CliqzHM.rank_4_step2(query_o, vpages, terms_count, allw, pos, vtime);
    return items;
  },
  rank_4_step1(query_o, vtime) {
    const start_time = new Date().getTime();
    const vqn = query_o['vqn'];
    const vqn_ext = [];
    vqn.forEach(t => { vqn_ext.push([t, [t], 'term']); });

    if (vqn.length > 1) {
      for (var i = 0; i < vqn.length; i++) {
        for (let j = i + 1; j < vqn.length; j++) {
          vqn_ext.push([vqn[i] + vqn[j], [vqn[i], vqn[j]], 'join']);
        }
      }

      if (vqn.length > 2) vqn_ext.push([vqn.join(''), vqn, 'join']);

      const xtra = query_o['q'].split('.');
      if (xtra.length < vqn.length) {
        xtra.forEach(t => {
          const tl = t.toLowerCase();
          const tlv = [];
          for (let i = 0; i < query_o['vqn']; i++) {
            if (tl.indexOf(query_o['vqn'][i]) != -1) {
              tlv.push(query_o['vqn'][i]);
            }
          }
          vqn_ext.push([tl, tlv, 'exact']);
        });
      }
    }

    const terms_count = {};
    let terms_count_sum = 0.0;

    query_o['vqn'].forEach(t => {
      const ll = (CliqzHM.data['w2uid'][t] || []).length / 2.0;
      terms_count[t] = 400 - ll;
      terms_count_sum += 400 - ll;
    });

    query_o['vqn'].forEach(t => {
      terms_count[t] = terms_count[t] / terms_count_sum;
    });

    const pos = {};
    let cc = 0;
    query_o['vqn'].forEach(t => {
      pos[t] = cc;
      cc += 1;
    });

    const allw = {};
    const pages = {};

    if (true) {
      var neig_w = {};
      for (var i = 0; i < query_o['vqn'].length; i++) {
        var t = query_o['vqn'][i];
        neig_w[t] = [];
        if ((i - 1) >= 0) neig_w[t].push(query_o['vqn'][i - 1]);
        if ((i + 1) < query_o['vqn'].length) neig_w[t].push(query_o['vqn'][i + 1]);
      }
    }

    const _tmp = [];
    for (var i = 0; i < vqn_ext.length; i++) {
      var [t, twv, tty] = vqn_ext[i];

      const vv = CliqzHM.group(CliqzHM.data['mm2'][t] || [], 2);
      let vvs = null;
      if (vv.length > 0) {
        if (vv.length < 5) vvs = vv;
        else {
          vvs = [];
          vv.forEach(item => {
            let [w, w_sc] = item;
            if (w.startsWith(t) && w_sc > 0.0) {
              vvs.push(item);
            }
          });
          vvs = vvs.slice(0, 50);
          if (vvs.length < 2) vvs = vv;
        }
      }
      else {
        let vvt = [];
        let nt = t;
        while (vvt.length == 0) {
          nt = nt.slice(0, nt.length - 1);
          if (nt.length == 0) break;
          vvt = CliqzHM.group(CliqzHM.data['mm2'][nt] || [], 2);
        }
        vvs = [];
        vvt.forEach(item => {
          let [w, w_sc] = item;
          if (w.startsWith(t) || w.endsWith(t)) {
            vvs.push(item);
          }
        });
      }

      if (tty == 'exact') vvs.push([t, 100.0]);

      let thres = -1;
      if (vvs.length > 0) thres = 2000 / vvs.length;

      _tmp.push(['vvs', vvs.length]);

      vvs.concat([[t, 1.0]]).forEach(item => {
        let [w, w_sc] = item;
        const vurls = CliqzHM.group(CliqzHM.data['w2uid'][w] || [], 2).slice(0, thres);
        allw[w] = true;

        vurls.forEach(item2 => {
          let [uid, uid_sc] = item2;
          if (!pages.hasOwnProperty(uid)) pages[uid] = { 'psc': 0.0, 'nw': 0, 'wsc': 0, 'fw': {}, 'fws': {}, 'fws_no_pos': {} };

          pages[uid]['psc'] += uid_sc;
          pages[uid]['wsc'] += w_sc;

          twv.forEach(tw => {
            if (!pages[uid]['fw'].hasOwnProperty(tw)) {
              pages[uid]['fw'][tw] = [];
              pages[uid]['fws'][tw] = [];
              pages[uid]['fws_no_pos'][tw] = [];
            }

            pages[uid]['fw'][tw].push(w);

            let sc1 = 0.0;

            if (tty == 'exact' || tty == 'join') sc1 = 0.8;
            else {
              if (w.startsWith(tw)) sc1 = 0.8;
              else if (w.endsWith(tw)) {
                sc1 = 0.6;
                Object.keys(neig_w[tw]).forEach(nei_t => {
                  const v = neig_w[tw][nei_t];

                  if ((v || []).indexOf(w) != -1) {
                    sc1 = 0.8;
                                        // break;
                  }
                });
              }
                            else if (w.indexOf(tw) != -1) {
                              sc1 = 0.2;
                              Object.keys(neig_w[tw]).forEach(nei_t => {
                                const v = neig_w[tw][nei_t];
                                if ((v || []).indexOf(w) != -1) {
                                  sc1 = 0.8;
                                        // break;
                                }
                              });
                            }
                            else sc1 = 0.0;
            }

            const sc1_1 = sc1 * (1.0 - ((pos[tw] - 1) * 0.05));
            pages[uid]['fws'][tw].push(sc1_1);

            const sc1_2 = sc1 * terms_count[tw];
            pages[uid]['fws_no_pos'][tw].push(sc1_2);
          });
        });
      });
    }

        // end for(var i=0;i<vqn_ext.length;i++)

    const vpages = CliqzHM.items(pages)
          .filter(([uid,]) => CliqzHM.data['urls'][uid])
          .sort(function (a, b) { return ((CliqzHM.smmax(b[1]) * 100000 + b[1]['psc']) - (CliqzHM.smmax(a[1]) * 100000 + a[1]['psc'])); });

    const elapsed = (new Date().getTime()) - start_time;
    vtime.push(['rank_4_step1', elapsed]);

    if (CliqzHM._verbose) {
      CliqzUtils.log('step1 >>> step1: ' + _tmp.length + ' ' + JSON.stringify(_tmp), 'CliqzHM');

      CliqzUtils.log('step1 >>> step1: ' + vpages.length, 'CliqzHM');
      CliqzUtils.log('step1 >>> ' + JSON.stringify(vqn_ext), 'CliqzHM');
      CliqzUtils.log('step1 >>> ' + JSON.stringify(terms_count) + ' ' + JSON.stringify(pos), 'CliqzHM');
      if (vpages.length > 2) {
        CliqzUtils.log('step1 >>> 1: ' + JSON.stringify(vpages[0]), 'CliqzHM');
        CliqzUtils.log('step1 >>> 2: ' + JSON.stringify(vpages[1]), 'CliqzHM');
        CliqzUtils.log('step1 >>> 3: ' + JSON.stringify(vpages[2]), 'CliqzHM');
      }
    }

    return [vpages, terms_count, allw, pos];
  },
  smmax(b) {
        // sum([max(v) for _, v in x[1]['fws'].items()])
    let ss = 0.0;
    const mm = 0.0;
    Object.keys(b['fws']).forEach(x => {
      let mm = 0.0;
      for (let i = 0; i < b['fws'][x].length; i++) {
        if (b['fws'][x][i] > mm) mm = b['fws'][x][i];
      }
      ss += mm;
    });
    return ss;
  },
  rank_4_step2(query_o, vpages, terms_count, allw, pos, vtime) {
    const start_time = new Date().getTime();

    var cc = [];
    const comp_url_cache = {};
    const comp_dom_set = {};

    let all_words = 0;
    let max_psc = 0.0;

    var done_uids = {};

    const pages = {};

        // forEach does not allow break; or continue;
    for (var _i = 0; _i < Math.min(100, vpages.length); _i++) {
      var item = vpages[_i];
      var [uid, x] = item;

      if (done_uids.hasOwnProperty(uid)) continue;
      done_uids[uid] = true;

      var page = CliqzHM.uid2page(uid);
      pages[page['u']] = page;

      var u = page['u'];
      var tit = page['title'] || 'N/A';

      var ss_sc = CliqzHM.smmax(x) * 100000 + Math.log(x['psc'] + 1.0);

      var xtra = [x, page['c'], CliqzHM.time_score(page['c']), ss_sc];

      if ((x['fws'].length / query_o['vqn'].length) < 0.40) continue;

      if (x['fws'].length < query_o['vqn'].length) {
        query_o['vqn'].forEach(t => {
          if (!x['fws'].hasOwnProperty(t)) {
            const last_word = t;

            const xw = CliqzHM.extra_words(page, u, last_word);
            if (xw.length > 0) {
              xw.forEach(w1 => {
                if (!allw.hasOwnProperty(w1)) {
                  if (!x['fws'].hasOwnProperty(last_word)) {
                    x['fws'][last_word] = [0.8 * (1.0 - ((pos[last_word] - 1) * 0.025))];
                    x['fws_no_pos'][last_word] = [0.8 * terms_count[last_word]];
                    x['fw'][last_word] = [w1];
                  }
                  else {
                    x['fws'][last_word].push(0.8 * (1.0 - ((pos[last_word] - 1) * 0.025)));
                    x['fws_no_pos'][last_word].push(0.8 * terms_count[last_word]);
                    x['fw'][last_word].push(w1);
                  }
                  ss_sc = CliqzHM.smmax(x) * 100000 + Math.log(x['psc'] + 1.0);

                  xtra[3] = ss_sc;
                }
              });
            }
          }
        });
      } // end of: if (x['fws'].length < query_o['vqn'].length)

      if (x['fws'].length == query_o['vqn'].length) all_words += 1;

      if (x['psc'] > max_psc) max_psc = x['psc'];

      comp_url_cache[u] = comp_url(u);

      if (!comp_dom_set.hasOwnProperty(comp_url_cache[u][0])) {
        comp_dom_set[comp_url_cache[u][0]] = normalize(comp_url_cache[u][0]).split(' ');
      }

      var xtra2 = {};
      if (page.hasOwnProperty('q') && page['q'].length > 0) {
        xtra2 = { 'q': [] };
        for (var i = 0; i < page['q'].length; i++) xtra2['q'].push(page['q'][i][0]);
      }

      cc.push([u, tit, xtra, xtra2]);
    }

    if (all_words < 3) {
      let cc_2nd = [];
      var done_uids = {};

            // vpages.slice(0,300).forEach(item => {

      for (var _i = 0; _i < Math.min(300, vpages.length); _i++) {
        var item = vpages[_i];
        var [uid, x] = item;

        if (done_uids.hasOwnProperty(uid)) continue;
        done_uids[uid] = true;

        var page = CliqzHM.uid2page(uid);
        pages[page['u']] = page;

        var u = page['u'];
        var tit = page['title'] || 'N/A';

        if ((x['fws'].length / query_o['vqn'].length) < 0.40) continue;

        var ss_sc = CliqzHM.smmax(x) * 100000 + Math.log(x['psc'] + 1.0);

        var xtra = [x, page['c'], CliqzHM.time_score(page['c']), ss_sc];

        if (x['psc'] > max_psc) max_psc = x['psc'];

        if (!comp_url_cache.hasOwnProperty(u)) {
          comp_url_cache[u] = comp_url(u);

          if (!comp_dom_set.hasOwnProperty(comp_url_cache[u][0])) {
            comp_dom_set[comp_url_cache[u][0]] = normalize(comp_url_cache[u][0]).split(' ');
          }
        }

        var xtra2 = {};
        if (page.hasOwnProperty('q') && page['q'].length > 0) {
          xtra2 = { 'q': [] };
          for (var i = 0; i < page['q'].length; i++) xtra2['q'].push(page['q'][i][0]);
        }

        cc_2nd.push([u, tit, xtra, xtra2]);
      }

      cc_2nd = cc_2nd.sort(function (a, b) { return (b[2][b[2].length - 1] - a[2][a[2].length - 1]); });
      cc = cc_2nd.slice(0, 50);
    }

    let cont = {};
    var i = 0;

    const more_than_one_element = (query_o['vqn'].length > 1);

    const uids_in_cc = {};

    cc.forEach(x => {
      uids_in_cc[pages[x[0]]['uid']] = x[2][x[2].length - 2];
    });

    cc.forEach(x => {
      const vsc = x[2][x[2].length - 2];
      const hsc = {};
      hsc['visit'] = vsc;

      let [visible, short] = CliqzHM.score_domain_2(x, query_o, comp_url_cache);

      hsc['visible'] = visible;
      hsc['short'] = short;

      let dmatch_sc = 1.0;
      dmatch_sc = CliqzHM.score_domain_match(query_o, x[2][0]['fw'], pages[x[0]]['w']);
      if (dmatch_sc > 1.0) dmatch_sc = 1.5;

      hsc['dmatch'] = dmatch_sc;

      let cons_sc = 1.0;
      if (more_than_one_element) {
        cons_sc = CliqzHM.score_consecutive(x, query_o, pages[x[0]]['w']);
        if (cons_sc > 1.0) cons_sc = 1.2;
      }
      hsc['cons'] = cons_sc;

      let join_sc = 1.0;
      if (more_than_one_element) {
        join_sc = CliqzHM.score_join(query_o, pages[x[0]]['w']);
        if (join_sc > 1.0) join_sc = 1.5;
      }
      hsc['join'] = join_sc;

      const file_sc = CliqzHM.score_files_and_suffixes(x, query_o, pages[x[0]]['w'], CliqzHM.data['wwd']);
      hsc['file'] = file_sc;

      const tit_sc = CliqzHM.score_title(x[1]);
      hsc['tit'] = tit_sc;

      const suf_sc = CliqzHM.score_suffix(x, pages[x[0]]['w']);

      hsc['suf'] = suf_sc;

      hsc['wt'] = CliqzHM.where_terms(comp_url_cache[x[0]], x[1], '', query_o);

      hsc['wt2'] = CliqzHM.where_terms_2(x[2][0]['fw'], pages[x[0]], comp_url_cache[x[0]], query_o);

      const in_sc = pages[x[0]]['in_sc'];
      const in_sc_lab = pages[x[0]]['in_sc_lab'];

      hsc['in'] = in_sc;

      const pa_sc = CliqzHM.score_partials(x[2][0]['fw'], query_o);
      hsc['pa'] = pa_sc;

      const tdup_sc = CliqzHM.score_term_dupes(x[2][0]['fw'], query_o);
      hsc['tdup'] = tdup_sc;

      const som_sc = CliqzHM.score_original_match(x[0], comp_url_cache[x[0]], query_o);
      hsc['som'] = som_sc;

      x[2].push(hsc);

      CliqzHM.auxSet((x[2][0]['fw'][query_o['vqn'][query_o['vqn'].length - 1]] || [])).forEach(wc => {
        if (!cont.hasOwnProperty(wc)) cont[wc] = 0.0;
        cont[wc] += vsc;
      });


      let sc = 0.0;

      if (query_o['vqn'].length == 1) {
                // SINGLE WORD QUERY

        var r1 = 0.0;
        Object.keys(x[2][0]['fws_no_pos']).forEach(k => {
          r1 += x[2][0]['fws_no_pos'][k][0];
        });
        var strength = Math.pow((1.0 - (1.0 / (Math.log(2 + x[2][1]['all'] + x[2][1]['30'])))), 2.0);

        let short_sc = 1.0;
        if (hsc['short'] || x[2][1]['180'] > 9) short_sc = 1.1;

        let visible_sc = 1.0;
        if (hsc['visible']) visible_sc = 1.3;

        if (suf_sc < 1.0 || file_sc < 1.0) {
          if (query_o['vqn'].length == 1) {
            short_sc = 1.0;
            visible_sc = 1.0;
          }
        }

        if (CliqzHM.data['susp_dom'].hasOwnProperty(comp_url_cache[x[0]][0])) {
          sc = r1 * 3 + vsc * 0.8 * file_sc * suf_sc * tit_sc * in_sc * dmatch_sc;
        }
        else {
          sc = r1 * 3 + vsc * (1.0 + strength * 0.50) * visible_sc * short_sc * file_sc * suf_sc * tit_sc * som_sc * in_sc * dmatch_sc;
        }

        hsc['placement'] = [];
        let placement = null;
        if (hsc['wt2'].hasOwnProperty(query_o['vqn'][0])) placement = hsc['wt2'][query_o['vqn'][0]];

        if (placement != null) {
          if (['d', 'p1', 'q'].indexOf(placement) == -1) {
            if (placement == 't' && (pages[x[0]]['w']['t'] || []).length < 6) {
              sc = sc * 0.95;
              hsc['placement'].push(0.95);
            }
            else {
              sc = sc * 0.7;
              hsc['placement'].push(0.7);
            }
          }
          else sc = sc;
        }
        else {
          sc = sc * 0.5;
          hsc['placement'].push(0.95);
        }

        if (in_sc_lab != null && in_sc_lab == 'pass') sc = 0.0;
      }
      else {
                // MULTIPLE WORD QUERIES
        var r1 = 0.0;
        var r1 = 0.0;
        Object.keys(x[2][0]['fws_no_pos']).forEach(k => {
          r1 += x[2][0]['fws_no_pos'][k][0];
        });
        var strength = Math.pow((1.0 - (1.0 / (Math.log(2 + x[2][1]['all'] + x[2][1]['30'])))), 2.0);

        let in_sc_mod = in_sc;
        if (in_sc_lab != null && in_sc_lab == 'pass') in_sc_mod = 0.9;

        sc = r1 * 3 + vsc * (1.0 + strength * 0.50) * file_sc * suf_sc * tit_sc * tdup_sc * pa_sc * som_sc * cons_sc * in_sc_mod * join_sc * dmatch_sc;

        hsc['placement'] = [];
        query_o['vqn'].forEach(t => {
          let placement = null;

          if (hsc['wt2'].hasOwnProperty(t)) placement = hsc['wt2'][t];
          if (placement != null) {
            if (['d', 'p1', 'q'].indexOf(placement) == -1) {
              if (placement == 't' && (pages[x[0]]['t'] || []).length < 6) sc = sc;
              else if (placement == 't' && (pages[x[0]]['t'] || []).length >= 6) sc = sc;
                            else if (placement == 'p2') sc = sc;
                            else if (placement == 'desc') sc = sc;
                            else if (placement == 'qs') {
                              sc = sc * 0.9;
                              hsc['placement'].push(0.9);
                            }
                            else {
                              sc = sc * 0.8;
                              hsc['placement'].push(0.8);
                            }
            }
            else sc = sc;
          }
          else {
            sc = sc * 0.8;
            hsc['placement'].push(0.8);
          }
        });
      }

            // if (sc>0.0) {
      x[2].push(pages[x[0]]['uid']);
      x[2].push(sc);
            // }

      i += 1;
    });


    var cc = cc.sort(function (a, b) { return (b[2][b[2].length - 1] - a[2][a[2].length - 1]); });


    if (query_o['excluded'].length > 0) {
      let enough = true;
      query_o['excluded'].forEach(t => {
        if (t.length < 3) enough = false;
      });

      var cc2 = [];
      cc.forEach(item => {
        let found = false;
        query_o['excluded'].forEach(t => {
          if ((item[0].toLowerCase().indexOf(t) != -1) || (item[1].toLowerCase().indexOf(t) != -1)) found = true;
        });
        if (!found) cc2.push(item);
      });

      if (cc2.length > 0 || enough) cc = cc2;
    }

    var cc2 = [];
    let best_sc = null;

    cc.forEach(x => {
      if (best_sc == null) best_sc = x[2][x[2].length - 1];
      if (((best_sc - x[2][x[2].length - 1]) < 0.60) || (x[2][x[2].length - 1] > 2.65)) cc2.push(x);
    });

    cc = cc2;

        // one last reorder

    cc = cc.slice(0, 10);

    let max_stre = 0.0;

    for (var i = 0; i < cc.length; i++) {
      var stre = cc[i][2][1]['30'] + cc[i][2][1]['180'] + cc[i][2][1]['all'];
      if (stre > max_stre) max_stre = stre;
    }

    for (var i = 0; i < cc.length; i++) {
      var stre = cc[i][2][1]['30'] + cc[i][2][1]['180'] + cc[i][2][1]['all'];
      cc[i][2][cc[i][2].length - 1] = cc[i][2][cc[i][2].length - 1] + (cc[i][2][cc[i][2].length - 1] * 0.15 * stre / (max_stre));
            // break ties
      cc[i][2][cc[i][2].length - 1] = cc[i][2][cc[i][2].length - 1] - 0.000001 * cc[i][0].length;
    }

    var cc = cc.sort(function (a, b) { return (b[2][b[2].length - 1] - a[2][a[2].length - 1]); });

    if (cc.length < 3) {
      const already_in_cc = {};
      Object.keys(pages).forEach(_uid => { already_in_cc[_uid] = true; });

      let v = {};
      cc.forEach(x => {
        const uid = pages[x[0]]['uid'];
        const suid = '' + uid;

        Object.keys((CliqzHM.data['net2_out'][suid] || {})).forEach(tt => {
          const huids = CliqzHM.data['net2_out'][suid][tt];
          CliqzHM.items(huids).forEach(_x2 => {
            let [uid2, uid2_sc] = _x2;
            if ((!already_in_cc.hasOwnProperty(parseInt(uid2))) && (tt == '1' || tt == '2')) {
              if (!v.hasOwnProperty(uid2)) v[uid2] = 0;
              v[uid2] = v[uid2] + 0.5;
            }
          });
        });

        Object.keys((CliqzHM.data['net2_in'][suid] || {})).forEach(tt => {
          const huids = CliqzHM.data['net2_in'][suid][tt];
          CliqzHM.items(huids).forEach(_x2 => {
            let [uid2, uid2_sc] = _x2;
            if ((!already_in_cc.hasOwnProperty(parseInt(uid2))) && (tt == '1' || tt == '2')) {
              if (!v.hasOwnProperty(uid2)) v[uid2] = 0;
              v[uid2] = v[uid2] + 0.5;
            }
          });
        });

        CliqzHM.group(CliqzHM.data['net_time'][suid] || [], 2).forEach(_x => {
          let [iuid2, tmp] = _x;
          if (!already_in_cc.hasOwnProperty(iuid2)) {
            if (!v.hasOwnProperty('' + iuid2)) v['' + iuid2] = 0;
            v['' + iuid2] = v['' + iuid2] + 1.0;
          }
        });
      });

      const v2 = [];
      CliqzHM.items(v).forEach(_x => {
        let [uid, count] = _x;
        if (count > 1) v2.push([uid, count]);
      });

      const v3 = [];
      v2.sort(function (a, b) { return (b[1] - a[1]); }).forEach(_x => {
        let [uid, count] = _x;
        v3.push(parseInt(uid));
      });

      v = v3;

      if (v.length > 0) {
        const have_uids = {};
        vpages.forEach(item => {
          have_uids[item[0]] = true;
        });

        v.slice(0, 3).forEach(uid2 => {
          if (have_uids.hasOwnProperty(uid2) && CliqzHM.data['urls'].hasOwnProperty(uid2)) {
            const page = CliqzHM.uid2page(uid2);
            const xtra = {};
            if (page.hasOwnProperty('q')) {
              xtra['q'] = [];
              page.forEach(_x => { xtra['q'].push(_x[0]); });
            }

            cc.push([page['u'], page['title'] || 'N/A', [{ 'session': true }, 0.0], xtra]);
          }
        });
      }
    }

    const cont2 = [];
    CliqzHM.items(cont).sort(function (a, b) { return (b[1] - a[1]); }).forEach(_x => {
      const t = _x[0];
      if (query_o['vqn'].indexOf(t) == -1) cont2.push(t);
    });
    cont = cont2;

    const elapsed = (new Date().getTime()) - start_time;
    vtime.push(['rank_4_step2', elapsed]);

    return [cc, cont, [pages, comp_url_cache], vtime];
  },
  uid2page(uid) {
    const page = { uid };

    for (let i = 0; i < CliqzHM.data['labs'].length; i++) {
      const lab = CliqzHM.data['labs'][i];
      const ilab = i;

      if (lab == 'c') {
        page['c'] = {};
        for (let j = 0; j < CliqzHM.data['labsc'].length; j++) {
          const labc = CliqzHM.data['labsc'][j];
          const ilabc = j;
          page['c'][labc] = CliqzHM.data['urls'][uid][ilab][ilabc];
        }
      }
      else if (lab == 'q') {
        if (CliqzHM.data['urls'][uid][ilab]) {
          page[lab] = CliqzHM.data['urls'][uid][ilab];
        }
      }
            else {
        page[lab] = CliqzHM.data['urls'][uid][ilab];
      }
    }

    return page;
  },
  capping(res, vtime) {
    const start_time = new Date().getTime();

    let res2 = null;
    if (res.length > 0) {
      const max_sc = res[0][2][res[0][2].length - 1];

      let thres = 1.0;
      if (res.length > 5) thres = 0.666;
      else thres = 0.40;

      res2 = [];
      for (let i = 0; i < res.length; i++) {
        if (res[i][2][res[i][2].length - 1] >= max_sc * thres) res2.push(res[i]);
      }
    }
    else res2 = res;

    const elapsed = (new Date().getTime()) - start_time;
    vtime.push(['capping', elapsed]);

    return [res2, vtime];
  },
  auxSet(arr) {
    const r = [];
    const seen = {};
    arr.forEach(x => {
      if (!seen.hasOwnProperty(x)) {
        seen[x] = true;
        r.push(x);
      }
    });
    return r;
  },
  group(arr, c) {
    const oo = [];
    for (let i = 0; i < arr.length; i += 2) {
      oo.push([arr[i], arr[i + 1]]);
    }
    return oo;
  },
  items(h) {
    const oo = [];
    Object.keys(h).forEach(id => {
      oo.push([id, h[id]]);
    });
    return oo;
  },
  score_partials(fw, query_o) {
    if (query_o['vqn'].length > 2) {
      let num_exacts = 0;
      for (let i = 0; i < query_o['vqn'].length - 2; i++) {
        const t = query_o['vqn'][i];
        (fw[t] || []).forEach(t2 => {
          if (t2 == t) {
            num_exacts += 1;
                        // break;
          }
        });
      }

      num_exacts = num_exacts / (query_o['vqn'].length - 1);

      if (num_exacts < 0.34) return 0.8;
    }
    return 1.0;
  },
  extra_words(page, u, partial) {
    const p = page['w'];
    const res = {};
    ['d', 'p1', 'p2', 'qs', 't', 'q', 'de'].forEach(lab => {
      if (p.hasOwnProperty(lab) && p[lab].length > 0) {
        p[lab].forEach(w => {
          if (w.startsWith(partial)) {
            res[w] = true;
          }
        });
      }
    });
    return Object.keys(res);
  },
  score_domain_match(query_o, fw, pagew) {
    if (query_o['vqn'].length > 2) return 1.0;

    if ((pagew['qs'] || []).join('').length > 7) return 1.0;
    if ((pagew['p2'] || []).join('').length > 0) return 1.0;
    if ((pagew['p1'] || []).join('').length > 4) return 1.0;

    const vd = pagew['d'].slice(0, pagew['d'].length);
    const lang = ['de', 'en', 'us', 'fr', 'es'];
    for (var i = 0; i < pagew['d'].length - 2; i++) {
      if (lang.indexOf(vd[i]) != -1) vd[i] = '';
    }

    const jd = vd.slice(0, vd.length - 1).join('');

    const v1 = (fw[query_o['vqn'][0]] || []).concat([query_o['vqn'][0]]);
    for (var i = 0; i < v1.length; i++) {
      const t = v1[i];
      if (t == jd) return 2.0;
      else {
        if (jd.startsWith(t)) {
          const v2 = (fw[query_o['vqn'][1]] || []).concat([query_o['vqn'][1]]);
          for (let j = 0; j < v2.length; j++) {
            const t2 = v2[j];
            if (t + t2 == jd) return 2.0;
          }
        }
      }
    }

    return 1.0;
  },
  score_join(query_o, pagew) {
    const labs = ['d', 't', 'p1', 'q'];
    for (let i = 0; i < query_o['vqn'].length - 1; i++) {
      const w1 = query_o['vqn'][i];
      const w2 = query_o['vqn'][i + 1];

      const s1 = w1 + w2;
      const s2 = w1 + '$' + w2;

      for (let j = 0; j < labs.length; j++) {
        const lab = labs[j];
        if (pagew[lab]) {
          const t1 = pagew[lab].join('');
          const t2 = pagew[lab].join('$');

          if (t1.indexOf(s1) != -1) return 1.5;
          if (t2.indexOf(s2) != -1) return 1.6;
        }
      }
    }

    return 1.0;
  },
  score_domain_2(x, query_o, comp_url_cache) {
    const dom_sc = 1.0;

    let [dom, p1, p2, qs] = comp_url_cache[x[0]];

    p1 = p1 || '';
    p2 = p2 || '';
    qs = qs || '';

    const q = query_o['q'];

    let short_url = false;
    let very_visible = false;

    if (p1.length < 20)
      if (p2 == '' && qs == '') short_url = true;
      else if (p2 == '' && qs.length < 8) short_url = true;

    var ind = dom.indexOf(q);
    if (ind != -1) {
      if (ind == 0 || (dom[ind - 1] == '.' || dom[ind - 1] == '-')) {
        very_visible = true;
      }
    }

    if (!very_visible && p1.length < 30 && p1.length + p2.length < 40) {
      var ind = p1.indexOf(q);
      if (ind > 0) {
        if (['-', '_', '/'].indexOf(p1[ind - 1]) != -1) {
          very_visible = true;
        }
      }
      else if (ind == 0) very_visible = true;
    }

    return [very_visible, short_url];
  },
  score_consecutive(x, query_o, pagew) {
    let cont = false;
    for (let i = 0; i < query_o['vqn'].length - 1; i++) {
      const w1 = query_o['vqn'][i];
      const w2 = query_o['vqn'][i + 1];

      [w1].forEach(w1a => {
        Object.keys(pagew).forEach(lab => {
          const ind = pagew[lab].indexOf(w1a);
          if (ind > 0 && pagew[lab][ind - 1].startsWith(w2)) {
            cont = true;
                        // break;
          }
          else if ((ind < pagew[lab].length - 1) && (pagew[lab][ind + 1].startsWith(w2))) {
            cont = true;
                        // break;
          }
        });
      });

      if (cont) break;
    }

    if (cont) return 2.0;
    else return 1.0;
  },
  score_term_dupes(fw, query_o) {
    let found = false;

    if (query_o['vqn'].length > 1) {
      const v = (fw[query_o['vqn'][query_o['vqn'].length - 1]] || []);
      if (v.length == 1) {
        const next_word = v[0];
        found = false;

        query_o['vqn'].slice(0, query_o['vqn'].length - 1).forEach(t => {
          const t1 = query_o['vqn'][query_o['vqn'].length - 1];

          if (t.startsWith(t1) || t1.startsWith(t)) {
            (fw[t] || []).forEach(t2 => {
              if (t2 == next_word) {
                found = true;
                                // break;
              }
            });
          }
        });
      }
    }

    if (found) return 0.5;
    else return 1.0;
  },
  where_terms_2(fw, page, comp_url, query_o) {
    const res = {};
    const res2 = {};
    const labs = ['d', 'q', 'p1', 't', 'p2', 'desc', 'qs'];

    query_o['vqn'].forEach(t => {
      res2[t] = [];

      (fw[t] || []).concat([t]).forEach(alt_t => {
        let cc = 0;

        for (let i = 0; i < labs.length; i++) {
                // labs.forEach(lab => {
          const lab = labs[i];

          if (page['w'].hasOwnProperty(lab) && page['w'][lab].hasOwnProperty(alt_t)) {
            res2[t].push([lab, cc]);
            break;
          }
          else if (page['w'].hasOwnProperty(lab)) {
            for (let z = 0; z < page['w'][lab].length; z++) {
              const w = page['w'][lab][z];
              if (w.indexOf(t) != -1) {
                res2[t].push([lab, cc]);
                break;
              }
            }
                        /*
                        //page['w'][lab].forEach(w => {

                            if (w.indexOf(t)!=-1) {
                                res2[t].push([lab, cc]);
                                break;
                            }

                        //});
                        */
          }
          cc += 1;
                // });
        }
      });

      if (res2[t].length > 0) {
        res[t] = res2[t].sort(function (a, b) { return a[1] - b[1]; })[0][0];
      }
    });

    return res;
  },
  where_terms(comp_url, title, queries, query_o) {
    const res = {};
    let labs = ['d', 'p1', 't', 'q'];

    let vlabs = [comp_url[0] || '', comp_url[1] || '', title || '', queries || ''];

    labs = labs.slice(0, 2);
    vlabs = vlabs.slice(0, 2);

    query_o['vqn'].forEach(t => {
      for (let i = 0; i < labs.length; i++) {
        const lab = labs[i];
        const vlab = vlabs[i];
        if (vlab.indexOf(t) != -1) {
          res[t] = lab;
          break;
        }
      }
    });

    return res;
  },
  score_title(title) {
    if (title == null || title == '') return 0.95;
    if ((title.indexOf('pixels)') != -1) && (title.indexOf('Image') != -1)) {
      return 0.5;
    }
    return 1.0;
  },
  score_suffix(x, pagew) {
    const kk = Object.keys(x[2][0]['fw']);

    for (let i = 0; i < kk.length; i++) {
      for (let j = 0; j < x[2][0]['fw'][kk[i]].length; j++) {
        const w2 = x[2][0]['fw'][kk[i]][j];
        if (w2 == pagew['d'][pagew['d'].length - 1]) return 0.8;
      }
    }
    return 1.0;
  },
  score_files_and_suffixes(x, query_o, pagew, wwd) {
    const url = x[0].toLowerCase();
    const title = x[1].toLowerCase();
    const v = [];
    Object.keys(x[2][0]['fw']).forEach(w => {
      x[2][0]['fw'][w].forEach(w2 => {
        if (wwd.hasOwnProperty(w2)) {
          const wa = '.' + w2;
          if (url.indexOf(wa) != -1) v.push(0.702);
          if (title.indexOf(wa) != -1) v.push(0.702);
        }
        else {
          v.push(1.0);
        }
      });
    });

    if (v.length == 0) return 1.0;
    else {
      let mm = 0.0;
      for (let i = 0; i < v.length; i++) if (v[i] > mm) mm = v[i];
      return mm;
    }
  },
  score_original_match(url, comp_url, query_o) {
    const vq = [];
    query_o['q'].toLowerCase().split(' ').forEach(t => {
      if (t != '') vq.push(t);
    });

    if (query_o['vqn'].length > vq.length) {
      const dom = (comp_url[0] || '').toLowerCase();
      const p1 = (comp_url[1] || '').toLowerCase();
      const p2 = (comp_url[2] || '').toLowerCase();

      for (let i = 0; i < vq.length; i++) {
        const t = vq[i];
        if (query_o['vqn'].indexOf(t) == -1) {
          if (dom.indexOf(t) != -1) {
            if (vq.length == 1) return 3.0;
            else 2.0;
          }
          else if (p1.indexOf(t) != -1) {
            if (vq.length == 1) return 1.50;
            else 1.20;
          }
                    else if (p2.indexOf(t) != -1) {
                      if (vq.length == 1) return 1.25;
                      else 1.10;
                    }
        }
      }
    }
    return 1.0;
  },
  time_score(hist) {
    let sc = 0.0;
    if (hist['all'] > 30) sc = 0.60;
    else if (hist['all'] > 20) sc = 0.55;
        else if (hist['all'] > 10) sc = 0.5;
        else if (hist['all'] > 2) sc = 0.40;
        else if (hist['all'] > 1) sc = 0.35;
        else if (hist['all'] > 0) sc = 0.30;

    const rest = [];
    if (hist['2'] > 1) rest.push(1.0);
    else if (hist['2'] > 0) rest.push(0.75);

    if (hist['7'] > 3) rest.push(1.0);
    else if (hist['7'] > 1) rest.push(0.75);
        else if (hist['7'] > 0) rest.push(0.5);

    if (hist['30'] > 5) rest.push(0.9);
    else if (hist['30'] > 2) rest.push(0.7);
        else if (hist['30'] > 0) rest.push(0.4);


    if (hist['180'] > 20) rest.push(0.70);
    else if (hist['180'] > 10) rest.push(0.60);
        else if (hist['180'] > 5) rest.push(0.50);
        else if (hist['180'] > 2) rest.push(0.40);
        else if (hist['180'] > 0) rest.push(0.20);

    let mm = 0.0;
    if (rest.length > 0) {
      for (let i = 0; i < rest.length; i++) if (rest[i] > mm) mm = rest[i];
    }

    const strength = Math.log(Math.min(hist['all'], 50) + 1.0) / Math.log(50 + 1);

    sc = sc + (1.0 - sc) * mm;

    if (hist['all'] == 1) {
      sc = sc * 0.75;
    }
    else if (hist['all'] == 2) {
      sc = sc * 0.85;
    }

    sc = sc + (1.0 - sc) * 0.20 * strength;

    return sc;
  },
  rank_navig_4(query_o, vtime) {
    const start_time = new Date().getTime();
    const cand = [];
    let query_n = url_norm(query_o['q']).toLowerCase();
    const query_ex = query_o['q'].toLowerCase();

    const nav_labels = ['http://', 'https://', 'http:/', 'https:/', 'http:', 'https:', 'about:', 'www.'];
    for (var i = 0; i < nav_labels; i++) {
      const l = nav_labels[i];
      if (query_n.startsWith(l)) {
        query_n = query_n.replace(l, '');
      }
    }

    if (query_n == '') {
      var elapsed = (new Date().getTime()) - start_time;
      vtime.push(['rank_navig 4', elapsed]);
      return [[], vtime];
    }

    let query_n_no_space = null;
    if (query_n.indexOf(' ') == -1) {
      query_n_no_space = [query_n.replace(/ /g, '%20'), query_n.replace(/ /g, '+')];
    }

    const vqn_n = normalize(query_n).split(' ');
    const uids = {};

    for (var i; i < Math.min(3, vqn_n.length); i++) {
      const t = vqn_n[i];
      CliqzHM.group((CliqzHM.data['mm2'][t] || []), 2).slice(0, 10).concat([[t, 100.0]]).forEach(item0 => {
        let [wt, wt_sc] = item0;
        let c = 1;
        CliqzHM.group((CliqzHM.data['w2uid'][wt] || []), 2).forEach(item => {
          let [uid, uid_sc] = item;
          if (!uids.hasOwnProperty(uid)) uids[uid] = 0.0;
          uids[uid] += 100000.0 / c + Math.log(2.0 + uid_sc);
          c++;
        });
      });
    }

    const vpages = CliqzHM.items(uids).filter(([uid,]) => CliqzHM.data['urls'][uid]).sort(function (a, b) { b[1] - a[1]; });

    vpages.slice(0, 100).forEach(x => {
      let [uid, uid_sc] = x;

      const page = CliqzHM.uid2page(uid);

      const url = page['u'];
      const url_n = url_norm(url);

      let is_match = false;
      if (url_n.startsWith(query_n)) is_match = true;
      else if (url_n.indexOf(query_n) != -1) is_match = true;
            else if (url_n.toLowerCase().indexOf(query_n) != -1) is_match = true;
            else if (!query_n_no_space) {
              for (var i = 0; i < query_n_no_space.length; i++) {
                if (url_n.startsWith(query_n_no_space[i])) {
                  is_match = true;
                  break;
                }
              }
            }


      if (is_match) {
        const time_sc = CliqzHM.time_score(page['c']);

        let mult_is_match = 1.0;
        if ((url.indexOf(query_ex) != -1) || (url.toLowerCase().indexOf(query_ex) != -1)) mult_is_match = 2.0;

        let mult_title = 1.0;
        if (!page['title'] || page['title'] == '') mult_title = 0.8;

        let mult_long_qs = 1.0;
        let w = url_n.split('?');
        if (w.length > 1) {
          var qs = w.splice(1, w.length).join('?');
          if (qs.length > 40) mult_long_qs = 0.2;
          else if (qs.length > 20) mult_long_qs = 0.5;
        }

        w = url_n.split('#');
        if (w.length > 1) {
          var qs = w.splice(1, w.length).join('#');
          if (qs.length > 40) mult_long_qs = 0.2;
          else if (qs.length > 20) mult_long_qs = 0.5;
        }

        let mult_exact = 1.0;
        if (url_n == query_n) mult_exact = 2.0;

        let mult_file = 1.0;
        if (query_n.startsWith('/') && url.startsWith('file://')) mult_file = 2.0;


        let break_ties = -0.0000001 * url_n.length;
        if (url.indexOf('?') != -1) break_ties = break_ties * 10;
        else if (url.indexOf('#') != -1) break_ties = break_ties * 10;

        let sc = time_sc * mult_title * mult_long_qs * mult_exact * mult_file * mult_is_match;
        sc = sc + break_ties;

        let tit = page['title'];
        if (!tit || tit == '') tit = 'N/A';

        const xtra = {};
        if (page['q']) {
          xtra['q'] = [];
          for (var i = 0; i < page['q'].length; i++) {
            xtra['q'].push(page['q'][i][0]);
          }
        }

        cand.push([url, tit, [uid_sc, time_sc, mult_title, mult_long_qs, mult_exact, mult_file, break_ties, sc], xtra]);
      }
    });

    const cands = cand.sort(function (a, b) { return (b[2][b[2].length - 1] - a[2][a[2].length - 1]); });

    var elapsed = (new Date().getTime()) - start_time;
    vtime.push(['rank_navig final', elapsed]);

    return [cands, vtime];
  },
  page_score(url, original_query, vqn, ws, wh) {
    const types = ['d', 'q', 'p1', 't', 'p2', 'qs'];

    const ffa = {};
    const ffa_sc_1st = {};
    const cache_lines = {};

    for (var i = 0; i < vqn.length; i++) {
      const ff = Array.apply(null, Array(types.length)).map(Number.prototype.valueOf, 0);

      const t = vqn[i];

      let last = false;
      if (i == vqn.length - 1) last = true;

      let num_found = 0;
            // for ty, ty_index in zip(types, range(0, len(types))):

      for (let i2 = 0; i2 < types.length; i2++) {
        var ty = types[i2];
        const ty_index = i2;

        if (num_found > 2) break;

        let s = wh[ty];
        if (!s || s == '') {
          if (ty == 't') s = wh['d'] || '';
          else continue;
        }

        let xtra_s = null;
        let vs = null;
        let s2 = null;

        if (ty == 't') {
          xtra_s = wh['d'];
          const xx = s.split(' ');
          vs = xx.concat(xtra_s.split(' ').splice(0, xtra_s.split(' ').length - 1));

          s2 = vs.join(' ');
        }
        else {
          vs = s.split(' ');
          s2 = s;
        }

        if (vqn.length > 0 && ty != 'qs') {
          cache_lines[ty] = ':' + s2.replace(/ /g, ':');
        }

        let alt_mod = 1.0;

                // test the waters for efficiency
                // try:  pos = s2.index(t) except:

        var pos = s2.indexOf(t);

        if (pos != -1) {
          num_found += 1;
        }
        else {
          pos = null;
          if (t.length > 3) {
            let add_alts = null;
            const _tmp = ws[t]['subs'].splice(0, 3);

            for (let i3; i3 < _tmp.length; i3++) {
              const t_alt = _tmp[i3];
              if (t != t_alt && s2.indexOf(t_alt) != -1) add_alts = t;
            }

            if (add_alts) {
              vs.push(add_alts);
              alt_mod = 0.7;
              pos = 0;
            }
          }
        }

        if (pos != null) {
          for (var j = 0; j < vs.length; j++) {
            var w = vs[j];
            var val = 0.0;

            if (ty == 'd' && j == vs.length - 1) {
                            // tld
              if (t == w && ff[ty_index] < 0.6 * alt_mod) ff[ty_index] = 0.6 * alt_mod;
            }
            else {
              if (false && t == w) {
                if (t.length > 3 && ['d', 'p1', 't'].indexOf(ty) != -1) val = 1.0 * alt_mod;
                else val = 0.9 * alt_mod;

                if (ff[ty_index] < val) ff[ty_index] = val;
              }
              else if (w.startsWith(t)) {
                if (ff[ty_index] < 0.8 * alt_mod) ff[ty_index] = 0.8 * alt_mod;
              }
                            else if (w.endsWith(t)) {
                              if (t.length > 4) val = 0.7 * alt_mod;
                              else val = 0.5 * alt_mod;
                              if (ff[ty_index] < val) ff[ty_index] = val;
                            }
                            else if (last && w.indexOf(t) != -1) {
                              if (t.length > 4) val = 0.6 * alt_mod;
                              else val = 0.4 * alt_mod;
                              if (ff[ty_index] < val) ff[ty_index] = val;
                            }
                            else if (t.length > 5) {
                              const remain = [];
                              for (let zi = 0; zi < Math.min(t.length, w.length); zi++) {
                                if (t[zi] == w[zi]) remain.push(t[zi]);
                              }

                              const diff = Math.min(t.length, w.length) - remain.length;

                              var val = 0;
                              if (remain.length > 4 && diff == 1) {
                                val = 0.35 * alt_mod;
                              } else if (remain.length > 4 && diff == 2) {
                                val = 0.30 * alt_mod;
                              }

                              if (ff[ty_index] < val) ff[ty_index] = val;
                            }
            }
          }
        }
      } // for(var i2=0;i2<types.length;i2++)

      ffa[t] = ff;

      let mm_sc = 0.0;
      let num = 0;

      var types_scores = [1.0, 1.0, 0.80, 0.90, 0.75, 0.65];

      for (let i4 = 0; i4 < types.length; i4++) {
        var ty = types[i4];
        var ty_sc = types_scores[i4];
        const ff_sc = ff[i4];

        const margin = 1.0 - mm_sc;
        const inc = ff_sc * ty_sc * margin;
        if (num < 2 && inc > 0.0) {
          mm_sc += ff_sc * ty_sc * margin;
          num += 1;
        }
      }

      ffa_sc_1st[t] = mm_sc;
    }

    if (vqn.length > 0) {
      for (var i = 0; i < vqn.length; i++) {
        for (var j = i + 1; j < vqn.length; j++) {
          if (Math.abs(i - j) <= 2) {
            const w1 = vqn[i];
            const w2 = vqn[j];

            var w = ':' + w1 + ':' + w2;

            let mult = [];
            for (var z = 0; z < types.length; z++) {
              var ty = types[z];
              var ty_sc = types_scores[z];

              if (ty != 'qs' && cache_lines[ty] && cache_lines[ty].indexOf(w) >= 0) mult.push(ty_sc);
            }

            mult = mult.sort(function (a, b) {
              return (b - a);
            }).slice(0, 2);

            let kk = 0.0;
            for (var z = 0; z < mult.length; z++) kk += mult[z];

            if (kk > 0.0) {
              ffa_sc_1st[w1] *= Math.max(1.1, kk);
              ffa_sc_1st[w1] = Math.min(ffa_sc_1st[w1], 1.2);
              ffa_sc_1st[w2] *= Math.max(1.1, kk);
              ffa_sc_1st[w2] = Math.min(ffa_sc_1st[w2], 1.2);
            }
          }
        }
      }
    }


    if (vqn.length == 1 && vqn[0].length < 5) {
      var [d, p1, p2, qs] = comp_url(url);

      if (p1 && p1 != '') {
        var pos = p1.indexOf(vqn[0]);
        if (pos != -1 && pos > 0 && p1[pos - 1] == '.') {
          Object.keys(ffa_sc_1st).forEach(w => {
            ffa_sc_1st[w] *= 0.666;
          });
        }
      }

      if (p2 && p2 != '') {
        var pos = p2.indexOf(vqn[0]);
        if (pos != -1 && pos > 0 && p2[pos - 1] == '.') {
          Object.keys(ffa_sc_1st).forEach(w => {
            ffa_sc_1st[w] *= 0.666;
          });
        }
      }
    }

    const ovqn = original_query.split(' ');
    if (original_query.length > 2 && ovqn.length != vqn.length) {
            // character than tokenizes

      var [d, p1, p2, qs] = comp_url(url);
      if (d && d != '' && d.indexOf(original_query) != -1) {
        Object.keys(ffa_sc_1st).forEach(w => {
          ffa_sc_1st[w] *= 1.5;
        });
      }
      else if (p1 && p1 != '' && p1.indexOf(original_query) != -1) {
        Object.keys(ffa_sc_1st).forEach(w => {
          ffa_sc_1st[w] *= 1.2;
        });
      }
    }

    return [ffa, ffa_sc_1st];
  },
  clustering_4(res, pages, comp_url_cache, vtime) {
    const start_time = (new Date().getTime());

    const posu = CliqzHM.data['labs'].indexOf('u');
    const post = CliqzHM.data['labs'].indexOf('title');

    for (let i = 0; i < Math.min(5, res.length); i++) {
      const x = res[i];

      if (!pages.hasOwnProperty(x[0])) continue;

      const uid = pages[x[0]]['uid'];
      const clust_items = CliqzHM.data['clusters'][uid];

      if (clust_items != null && clust_items.length > 0) {
        x[3]['c'] = [];

        clust_items.slice(0, 5).forEach(_x => {
          let [uid2, label] = _x;
          if (CliqzHM.data['urls'][uid2]) {
            x[3]['c'].push([CliqzHM.data['urls'][uid2][posu], CliqzHM.data['urls'][uid2][post], label]);
          }
        });
      }
    }

    const elapsed = (new Date().getTime()) - start_time;
    vtime.push(['clustering_4', elapsed]);

    return [res, vtime];
  },
  _qnn(str) {
    return normalize(str);
  },
  _ngrams(str, n) {
    return ngrams(str, n);
  },
  query_proc(query, vtime) {
        // PORTED from:
        //      cliqz/hm/
        //      convert_index2.py
        //      function: query_proc

    const start_time = (new Date().getTime());

    const query_norm = normalize(query);
    let v_query_norm = query_norm.split(' ');

    let excluded = [];
    if (query.indexOf('!') != -1) {
      const v = query.split(' ');
      for (var i = 0; i < v.length; i++) {
        if (t.startsWith('!')) {
          const ex = normalize(t);
          if (ex.length > 0) excluded.push(ex);
        }
      }
    }

    if (v_query_norm.length > 4) {
      if (v_query_norm[0] == 'http' || v_query_norm[0] == 'https') {
        v_query_norm = v_query_norm.slice(1, v_query_norm.length);
      }

      if (v_query_norm.length > 3 && v_query_norm[0] == 'www') {
        v_query_norm = v_query_norm.slice(1, v_query_norm.length);
      }

      if (v_query_norm.length > 3) {
        if (['do', 'jsp', 'asp', 'html', 'htm', 'php'].indexOf(v_query_norm[-1]) != -1) {
          v_query_norm = v_query_norm.slice(0, v_query_norm.length - 1);
        }
      }
    }

    const nav_labels = ['http://', 'https://', 'http:/', 'https:/', 'http:', 'https:', 'about:', 'www.', '/'];
    let navigational = false;

    for (var i = 0; i < nav_labels.length; i++) {
      if (query.startsWith(nav_labels[i])) navigational = true;
      else {
        if (query.indexOf('.') != -1 && query.slice(0, 16).indexOf(' ') == -1) navigational = true;
      }
    }

    if (navigational) excluded = [];

    if (excluded.length > 0) {
      for (var i = 0; i < excluded.length; i++) {
        v_query_norm.remove(v_query_norm.indexOf(excluded[i]));
      }
    }

    const ws = {};
        // excluded ws because not used, leave it for consistency

    const elapsed = (new Date().getTime()) - start_time;
    vtime.push(['query_proc', elapsed]);

    return [{ 'qn': query_norm, 'vqn': v_query_norm, 'q': query, 'nav': navigational, ws, excluded }, vtime];
  },
  similar_words(word) {
        // PORTED from:
        //      cliqz/hm/
        //      convert_index2.py
        //      function: similar_words

    const ww = ngrams(word, 2);

    const hist = {};
    for (var i = 0; i < ww.length; i++) {
      const ng = ww[i];

      var _tmp = [];
      if (CliqzHM.data['indexw'].hasOwnProperty(ng)) _tmp = CliqzHM.data['indexw'][ng];

      for (let j = 0; j < _tmp.length; j++) {
        const id = _tmp[j];
        if (!hist[id]) hist[id] = [];
        hist[id].push(ng);
      }
    }

        // cands = [(w, ngs) for w, ngs in sorted(hist.items(), key=lambda x: len(x[1]), reverse=True) if len(ngs) > len(ww)*0.5][0:20]
    var _tmp = [];
    Object.keys(hist).forEach(function (w) {
      const ngs = hist[w];
      if (ngs.length > ww.length * 0.5) {
        _tmp.push([w, ngs]);
      }
    });

    const cands = _tmp.sort(function (a, b) {
      return (b[1].length - a[1].length);
    }).splice(0, 20);

        // cand_words = [data['id2w'][str(x[0])] for x in cands]
    const cand_words = [];
    for (var i = 0; i < cands.length; i++) {
      cand_words.push(CliqzHM.data['id2w']['' + cands[i][0]]);
    }

    const exps = [];
    const subs = [];

    for (var i = 0; i < cand_words.length; i++) {
      const w = cand_words[i];

      const dis = CliqzHM.levenshtein(word, w);
      if (dis < 2 && (word.length + w.length) > 8) subs.push(w);
      if (dis < 3 && (word.length + w.length) > 12) subs.push(w);
    }

    return [subs, exps];
  },
  mForEach(array, fn) {
    let i, length;
    i = -1;
    length = array.length;
    while (++i < length) fn(array[i], i, array);
  },
  levenshtein(str_m, str_n) {
        // taken from https://raw.githubusercontent.com/gf3/Levenshtein/master/lib/levenshtein.js
    let distance;
    let previous, current, matrix;
    matrix = [];

        // Sanity checks
    if (str_m == str_n)
      return distance = 0;
    else if (str_m == '')
      return distance = str_n.length;
        else if (str_n == '')
          return distance = str_m.length;
        else {
            // Danger Will Robinson
          previous = [0];
          CliqzHM.mForEach(str_m, function (v, i) { i++, previous[i] = i; });

          matrix[0] = previous;
          CliqzHM.mForEach(str_n, function (n_val, n_idx) {
            current = [++n_idx];
            CliqzHM.mForEach(str_m, function (m_val, m_idx) {
              m_idx++;
              if (str_m.charAt(m_idx - 1) == str_n.charAt(n_idx - 1))
                current[m_idx] = previous[m_idx - 1];
              else
                    current[m_idx] = Math.min(previous[m_idx] + 1   // Deletion
                    , current[m_idx - 1] + 1   // Insertion
                    , previous[m_idx - 1] + 1   // Subtraction
                    );
            });
            previous = current;
            matrix[matrix.length] = previous;
          });

          return current[current.length - 1];
        }
  },
  load_test_data(local) {
    if (local) {
      CliqzUtils.httpGet(
                'chrome://cliqz/content/hm/extern/hm_test_index.json',
                function success(req) {
                  CliqzHM.test_data = JSON.parse(req.response);
                });
    }
    else {
      const tFile = FileUtils.getFile('ProfD', ['HMSearch', 'test.json']);

      const testFileName = 'file://' + tFile.path;
      CliqzUtils.log('File path: ' + testFileName);

      CliqzUtils.httpGet(
                testFileName,
                function success(req) {
                  CliqzHM.test_data = JSON.parse(req.response);
                });
    }
  },
  duplicates_title(list_results) {
    const seen = {};
    const filtered_list_results = [];

    for (let i = 0; i < list_results.length; i++) {
      const item = list_results[i];

      const url = item[0];
      let tit = item[1];

      if (!tit) tit = '';

      const tokens = [];
      const vtit = tit.split(' ');
      for (let j = 0; j < vtit.length; j++) {
        const tok = vtit[j];
        if (tok.length > 2 && !CliqzHM.is_numeric(tok)) tokens.push(tok);
      }

      const key = tokens.join(' ');

      if (!seen[key]) {
        seen[key] = true;
        filtered_list_results.push(item);
      }
    }

    return filtered_list_results;
  },
  is_numeric(str) {
    if (!isNaN(str)) return true;
    else {
            // var ss = '[,:()[]<>#@]';
      const re = new RegExp(/[,\:()[\]<>#@]/, 'g');
      str = str.replace(re, '');
            /*
            for(var i=0;i<ss.length;i++) {
                CliqzUtils.log("Before:" + str);
                var re = new RegExp(ss, 'g');
                str = str.replace(re,'');
                CliqzUtils.log("After:" + str);
            }
            */

      if (!isNaN(str)) return true;
      else return false;
    }
  },
  pvalue_test(cluster, native_history) {
        // PORTED from:
        //      cliqz/hm/
        //      convert_index2.py
        //      function: pvalue_test

    if (CliqzHM.test_data == null)
      CliqzUtils.log('No test data, did your run load_test_data? Hint: "CliqzHM.load_test_data()"', 'CliqzHM');

    if (cluster == undefined) cluster = false;

    const oo = [];
    Object.keys(CliqzHM.test_data).forEach(function (k) {
      const v = CliqzHM.test_data[k];
      let vtime = [];
      let query_o = null;
      [query_o, vtime] = CliqzHM.query_proc(k, vtime);
      if (query_o['nav'] != true && query_o['vqn'].length >= 0) {
        oo.push([k, v]);
      }
    });

    const all_res = [];

    for (let _i = 0; _i < oo.length; _i++) {
      const q = oo[_i][0];
      const val = oo[_i][1];

      let cum = 0.0;
      let ll = [];
      Object.keys(val).forEach(function (url) {
        cum += val[url];
        ll.push([url, val[url]]);
      });

      ll = ll.sort(function (a, b) {
        return (b[1] - a[1]);
      });

      const ll2 = [];
      let cum2 = 0;
      for (let i = 0; i < ll.length; i++) {
        if ((ll[i][1] / cum) > 0.10) {
          ll2.push(ll[i]);
          cum2 += ll[i][1];
        }
      }

      if (ll2.length == 0) continue;

      let vtime = [];
      let res = null;
      if (native_history) {
        all_res.push([q, [], [], ll, cum]);
      }
      else {
        [res, vtime] = CliqzHM.query(q, cluster);
        all_res.push([q, res, vtime, ll, cum]);
      }
    }

    if (native_history) {
      CliqzHM.all_res_bkp = [];
      CliqzHM.pvalue_test_cascade(cluster, all_res.reverse());
    }
    else {
      CliqzHM.pvalue_test_agg(cluster, all_res);
    }
  },
  urlForAutoLoad(data) {
    if (data.result.length > 1) {
      let autor = false;
      const c0 = data.result[0][2][1]['180'];
      var [d0, a, b, c] = comp_url(data.result[0][0]);
      if (c0 > 10) {
        autor = true;

        for (let j = 1; j < Math.min(3, data.result.length); j++) {
          var [d1, a, b, c] = comp_url(data.result[j][0]);
          const c1 = data.result[j][2][1]['180'];

          if (c1 > c0 * 0.10) {
                        // the result is strong, we should cancel,
                        // if not in the same domain
            if (d0 != d1) {
              autor = false;
            }
          }
        }
      }

      if (autor) return data.result[0][0];
    }
    return null;
  },
  all_res_bkp: null,
  pvalue_test_cascade(cluster, all_res) {
    const item = all_res.pop();

    if (item) {
      CliqzUtils.log('going to do query: ' + item[0], 'CliqzHM');
      CLIQZEnvironment.historySearch(item[0], function (e) {
        if (e.ready == true) {
          const tmp_res = [];
          e.results.forEach(o => {
            tmp_res.push([o.value, o.comment, -1.0]);
          });
          item[1] = tmp_res.slice(0, 2);

          CliqzUtils.log('results: ' + JSON.stringify(item), 'CliqzHM');
          CliqzHM.all_res_bkp.push(item);
          CliqzUtils.setTimeout(function () {
            CliqzHM.pvalue_test_cascade(cluster, all_res);
          }, 200);
        }
      });
    }
    else {
      CliqzHM.pvalue_test_agg(cluster, CliqzHM.all_res_bkp);
            // CliqzHM.all_res_bkp = null;
    }
  },
  pvalue_test_agg(cluster, all_res) {
    const pvalues = { 'not-found': 0 };
    const n = 0;

    for (let z = 0; z < all_res.length; z++) {
      let res = all_res[z][1];
      const q = all_res[z][0];
      const vtime = all_res[z][2];
      let ll = all_res[z][3];
      const cum = all_res[z][4];

      const resu = [];
      const kk = [];
      const position_resu = {};

      for (var i = 0; i < res.length; i++) {
        const item = res[i];
        const nurl = url_norm(item[0]);
        resu.push(nurl);
        kk.push(nurl);

        if (!position_resu[nurl]) position_resu[nurl] = i;

        if (cluster) {
          for (var j = 0; j < item[3].length; j++) {
            const item2 = item[3][j];
            const nurl2 = url_norm(item2[0]);

            if (!position_resu[nurl2]) {
              resu.push(nurl2);
              position_resu[nurl2] = i;
            }
          }
        }
      }


      if (res.length == 0) pvalues['not-found'] += 1;

      const positions = [];
      for (var i = 0; i < ll.length; i++) {
        const u = ll[i][0];
        const sc = ll[i][1];

        const un = url_norm(u);

        var pos = resu.indexOf(un);

        if (pos >= 0) {
          const pos_kk = kk.indexOf(un);
          if (false && cluster && pos > pos_kk) {
            CliqzUtils.log('This should not happen', 'CliqzHM');
          }

          if (pos > 10) pos = 10;

          for (var j = pos; j < 11; j++) pvalues[j + 1] = (pvalues[j + 1] || 0) + (sc / (0.0 + cum));
        }

        positions.push(pos);
      }

      let bad_pos = 0;
      for (var i = 0; i < positions.length; i++) {
        if (pos > 3 || pos < 0) bad_pos += 1;
      }

      const all_bad = (ll.length == bad_pos);

      if (true && all_bad) {
        CliqzUtils.log('query: ' + q, 'CliqzHM');
        CliqzUtils.log('expected: ', 'CliqzHM');
        ll = ll.splice(0, 2);
        res = res.splice(0, 2);

        for (var j = 0; j < ll.length; j++) {
          CliqzUtils.log('::::::::::::::: ' + ll[j][0], 'CliqzHM');
        }
        CliqzUtils.log('res: ', 'CliqzHM');
        for (var j = 0; j < res.length; j++) {
          CliqzUtils.log('::::::::::::::: ' + res[j][0], 'CliqzHM');
        }
      }
    }

    CliqzUtils.log('---------- pvalue results --------------', 'CliqzHM');

    for (var j = 1; j < 11; j++) {
      CliqzUtils.log('p' + j + '    ' + (pvalues[j] || 0) / (0.0 + all_res.length), 'CliqzHM');
    }

    CliqzUtils.log('not-found: ' + (pvalues['not-found'] || 0) / (0.0 + all_res.length), 'CliqzHM');
  },

};


export default CliqzHM;
