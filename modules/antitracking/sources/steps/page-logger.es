/* eslint no-param-reassign: 'off' */

// maps string (web-ext) to int (FF cpt). Anti-tracking still uses these legacy types.
const TYPE_LOOKUP = {
  other: 1,
  script: 2,
  image: 3,
  stylesheet: 4,
  object: 5,
  main_frame: 6,
  sub_frame: 7,
  xbl: 9,
  ping: 10,
  xmlhttprequest: 11,
  object_subrequest: 12,
  xml_dtd: 13,
  font: 14,
  media: 15,
  websocket: 16,
  csp_report: 17,
  xslt: 18,
  beacon: 19,
  imageset: 21,
  web_manifest: 22,
};

export default class PageLogger {
  constructor(tpEvents) {
    this.tpEvents = tpEvents;
    this._requestCounters = new Map();
  }

  logMainDocument(state) {
    if (state.isMainFrame) {
      this.tpEvents.onFullPage(state.urlParts, state.tabId, state.isPrivate, state.requestId);
      // if (CliqzAttrack.isTrackerTxtEnabled()) {
      //   TrackerTXT.get(url_parts).update();
      // }
      return false;
    }
    return true;
  }

  attachStatCounter(state) {
    if (state.requestId && this._requestCounters.has(state.requestId)) {
      this.loadStatCounters(state);
    } else {
      const urlParts = state.urlParts;
      const request = this.tpEvents.get(
        state.url,
        urlParts,
        state.tabUrl,
        state.tabUrlParts,
        state.tabId
      );
      state.reqLog = request;
      const incrementStat = (statName, c) => {
        this.tpEvents.incrementStat(request, statName, c || 1);
      };
      state.incrementStat = incrementStat;
      state.getPageAnnotations = this.tpEvents.getAnnotations.bind(this.tpEvents, state.tabId);

      if (state.requestId) {
        this._requestCounters.set(state.requestId, {
          incrementStat,
          ghosteryBug: state.ghosteryBug,
          reqLog: request,
          getPageAnnotations: state.getPageAnnotations,
        });
      }

      // add triggeringPrinciple info
      if (state.ghosteryBug) {
        const pageLoad = this.tpEvents.getPage(
          state.url,
          urlParts,
          state.tabUrl,
          state.tabUrlParts,
          state.tabId
        );
        if (pageLoad) {
          // TODO - Sam
          // if (state.trigger) {
          //   pageLoad.addTrigger(state.urlParts.hostname, state.trigger, state.frameId);
          // }
          if (state.ghosteryBug) {
            pageLoad.addGhosteryBug(state.urlParts.hostname, state.ghosteryBug);
          }
        }
      }
    }
    return true;
  }

  loadStatCounters(state) {
    const meta = this._requestCounters.get(state.requestId);
    Object.keys(meta).forEach((k) => {
      state[k] = meta[k];
    });
  }

  reattachStatCounter(state) {
    const { requestId } = state;
    if (requestId && this._requestCounters.has(requestId)) {
      this.loadStatCounters(state);
      this._requestCounters.delete(requestId);
      return true;
    }
    return false;
  }

  logRequestMetadata(state) {
    const urlParts = state.urlParts;
    const incrementStat = state.incrementStat;

    if (state.url.indexOf(this.tpEvents.config.placeHolder) > -1) {
      incrementStat('hasPlaceHolder');
    }

    // add metadata for this request
    incrementStat('c');
    if (urlParts.search.length > 0) {
      incrementStat('has_qs');
    }
    if (urlParts.hasParameterString() > 0) {
      incrementStat('has_ps');
    }
    if (urlParts.hash.length > 0) {
      incrementStat('has_fragment');
    }
    if (state.method === 'POST') {
      incrementStat('has_post');
    }

    incrementStat(`type_${TYPE_LOOKUP[state.type] || 'unknown'}`);

    // log protocol (secure or not)
    const isHTTP = protocol => protocol === 'http:' || protocol === 'https:';
    const scheme = isHTTP(urlParts.protocol) ? urlParts.scheme : 'other';
    incrementStat(`scheme_${scheme}`);

    // find frame depth
    incrementStat(`window_depth_${Math.min(state.frameAncestors.length, 2)}`);

    return true;
  }
}
