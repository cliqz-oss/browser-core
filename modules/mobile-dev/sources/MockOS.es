var MockOS = {
  postMessage: function(message) {
    CliqzUtils.log(message, 'Mock');
    var dataBack;
    switch (message.action) {
      case "searchHistory":
        dataBack = searchHistory(message.data);
        break;
      case "isReady":
        dataBack = isReady();
        break;
      case "openLink":
        openLink(message.data);
        break;
      case "browserAction":
        browserAction(message.data);
        break;
      case "getTopSites":
        dataBack = getTopSites(message.data);
        break;
      case "autocomplete":
        autocomplete(message.data);
        break;
      case "notifyQuery":
        notifyQuery(message.data);
        break;
      case "pushTelemetry":
        pushTelemetry(message.data);
        break;
      case "copyResult":
        copyResult(message.data);
        break;
      case "removeHistory":
        removeHistory(message.data);
        break;
      case "setHistoryFavorite":
        setHistoryFavorite(message.data);
        break;
      case "shareCard":
        shareCard(message.data);
        break;

    }
    clbk(message.callback, dataBack, window.self !== window.top);
  }
}

var mockedHistory = [];

function clbk(f, args, test){
  if(test && !window.sinonLoaded){
    console.log('in test');
    setTimeout(clbk, 100, f, args, test);
  } else {
    f && eval(f + "(" + JSON.stringify(args) + ")");
  }
};
function searchHistory(q) {
  return {results:mockedHistory, query:q};

};
function isReady() {
  CLIQZ.UI && jsAPI.setDefaultSearchEngine({name: "google", url: "http://www.google.com/search?q="});
  jsAPI.setClientPreferences({
    incognito: false,
    showConsoleLogs: true
  });
  return -1;
};
function openLink(url) {
  var id = parseInt(6 + 100 * Math.random());
  mockedHistory.unshift({
          "id": id,
          "title": "History item " + id,
          "mainDomain": url,
          "url": url,
          "timestamp": Date.now(),
          "favorite": false
      })
};
function getTopSites(limit) {
  return mockedHistory;
};
function browserAction(data) {};
function autocomplete(data) {};
function notifyQuery(data) {};
function pushTelemetry(data) {};
function copyResult(data) {};
function removeHistory(data) {
  if(data.length == 0 || mockedHistory.length === 0) {
    return;
  }

  var index = 0;
  mockedHistory = mockedHistory.filter(function(record) {
    return index >= data.length || data[index] !== record.id || (index++ && false);
  });
};
function setHistoryFavorite(data) {

  var index = 0;
  mockedHistory.forEach(function(record) {
    if(index >= data.ids) {
      return;
    } else if(data.ids[index] === record.id) {
      record.favorite = data.value;
      index++;
    }
  });
};
function shareCard(data) {
}

export default MockOS;
