/* eslint no-param-reassign: 'off' */

export default class PageLogger {
  constructor(tpEvents) {
    this.tpEvents = tpEvents;
    this._requestCounters = new Map();
  }

  logMainDocument(state) {
    if (state.isFullPage()) {
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
        state.sourceUrl,
        state.sourceUrlParts,
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
      if (state.trigger || state.ghosteryBug) {
        const pageLoad = this.tpEvents.getPage(
          state.url,
          urlParts,
          state.sourceUrl,
          state.sourceUrlParts,
          state.tabId
        );
        if (pageLoad) {
          if (state.trigger) {
            pageLoad.addTrigger(state.urlParts.hostname, state.trigger, state.frameId);
          }
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
    if (urlParts.query.length > 0) {
      incrementStat('has_qs');
    }
    if (urlParts.parameters.length > 0) {
      incrementStat('has_ps');
    }
    if (urlParts.fragment.length > 0) {
      incrementStat('has_fragment');
    }
    if (state.method === 'POST') {
      incrementStat('has_post');
    }

    // eslint-disable-next-line prefer-template
    const displayContentType = contentType => (!contentType ? 'unknown' : '' + contentType);
    incrementStat(`type_${displayContentType(state.cpt)}`);

    // log protocol (secure or not)
    const isHTTP = protocol => protocol === 'http' || protocol === 'https';
    const scheme = isHTTP(urlParts.protocol) ? urlParts.protocol : 'other';
    incrementStat(`scheme_${scheme}`);

    // find frame depth
    incrementStat(`window_depth_${state.getWindowDepth()}`);

    return true;
  }
}
