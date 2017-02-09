
"use strict"

window.XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
};

window.Services = {
  scriptloader: {
    loadSubScript: function(){}
  }
};

window.Components = {
  interfaces: {
    nsIAutoCompleteResult: {}
  },
  utils: {
    import: function(){}
  },
  ID: function(){}
};

window.XULBrowserWindow = {
  updateStatusField: function(){},
  setOverLink: function(){}
}

//TODO: remove lines from above

window.CLIQZ = {};

let currWinId = undefined;
chrome.windows.getCurrent(null, (win) => { currWinId = win.id; });

const urlbar = document.getElementById('urlbar'),
      settingsContainer = document.getElementById("settings-container"),
      settings = document.getElementById("settings");

CLIQZ.Core = {
  urlbar: urlbar,
  popup: document.getElementById('results'),
  refreshButtons: function(){}
}
CLIQZ.Core.popup.closePopup = function(){};

System.baseURL = "modules/";
System.config({
  defaultJSExtensions: true,
  map: {
    'math': "../bower_components/mathjs/dist/math.min.js"
  }
})

console.log('LOADING ...')

let SEARCH;
System.set('handlebars', System.newModule({default: Handlebars}));
Promise.all([
  System.import("core/cliqz"),
  System.import("core/templates"),
  ])
  .then(function(modules){
    window.CliqzHandlebars = System.get(System.normalizeSync('handlebars')).default;
    window.CliqzUtils = System.get(System.normalizeSync("core/utils")).default;

  })
  .then(function(){
    return Promise.all([
      System.import("platform/environment"),
      System.import("autocomplete/mixer"),
      System.import("autocomplete/autocomplete"),
      System.import("autocomplete/result-providers"),
      System.import("core/events"),
      System.import("ui/background"),
      System.import("expansions-provider/expansions-provider"),
      System.import("core/config"),
      System.import("geolocation/background"),
      System.import("autocomplete/search"),
      System.import("platform/load-logo-db"),
    ])
  }).then(function (modules) {
    window.CLIQZEnvironment = modules[0].default;
    window.Mixer = modules[1].default;
    window.CliqzAutocomplete = modules[2].default;
    window.ResultProviders = modules[3].default;
    window.CliqzEvents = modules[4].default;
    CLIQZ.config = modules[7].default;
    window.geolocation = modules[8].default;
    window.Search = modules[9].default;
    modules[10].default().then(CliqzUtils.setLogoDb);


    CliqzUtils.System = System;
    CliqzAutocomplete.Mixer = Mixer;
    CLIQZEnvironment.ExpansionsProvider = modules[5].default;


    // initiaize geolocation window
    const geolocation = modules[8].default;
    geolocation.actions.updateGeoLocation();

    return System.import("core/startup")
  }).then(function (startupModule) {
    return startupModule.default(window, [
      "autocomplete"
    ]);
  }).then(function () {
    // Loading UI still breaks but we need to wait for it to break/load before
    // continuing.
    let brokenUIpromise = new Promise(function(resolve, reject){
      System.import("ui/UI").then(resolve).catch(resolve);
    });

    return Promise.all([brokenUIpromise, CliqzUtils.init({
      lang: chrome.i18n.getUILanguage() ||
            window.navigator.language ||
            window.navigator.userLanguage
    })]);
  }).then(function () {
    // localize
    CliqzUtils.localizeDoc(document);

    CLIQZ.UI.preinit(CliqzAutocomplete, window.CliqzHandlebars, CliqzEvents);
    CLIQZ.UI.init(urlbar);
    CLIQZ.UI.main(document.getElementById('results'));
    // Initialization of the ExpansionProvider should be after
    // the initialization of the autocomplete otherwise
    // CliqzUtils.getBackendResults gets blindly overwriten
    CLIQZEnvironment.ExpansionsProvider.init();

    // remove keydown handler from UI - the platform will do it
    urlbar.removeEventListener('keydown', CLIQZ.UI.urlbarkeydown)
  }).then(function () {
    SEARCH = new Search();

    handleSettings();
    whoAmI(true);

    chrome.cliqzSearchPrivate.onInputChanged.addListener(
        (winId, query) => {
          if (winId === currWinId)
            startAutocomplete(query);
        });
    chrome.cliqzSearchPrivate.onAutocompleteStopped.addListener(
        (winId) => {
          if (winId === currWinId) {
            // TODO: Stop any ongoing queries.
          }
        });
    chrome.cliqzSearchPrivate.onSelectionMoved.addListener(
        (winId, toIndex) => {
          if (winId === currWinId)
            CLIQZ.UI.selectResultByIndex(toIndex);
        });

    var isUrlbarFocused = false;
    chrome.cliqzSearchPrivate.onOmniboxFocusChanged.addListener(
        (winId, focused) => {
          if (winId === currWinId) {
            if (!focused) { //blur
              CLIQZ.UI.sessionEnd();
              urlbarEvent('blur');
              // Close settings section.
              settingsContainer.classList.remove("open");
            }
            else { //focus
              CliqzAutocomplete.lastFocusTime = Date.now();
              CliqzUtils.setSearchSession(CliqzUtils.rand(32));
              urlbarEvent('focus');
              isUrlbarFocused = true;
            }
          }
        });
    chrome.cliqzSearchPrivate.onMatchAccepted.addListener(
        (winId, inputSize, autocompleted, position, isSearch, destURL) => {
          if (winId !== currWinId)
            return;
          const details = {
              action: "result_enter",
              autocompleted: autocompleted,
              urlbar_time: CliqzAutocomplete.lastFocusTime ?
                  (new Date()).getTime() - CliqzAutocomplete.lastFocusTime :
                  null,
              position_type: [isSearch ? 'inbar_query' : 'inbar_url'],
              source: CLIQZ.UI.getResultKind(CLIQZ.UI.getResultSelection()),
              current_position: position,
              new_tab: false // TODO: Pass whether it's opened in a new tab.
            };
          if (autocompleted) {
            details.autocompleted_length = destURL.length;
          }
          const element = (position >= 0) ?
              CLIQZ.UI.keyboardSelection : {url: destURL};
          CLIQZ.UI.logUIEvent(
              element,
              "autocomplete",
              details
          );
        });
    // TODO: Move these to CE inself and introduce module init().
    chrome.cliqzSearchPrivate.getSearchEngines(updateSearchEngines);
    chrome.cliqzSearchPrivate.onSearchEnginesChanged.addListener(
        updateSearchEngines);
    chrome.runtime.getPlatformInfo(v => CLIQZEnvironment.OS = v.os);


    //TODO - make this more generic -> do not copy events from UI/window.js
    function urlbarEvent(ev) {
      var action = {
        type: 'activity',
        action: 'urlbar_' + ev
      };

      CliqzEvents.pub('core:urlbar_' + ev);
      CliqzUtils.telemetry(action);
    }

    chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {
      console.log("Tab created", arguments);

      if (isUrlbarFocused){
        // we try here to mimic what happens on Firefox
        // blur first
        urlbarEvent('blur');
        CLIQZ.UI.sessionEnd();
      }

      // focus after
      CliqzAutocomplete.lastFocusTime = Date.now();
      CliqzUtils.setSearchSession(CliqzUtils.rand(32));
      urlbarEvent('focus');
    });

    console.log('Glue init complete!');
  });

function updateSearchEngines(engines, defIdx) {
  function renameProps(obj, mapping) {
    for (let p of Object.keys(mapping)) {
      obj[mapping[p]] = obj[p];
      delete obj[p];
    }
  }

  const enginePropMapping = {
    "keyword"         : "alias",
    "faviconUrl"      : "icon",
    "id"              : "code",
    "searchUrl"       : "searchForm",
    "suggestionsUrl"  : "suggestionUrl"
  };

  for (let engine of engines) {
    renameProps(engine, enginePropMapping);
  }
  engines[defIdx].default = true;

  CLIQZEnvironment._ENGINES = engines;
}

function startAutocomplete(query) {
  settings.classList.remove("open");
  urlbar.value = query;
  SEARCH.search(query, function(r, i) {
    CLIQZ.UI.setRawResults({
      q: r._searchString,
      results: r._results.map(function(r) {
        return {
          type: r.style,
          text: r.query,
          url: r.val || '',
          title: r.comment || '',
          data: r.data,
          maxNumberOfSlots: (i == 0 ? 3 : 1 )
        }
      }),
      isInstant: false,
      isMixed: true
    });

    CLIQZ.UI.render();
  });
}

// For debugging only
urlbar.addEventListener('keyup', function(ev){
  setTimeout(startAutocomplete, 0, ev.target.value);
});

// Debugging stubs for running outside of chromium extension context.
function declareStubs(props, context) {
  function makePrintCall(pn) {
    return function() {
      console.log(pn + ": " + Array.prototype.slice.call(arguments));
    }
  }

  for (let propName in props) {
    let prop = props[propName];
    if (typeof prop === "object") {
      let stub = {}
      declareStubs(prop, context[propName] || stub);
      if (!(propName in context))
        context[propName] = stub;
    }
    else if (!(propName in context)) {
      context[propName] = makePrintCall(propName);
    }
  }
}

const stubs = {
  chrome: {
    windows: {
      getCurrent: 0
    },
    cliqzSearchPrivate: {
      queryHistory: 0,
      processResults: 0,
      onInputChanged: {
        addListener: 0
      },
      onAutocompleteStopped: {
        addListener: 0
      },
      onSelectionMoved: {
        addListener: 0
      },
      onOmniboxFocusChanged: {
        addListener: 0
      },
      getSearchEngines: 0,
      onSearchEnginesChanged: {
        addListener: 0
      },
      onMatchAccepted: {
        addListener: 0
      }
    }
  }
};
declareStubs(stubs, this);

function whoAmI(startup){
  let onInstall = checkSession();

  // schedule another signal
  setTimeout(whoAmI, 60 * 60 * 1e3 /* one hour */, false);

  //executed after the services are fetched
  CliqzUtils.fetchAndStoreConfig(function(){
    sendEnvironmentalSignal(startup);
  });
}

function sendEnvironmentalSignal(startup){
  let hostVersion = '';
  try {
    hostVersion = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
  } catch(e){}

  const info = {
      type: 'environment',
      agent: navigator.userAgent,
      language: navigator.language,
      width: window.innerWidth,
      height: window.innerHeight,
      version: '4.8.0', // TODO
      startup: !!startup,
      version_host: hostVersion,
      version_dist: ''
  };

  // try to enrich the environment signal with
  // all the config parameters stored in localStorage
  try {
    Object.keys(localStorage)
      .filter(function(key){
        // consider only items which start with 'config_'
        // they are populated by CliqzUtils.fetchAndStoreConfig
        return key && key.indexOf('config_') == 0;
      })
      .forEach(function(key){
        info[key] = localStorage.getItem(key);
      });
  } catch(e) {}

  CliqzUtils.telemetry(info);
}

function checkSession() {
  if (CliqzUtils.hasPref('session'))
    return true;  // Session is already present.

  const newSession = CLIQZEnvironment.isPrivate() ?
      ["PRIVATE", "15000", CLIQZ.config.settings.channel].join("|") :
      generateSession(CLIQZ.config.settings.channel);
  CliqzUtils.setPref('session', newSession)
  return false;
}

function generateSession(source){
  return CliqzUtils.rand(18) + CliqzUtils.rand(6, '0123456789')
         + '|' +
         CliqzUtils.getDay()
         + '|' +
         (source || 'NONE');
}

// Settings

function handleSettings() {
  document.getElementById("settingsButton").addEventListener('click', function(){
    settingsContainer.classList.toggle('open');
    if (settingsContainer.classList.contains('open')) {
      updatePrefControls();
    }
  });

  const locationSelector = document.getElementById('location');
  locationSelector.addEventListener("change", function(ev) {
    CliqzUtils.setPref("share_location", ev.target.value);
    CliqzUtils.callAction(
        "geolocation",
        "setLocationPermission",
        [ev.target.value.toString()]
    );
  });

  const adultSelector = document.getElementById('adult');
  adultSelector.addEventListener("change", function(ev) {
    CliqzUtils.setPref("adultContentFilter", ev.target.value);
  });

  CliqzEvents.sub('prefchange', function(pref){
    // recreate the settings menu if relevant prefs change
    var relevantPrefs = [
      'share_location',
      'adultContentFilter',
    ]
    if(relevantPrefs.indexOf(pref) != -1)
      updatePrefControls();
  });
}

function updatePrefControls() {
  function createOptionEntries(el, options) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }

    for(let id in options){
      let option = document.createElement('option');
      option.value = id;
      option.textContent = options[id].name;
      option.selected = options[id].selected;
      el.appendChild(option);
    }
  }

  createOptionEntries(
      document.getElementById('adult'),
      CliqzUtils.getAdultFilterState());

  createOptionEntries(
      document.getElementById('location'),
      CliqzUtils.getLocationPermState());
}
