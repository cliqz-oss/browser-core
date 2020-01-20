/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Subject, merge, fromEventPattern, asyncScheduler } from 'rxjs';
import { map, groupBy, flatMap, scan, observeOn, debounceTime } from 'rxjs/operators';
import events from '../../core/events';
import { parse } from '../../core/url';

/**
 * Takes an observable and returns a new observable which emits a event in the group (extracted
 * by groupExtractor) if there has not been an event in this group for timeout ms.
 * @param observable
 * @param groupExtractor
 * @param timeout
 * @returns {Observable} group timeouts
 */
function timedOutStream(observable, groupExtractor, timeout) {
  return observable.pipe(
    groupBy(groupExtractor),
    flatMap(group => group.pipe(debounceTime(timeout)))
  );
}

/**
 * Takes an observable and functions to get keys and values, and emits a state translator function
 * which merges the the extracted key and value from the event into a persistant state.
 * @param observable
 * @param keyExtractor
 * @param valueExtractor
 * @returns {Observable} state map
 */
function objectStreamToMap(observable, keyExtractor, valueExtractor) {
  return observable
    .pipe(
      map(value => state =>
        ({ ...state, [keyExtractor(value)]: valueExtractor(value) }))
    );
}

/**
 * Inverse operation to {objectStreamToMap}: Removes elements from the state when the observable
 * emits
 * @param observable
 * @param keyExtractor
 * @returns {Observable}
 */
function deleteMapEntriesFromStream(observable, keyExtractor) {
  return observable
    .pipe(
      map(value => (state) => {
        const nextState = { ...state };
        delete nextState[keyExtractor(value)];
        return nextState;
      })
    );
}

/**
 * Takes an {Observable} and emits a state using the key and value extractors. Keys are timed out
 * if they are not emitted in the last {timeout} ms.
 * @param observable
 * @param keyExtractor
 * @param valueExtractor
 * @param timeout
 */
function objectStreamToMapWithTimeout(observable, keyExtractor, valueExtractor, timeout) {
  return merge(
    objectStreamToMap(observable, keyExtractor, valueExtractor),
    deleteMapEntriesFromStream(timedOutStream(observable, keyExtractor, timeout), keyExtractor),
  ).pipe(scan((state, changeFn) => changeFn(state), {}));
}

const DEFAULT_OPTIONS = {
  CLICK_TIMEOUT: 300000,
  VISIT_TIMEOUT: 240000
};

export default class OAuthDetector {
  constructor(options = DEFAULT_OPTIONS) {
    this.clickActivity = {};
    this.siteActivitiy = {};
    this.subjectMainFrames = new Subject();
    Object.assign(this, DEFAULT_OPTIONS, options);
  }

  init() {
    // observe core:mouse-down events and emit tab information
    const tabClicks = fromEventPattern(
      handler => events.sub('core:mouse-down', handler),
      handler => events.un_sub('core:mouse-down', handler),
      (...args) => {
        const [ev, contextHTML, href, sender] = args;
        return { ev, contextHTML, href, sender };
      }
    ).pipe(map(({ sender }) => sender.tab));

    // generate a mapping of tabId: url for each tab which had a click in it
    // within the last CLICK_TIMEOUT minutes
    this.tabActivitySubscription = objectStreamToMapWithTimeout(
      tabClicks,
      value => value.id,
      value => value.url,
      this.CLICK_TIMEOUT
    ).subscribe((value) => {
      this.clickActivity = value;
    });

    // observe pages loaded for the last VISIT_TIMEOUT ms.
    const pagesOpened = this.subjectMainFrames.pipe(
      observeOn(asyncScheduler),
      map(details => ({ tabId: details.tabId, hostname: details.urlParts.hostname }))
    );

    this.pageOpenedSubscription = objectStreamToMapWithTimeout(
      pagesOpened,
      value => value.hostname,
      value => value.tabId,
      this.VISIT_TIMEOUT
    ).subscribe((value) => {
      this.siteActivitiy = value;
    });
  }

  unload() {
    if (this.tabActivitySubscription) {
      this.tabActivitySubscription.unsubscribe();
    }
    if (this.pageOpenedSubscription) {
      this.pageOpenedSubscription.unsubscribe();
    }
  }

  checkMainFrames(state) {
    if (state.isMainFrame) {
      this.subjectMainFrames.next(state);
    }
  }

  /**
   * Pipeline step to check if this request is part of a OAuth flow. This is done by
   * checking that the following three conditions are met:
   *  - The third-party url path contains '/oauth' or '/authorize'
   *  - The user has recently clicked in the source tab (i.e. the site wanting to authenticate the
   * user)
   *  - The user has recently visited the oauth domain (the authentication provider)
   * @param state
   * @returns false if the request is an oauth request, true otherwise
   */
  checkIsOAuth(state, type) {
    const oAuthUrls = ['/oauth', '/authorize'];
    const mapper = oAuthUrl => state.urlParts.pathname.indexOf(oAuthUrl) > -1;
    const reducer = (accumulator, currentValue) => accumulator || currentValue;
    const isOAuthFlow = oAuthUrls.map(mapper).reduce(reducer);

    if (isOAuthFlow
      && this.clickActivity[state.tabId] && this.siteActivitiy[state.urlParts.hostname]) {
      const clickedPage = parse(this.clickActivity[state.tabId]);
      if (clickedPage !== null && clickedPage.hostname === state.tabUrlParts.hostname) {
        state.incrementStat(`${type}_allow_oauth`);
        return false;
      }
    }
    return true;
  }
}
