
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

window.CLIQZ = {};

var urlbar = document.getElementById('urlbar');

CLIQZ.Core = {
  urlbar: urlbar,
  popup: document.getElementById('results'),
  refreshButtons: function(){}
}

if(typeof chrome == 'undefined'){
  var chrome = {
    send: function(){
      console.log("CHROME MESSAGE", arguments)
    }
  }
}


System.baseURL = "modules/";

console.log('LOADING ...')

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
      System.import("core/events")
    ])
  }).then(function (modules) {

    window.CLIQZEnvironment = modules[0].default;
    window.Mixer = modules[1].default;
    window.CliqzAutocomplete = modules[2].default;
    window.CliqzEvents = modules[4].default;

    CliqzUtils.System = System;
    CliqzAutocomplete.Mixer = Mixer;
    CLIQZEnvironment.storage = localStorage;

    return System.import("core/startup")
  }).then(function (startupModule) {
    return startupModule.default(window, [
      "autocomplete"
    ]);
  }).then(function () {
    //loading UI still breaks but we need to wait for it to break/load before continuing
    var brokenUIpromise = new Promise(function(resolve, reject){
      System.import("ui/UI").then(resolve).catch(resolve);
    });

    return Promise.all([brokenUIpromise, CliqzUtils.init({
      lang: window.navigator.language || window.navigator.userLanguage
    })]);
  }).then(function () {
    CLIQZ.UI.preinit(CliqzAutocomplete, CliqzHandlebars, CliqzEvents);
    CLIQZ.UI.init(urlbar);
    CLIQZ.UI.main(document.getElementById('results'));
    console.log('magic')
});

function startAutocomplete(query) {
    urlbar.value = query;

    setTimeout(function() {
        (new CliqzAutocomplete.CliqzResults()).search(query, function(r){
            var currentResults = CLIQZ.UI.results({
                q: r._searchString,
                results: r._results.map(function(r){
                    r.type = r.style;
                    r.url = r.val || '';
                    r.title = r.comment || '';

                    return r;
                }),
                isInstant: false,
                isMixed: true
            });
        });
    }, 0);
}

function stopAutocomplete() {
    // TODO: Stop any ongoing queries.
}

urlbar.addEventListener('keyup', function(ev){ setTimeout(startAutocomplete, 0, ev.target.value); } )

function onHistoryReady(query, matches, finished) {
    if (!query || !(matches instanceof Array))
        throw new Error("No query or matches are not an Array");
    var callback = CLIQZEnvironment._pendingHistoryQueries[query];
    if (!callback)
        throw new Error("No callback registered for query: " + query);
    var res = matches.map(function(match) {
        return {
            value:   match.url,
            comment: match.description,
            style:   'favicon',
            image:   '',
            label:   ''
        };
    });
    var callback_obj = {
        query: query,
        results: res,
        ready: true
    };
    try {
        callback(callback_obj);
    }
    finally {
        if (finished)
            delete CLIQZEnvironment._pendingHistoryQueries[query];
    }
}

function moveSelection(to) {
    CLIQZ.UI.selectResultByIndex(to);
}

navigator.geolocation.getCurrentPosition(showPosition);

function showPosition(position) {
	CLIQZEnvironment.USER_LAT = position.coords.latitude;
  CLIQZEnvironment.USER_LNG = position.coords.longitude;
}

