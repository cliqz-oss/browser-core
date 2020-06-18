/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Handlebars from 'handlebars';
import Spanan from 'spanan';

import createModuleWrapper from '../core/helpers/action-module-wrapper';
import runtime from '../platform/runtime';

import helpers from './helpers';
import templates from './templates';
import Dropdown from './dropdown';
import Results from './results';

let currentContextId;
if (chrome.omnibox2) {
  currentContextId = chrome.omnibox2.getContext();
}

let currentQueryId = 0;
let previousResults;

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

const postMessage = (message) => {
  const searchParams = new URLSearchParams(window.location.search);
  const isCrossOrigin = searchParams.get('cross-origin') !== null;
  const target = isCrossOrigin ? window.parent : window;
  target.postMessage(message, '*');
};

const spanan = new Spanan(({ action, ...rest }) => {
  postMessage({
    ...rest,
    target: 'cliqz-renderer',
    action,
  });
});
const importedActions = spanan.createProxy();

const searchModule = createModuleWrapper('search');
const dropdownModule = createModuleWrapper('dropdown');

const container$ = document.querySelector('#container');
const dropdown = new Dropdown(container$, window, {
  reportHighlight(...args) {
    searchModule.reportHighlight();
    importedActions.reportHighlight(...args);
  },
  reportHover: (...args) => importedActions.reportHover(...args),
});
dropdown.init();

const updateHeight = () => {
  const height = container$.scrollHeight;
  importedActions.setHeight(height);
};

const rerender = () => {
  dropdown.renderResults(previousResults, { isRerendering: true });
  updateHeight();
};

function createAssistants(assistantStates) {
  // Recreating assistants from state and actions
  const assistants = {};
  Object.keys(assistantStates).forEach((assistantName) => {
    const assistantState = assistantStates[assistantName];
    const assistant = {
      ...assistantState,
    };
    (assistantState.actions || []).forEach(({ actionName }) => {
      assistant[actionName] = (...args) => searchModule[`${assistantName}Action`](actionName, ...args);
    });
    assistants[assistantName] = assistant;
  });
  return assistants;
}

const exportedActions = {
  startSearch(query, searchOptions = {}) {
    currentQueryId = searchOptions.queryId;
    searchModule.startSearch(query, searchOptions);
  },

  stopSearch() {
    searchModule.stopSearch();
  },

  reportSelection(selection) {
    searchModule.reportSelection(selection);
  },

  clear() {
    dropdown.clear();
  },

  nextResult() {
    return dropdown.nextResult().serialize();
  },

  previousResult() {
    return dropdown.previousResult().serialize();
  },

  handleEnter(ev) {
    const result = dropdown.selectedResult;
    result.click(result.url, ev);
  },

  removeFromHistoryAndBookmarks(url) {
    return dropdownModule.removeFromHistory(url, {
      strict: false,
      bookmarks: true,
      closeTabs: true,
    });
  },

  updateUrlbarAttributes(attrs) {
    dropdown.updateUrlbarAttributes(attrs);
  },
};

runtime.onMessage.addListener(({ module, action, args, contextId }) => {
  if (module !== 'dropdown'
    || action !== 'renderResults'
    || (contextId !== undefined && contextId !== currentContextId)
  ) {
    return undefined;
  }

  const response = args[0];
  const { query, queryId, results: rawResults, assistantStates, forceUpdate } = response;
  if (!rawResults[0] || (!forceUpdate && queryId !== currentQueryId)) {
    return undefined;
  }

  const resultTools = {
    assistants: createAssistants(assistantStates),
    actions: {
      rerender,
      updateHeight,
      telemetry: importedActions.telemetry,
      openLink: importedActions.openLink,
      copyToClipboard: importedActions.copyToClipboard,
    },
  };

  const results = new Results({
    query,
    rawResults,
  }, resultTools);

  previousResults = results;

  dropdown.renderResults(results, {
    extensionId: assistantStates.settings.id,
    channelId: assistantStates.settings.channel,
    queryId,
  });

  const height = container$.scrollHeight;
  importedActions.resultsDidRender({
    result: dropdown.selectedResult && dropdown.selectedResult.serialize(),
    queryId,
    forceUpdate,
    height,
    rawResults,
  });

  return undefined;
});

spanan.export(exportedActions, {
  respond(response, request) {
    postMessage({
      type: 'response',
      uuid: request.uuid,
      response,
    });
  },
});

window.addEventListener('focus', () => {
  importedActions.focus();
});

window.addEventListener('message', (ev) => {
  const message = ev.data;

  if (message.type === 'response') {
    spanan.dispatch(message);
    return;
  }

  if (message.target === 'cliqz-dropdown') {
    spanan.handleMessage(message);
  }
});
