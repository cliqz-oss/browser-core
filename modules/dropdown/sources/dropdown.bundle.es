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

const spanan = new Spanan(({ action, ...rest }) => {
  window.postMessage({
    ...rest,
    target: 'cliqz-renderer',
    action,
  }, '*');
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
  dropdown.renderResults(previousResults);
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
    };
  },

  previousResult() {
    const result = dropdown.previousResult();
    return {
      url: result.url,
      urlbarValue: result.urlbarValue,
      completion: result.meta.completion,
      query: result.query,
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
    navbarColor,
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

    // on Firefox 60 there is some wierd optiomization that results in reversed
    // the order of the runloop when innerHTML is called. This happens only for
    // first batch of renders. having nextTick here, makes the problem go away
    await new Promise(resolve => window.setTimeout(resolve), 0);

    const results = new Results({
      query,
      rawResults,
      queriedAt,
    }, resultTools);

    previousResults = results;

    updateNavbarColor(navbarColor);
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
    window.postMessage({
      type: 'response',
      uuid: request.uuid,
      response,
    }, '*');
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
