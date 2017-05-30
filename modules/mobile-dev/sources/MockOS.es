/* eslint no-eval: off */

import utils from '../core/utils';
import events from '../core/events';

const mockedFavorites = []; // JSON.parse('[{\"title\":\"T-Online Navigationshilfe\",\"timestamp\":1465203184868,\"url\":\"http://navigationshilfe1.t-online.de/dnserror?url=http://goo.om/\"},{\"title\":\"HELLO! Online: celebrity & royal news, magazine, babies, weddings, style\",\"timestamp\":1465203192872,\"url\":\"http://www.hellomagazine.com/\"}]').reverse();
let mockedHistory = []; // JSON.parse('[{\"title\":\"HELLO! Online: celebrity & royal news, magazine, babies, weddings, style\",\"timestamp\":1465203194431.158,\"id\":3,\"favorite\":false,\"url\":\"http://www.hellomagazine.com/\"},{\"title\":\"T-Online Navigationshilfe\",\"timestamp\":1465203182810.896,\"id\":2,\"favorite\":false,\"url\":\"http://navigationshilfe1.t-online.de/dnserror?url=http://goo.om/\"},{\"title\":\"Spekulationen um Rückzug: Gauck kündigt Erklärung für 12 Uhr an - SPIEGEL ONLINE - Nachrichten - Politik\",\"timestamp\":1465203157183.131,\"id\":1,\"favorite\":false,\"url\":\"http://m.spiegel.de/politik/deutschland/a-1096014.html#spRedirectedFrom=www&referrrer=\"}]').reverse();
function clbk(f, args, test) {
  if (test && !window.sinonLoaded) {
    setTimeout(clbk, 100, f, args, test);
  } else if (f) {
    eval(`${f} ( ${JSON.stringify(args)} )`);
  }
}
function searchHistory(q) {
  return { results: mockedHistory, query: q };
}
function getHistoryItems() {
  return mockedHistory;
}
function getFavorites() {
  return mockedFavorites;
}
function freshtabReady() {
  events.pub('mobile-browser:restore-blocked-topsites');
}
function isReady() {
  events.pub('mobile-browser:set-search-engine', { name: 'google', url: 'http://www.google.com/search?q=' });
  events.pub('mobile-browser:notify-preferences', {
    incognito: false,
    showConsoleLogs: true,
    suggestionsEnabled: true,
  });
  events.pub('mobile-browser:urlbar-focus');
  // notify tests
  if (window.parent !== window) {
    window.parent.postMessage('cliqz-ready', '*');
  }
}
function openLink(url) {
  const id = parseInt(6 + (100 * Math.random()), 10);
  mockedHistory.unshift({
    id,
    title: url,
    mainDomain: url,
    url,
    timestamp: Date.now(),
  });
}
function getTopSites() {
  return mockedHistory;
}
function browserAction() {
}
function autocomplete() {}
function showQuerySuggestions() {}
function notifyQuery() {}
function pushTelemetry() {}
function copyResult() {}
function removeHistoryItems(data) {
  if (!data.length || mockedHistory.length === 0) {
    return;
  }
  mockedHistory = mockedHistory.filter(record => data.indexOf(record.id) === -1);
}
function setFavorites(data) {
  data.favorites.forEach((item) => {
    for (let i = 0; i < mockedFavorites.length; i++) {
      if (item.url === mockedFavorites[i].url) {
        mockedFavorites.splice(i, 1);
        break;
      }
    }
    if (data.value) {
      mockedFavorites.push({ url: item.url, timestamp: item.timestamp, title: item.title });
    }
  });
}
function shareCard() {}
function shareLocation() {
  jsAPI.search(CliqzAutocomplete.lastSearch, true, 48.1517832, 11.6200855);
}

const MockOS = {
  postMessage(message) {
    let dataBack;
    utils.log(message, 'Mock');
    switch (message.action) {
      case 'searchHistory':
        dataBack = searchHistory(message.data);
        break;
      case 'getHistoryItems':
        dataBack = getHistoryItems(message.data);
        break;
      case 'getFavorites':
        dataBack = getFavorites(message.data);
        break;
      case 'isReady':
        dataBack = isReady();
        break;
      case 'openLink':
        openLink(message.data);
        break;
      case 'browserAction':
        browserAction(message.data);
        break;
      case 'getTopSites':
        dataBack = getTopSites(message.data);
        break;
      case 'autocomplete':
        autocomplete(message.data);
        break;
      case 'notifyQuery':
        notifyQuery(message.data);
        break;
      case 'pushTelemetry':
        pushTelemetry(message.data);
        break;
      case 'copyResult':
        copyResult(message.data);
        break;
      case 'removeHistoryItems':
        removeHistoryItems(message.data);
        break;
      case 'setFavorites':
        setFavorites(message.data);
        break;
      case 'shareCard':
        shareCard(message.data);
        break;
      case 'shareLocation':
        shareLocation();
        break;
      case 'showQuerySuggestions':
        showQuerySuggestions();
        break;
      default:
        break;

    }
    if(message.callback)
      clbk(message.callback, dataBack, window.self !== window.top);
  },
};


export default MockOS;
