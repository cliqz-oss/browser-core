import Handlebars from 'handlebars';
import Spanan from 'spanan';
import helpers from './helpers';
import templates from './templates';
import Dropdown from './dropdown';
import Results from './results';

const stylesheet = document.createElement('link');
stylesheet.setAttribute('rel', 'stylesheet');
stylesheet.setAttribute('href', `./styles/styles.css?r=${Date.now()}`);
document.head.appendChild(stylesheet);

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

const container$ = document.querySelector('#container');
const dropdown = new Dropdown(container$, window, importedActions);
dropdown.init();

let previousResults;
let maximumHeight;

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

const adjustScroll = (height) => {
  if (height > maximumHeight) {
    window.document.body.style.overflowY = 'auto';
  } else {
    window.document.body.style.overflowY = 'hidden';
  }
};

const updateHeight = () => {
  const height = container$.scrollHeight;
  adjustScroll(height);
  importedActions.setHeight(height);
};

const rerender = () => {
  dropdown.renderResults(previousResults, { isRerendering: true });
  updateHeight();
};

const exportedActions = {
  clear() {
    dropdown.clear();
  },

  nextResult() {
    const result = dropdown.nextResult();
    return {
      url: result.url,
      urlbarValue: result.urlbarValue,
      completion: result.meta.completion,
      query: result.query,
      isDeletable: result.isDeletable,
      historyUrl: result.historyUrl,
    };
  },

  previousResult() {
    const result = dropdown.previousResult();
    return {
      url: result.url,
      urlbarValue: result.urlbarValue,
      completion: result.meta.completion,
      query: result.query,
      isDeletable: result.isDeletable,
      historyUrl: result.historyUrl,
    };
  },

  handleEnter({ newTab }) {
    const result = dropdown.selectedResult;
    result.click(result.url, {
      metaKey: newTab,
      type: 'keyup',
    });
  },

  async render({
    rawResults,
    query,
    queriedAt,
    sessionId,
  }, {
    assistantStates,
    urlbarAttributes,
    maxHeight,
  } = {}) {
    maximumHeight = maxHeight;

    // Recreating assistants from state and actions
    const assistants = {};
    Object.keys(assistantStates).forEach((assistantName) => {
      const assistantState = assistantStates[assistantName];
      const assistant = {
        ...assistantState,
      };
      (assistantState.actions || []).forEach(({ actionName }) => {
        assistant[actionName] = (...args) => importedActions[`${assistantName}Action`](actionName, ...args);
      });
      assistants[assistantName] = assistant;
    });

    const resultTools = {
      assistants,
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

    updateNavbarColor(urlbarAttributes.navbarColor);
    dropdown.renderResults(results, {
      urlbarAttributes,
      extensionId: assistantStates.settings.id,
      channelId: assistantStates.settings.channel,
    });

    const height = container$.scrollHeight;

    adjustScroll(height);

    return {
      result: dropdown.selectedResult && dropdown.selectedResult.serialize(),
      height,
      renderedSessionId: sessionId,
    };
  }
};

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
