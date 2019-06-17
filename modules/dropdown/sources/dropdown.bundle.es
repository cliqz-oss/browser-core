import Handlebars from 'handlebars';
import Spanan from 'spanan';
import helpers from './helpers';
import templates from './templates';
import Dropdown from './dropdown';
import Results from './results';
import createSpananForModule from '../core/helpers/spanan-module-wrapper';
import { PREVENT_AUTOCOMPLETE_KEYS } from '../search/consts';

let contextId = null;
if (chrome.omnibox2) {
  contextId = chrome.omnibox2.getContext();
}

let urlbarAttributes = {};
let currentQuery = '';
let previousResults;

const styleElement = document.createElement('style');
let lastNavbarColor = null;
document.head.appendChild(styleElement);

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

const searchBridge = createSpananForModule('search');
const dropdownBridge = createSpananForModule('dropdown');
const searchModule = searchBridge.createProxy();
const dropdownModule = dropdownBridge.createProxy();

const container$ = document.querySelector('#container');
const dropdown = new Dropdown(container$, window, {
  reportHighlight(...args) {
    searchModule.reportHighlight();
    importedActions.reportHighlight(...args);
  },
  reportHover: (...args) => importedActions.reportHover(...args),
});
dropdown.init();

const updateNavbarColor = (color) => {
  if (!color) {
    styleElement.textContent = '';
    return;
  }
  if (color === lastNavbarColor) {
    return;
  }
  styleElement.textContent = `.history { background-color: ${color}!important }`;
  lastNavbarColor = color;
};

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
  setSearchSession() {
    searchModule.setSearchSession();
  },

  setQueryLastDraw(ts) {
    searchModule.setQueryLastDraw(ts);
  },

  startSearch(query, searchOptions = {}, options = {}) {
    if (options.urlbarAttributes) {
      updateNavbarColor(options.urlbarAttributes.navbarColor);
      urlbarAttributes = options.urlbarAttributes;
    }
    currentQuery = query;
    searchModule.startSearch(query, searchOptions);
  },

  stopSearch({ entryPoint }) {
    searchModule.stopSearch({ entryPoint });
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

  handleEnter({ newTab }) {
    const result = dropdown.selectedResult;
    result.click(result.url, {
      metaKey: newTab,
      type: 'keyup',
    });
  },

  removeFromHistoryAndBookmarks(url) {
    return dropdownModule.removeFromHistory(url, {
      strict: false,
      bookmarks: true,
      closeTabs: true,
    });
  }
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'renderResults'
    || (message.contextId !== contextId && message.contextId !== undefined)) {
    return;
  }

  const response = message.args[0];
  const { query, queriedAt, results: rawResults, assistantStates, meta } = response;
  if (!rawResults[0]
    || (rawResults[0].text !== currentQuery && rawResults[0].suggestion !== currentQuery)) {
    return;
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
    queriedAt,
  }, resultTools);

  previousResults = results;

  const preventAutocomplete = PREVENT_AUTOCOMPLETE_KEYS.includes(meta.keyCode);
  dropdown.renderResults(results, {
    urlbarAttributes,
    extensionId: assistantStates.settings.id,
    channelId: assistantStates.settings.channel,
    preventAutocomplete,
  });

  const height = container$.scrollHeight;
  importedActions.resultsDidRender({
    result: dropdown.selectedResult && dropdown.selectedResult.serialize(),
    height,
    rawResults,
  });
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
