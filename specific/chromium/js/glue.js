
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
      settings = document.getElementById("settings");

CLIQZ.Core = {
  urlbar: urlbar,
  popup: document.getElementById('results'),
  refreshButtons: function(){}
}

System.baseURL = "modules/";

console.log('LOADING ...')

let acResults;

Promise.all([
  System.import("core/utils"),
  System.import("core/templates")
  ])
  .then(function(modules){
    window.CliqzUtils = modules[0].default;
    window.CliqzHandlebars = modules[1].default;
  })
  .then(function(){
    return Promise.all([
      System.import("platform/environment"),
      System.import("autocomplete/mixer"),
      System.import("autocomplete/autocomplete"),
      System.import("ui/background"),
      System.import("core/events"),
      System.import("platform/expansions-provider"),
      System.import("core/config"),
      System.import("geolocation/background")
    ])
  }).then(function (modules) {
    window.CLIQZEnvironment = modules[0].default;
    window.Mixer = modules[1].default;
    window.CliqzAutocomplete = modules[2].default;
    window.CliqzEvents = modules[4].default;


    CliqzUtils.System = System;
    CliqzAutocomplete.Mixer = Mixer;
    CLIQZEnvironment.ExpansionsProvider = modules[5].default;
    CLIQZ.config = modules[6].default;

    // initiaize geolocation window
    CliqzUtils.callAction("geolocation", "updateGeoLocation", []);

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

    CLIQZ.UI.preinit(CliqzAutocomplete, CliqzHandlebars, CliqzEvents);
    CLIQZ.UI.init(urlbar);
    CLIQZ.UI.main(document.getElementById('results'));
    // Initialization of the ExpansionProvider should be after
    // the initialization of the autocomplete otherwise
    // CliqzUtils.getBackendResults gets blindly overwriten
    CLIQZEnvironment.ExpansionsProvider.init();

    // remove keydown handler from UI - the platform will do it
    urlbar.removeEventListener('keydown', CLIQZ.UI.urlbarkeydown)
  }).then(function () {
    acResults = new CliqzAutocomplete.CliqzResults();

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
    chrome.cliqzSearchPrivate.onOmniboxFocusChanged.addListener(
        (winId, focused) => {
          if (winId === currWinId && !focused) {
            CLIQZ.UI.sessionEnd();
            // Close settings section.
            document.getElementById("settings").classList.add("hidden");
          }
        });

    // TODO: Move these to CE inself and introduce module init().
    chrome.cliqzSearchPrivate.getSearchEngines((engines, defIdx) => {
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
    });
    chrome.runtime.getPlatformInfo(v => CLIQZEnvironment.OS = v.os);

    console.log('Glue init complete!');
  });

function startAutocomplete(query) {
  settings.classList.add('hidden');
  urlbar.value = query;
  acResults.search(query, function(r) {
    CLIQZ.UI.setRawResults({
      q: r._searchString,
      results: r._results.map(function(r) {
        r.type = r.style;
        r.url = r.val || '';
        r.title = r.comment || '';
        return r;
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

function createOptionEntries(el, options, prefKey, action){
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

  el.addEventListener("change", function(ev){
    CliqzUtils.setPref(prefKey, ev.target.value);
    action(ev.target.value);
  });
}

function handleSettings(){
  document.getElementById("settingsButton").addEventListener('click', function(){
    this.classList.toggle('active');
    settings.classList.toggle('hidden');

    if(!settings.classList.contains('hidden')){
      createSettingsMenu();
    }
  });

  CLIQZEnvironment.addPrefListener(function(pref){
    // recreate the settings menu if relevant prefs change
    var relevantPrefs = [
      'share_location',
      'adultContentFilter',
    ]
    if(relevantPrefs.indexOf(pref) != -1)
      createSettingsMenu();
  });
}

function createSettingsMenu(){
  createOptionEntries(
    document.getElementById('adult'),
    CliqzUtils.getAdultFilterState(),
    "adultContentFilter"
  );

  createOptionEntries(
    document.getElementById('location'),
    CliqzUtils.getLocationPermState(),
    "share_location",
    function (val) {
      CliqzUtils.callAction(
        "geolocation",
        "setLocationPermission",
        [val.toString()]
      );
    }
  );
}
