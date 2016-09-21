'use strict';
/* global osAPI, math */

import { utils } from 'core/cliqz';
import handlebars from 'core/templates';
import { document, Hammer } from 'mobile-history/webview';

var historyTimer;
var allHistory = [];
var allFavorites = [];

function showHistory(history) {
  clearTimeout(historyTimer);

  allHistory = history;
  const queries = utils.getLocalStorage().getObject('recentQueries', []).reverse();

  history.forEach(item => {
    item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  });

  const historyWithLogos = addLogos(history);
  const data = mixHistoryWithQueries(queries, historyWithLogos);
  History.displayData(data, History.showOnlyFavorite);
}

function showFavorites(favorites) {
  clearTimeout(historyTimer);

  allFavorites = favorites;

  favorites.forEach(item => {
    item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  });

  const favoritesWithLogos = addLogos(favorites);

  History.displayData(favoritesWithLogos, History.showOnlyFavorite);
}

function addLogos(list) {
  return list.map(item => {
    const details = utils.getDetailsFromUrl(item.url);
    item.logo = utils.getLogoDetails(details);
    return item;
  });
}

function sendShowTelemetry(data, type) {
  const queryCount = data.filter(function (item) { return item.query; }).length,
      urlCount = data.filter(function (item) { return item.url; }).length;
  utils.telemetry({
    type,
    action: 'show',
    active_day_count: data.length - queryCount - urlCount,
    query_count: queryCount,
    url_count: urlCount
  });
}


function mixHistoryWithQueries(queries, history) {
  let data = [];
  let hi = 0;
  let qi = 0;
  let date = '';
  while (true) {
    if (hi >= history.length || qi >= queries.length) {
      break;
    }

    if (history[hi].timestamp <= queries[qi].timestamp) {
      if (getDateFromTimestamp(history[hi].timestamp) !== date) {
        data.push({date: getDateFromTimestamp(history[hi].timestamp)});
        date = getDateFromTimestamp(history[hi].timestamp);
      }
      data.push(history[hi]);

      hi++;
    } else {
      if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
        data.push({date: getDateFromTimestamp(queries[qi].timestamp)});
        date = getDateFromTimestamp(queries[qi].timestamp);
      }
      data.push(queries[qi]);
      qi++;
    }
  }
  while (hi < history.length) {
    if (getDateFromTimestamp(history[hi].timestamp) !== date) {
      data.push({date: getDateFromTimestamp(history[hi].timestamp)});
      date = getDateFromTimestamp(history[hi].timestamp);
    }
    data.push(history[hi]);
    hi++;
  }
  while (qi < queries.length) {
    if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
      data.push({date: getDateFromTimestamp(queries[qi].timestamp)});
      date = getDateFromTimestamp(queries[qi].timestamp);
    }
    data.push(queries[qi]);
    qi++;
  }

  return data;
}

function displayData(data, isFavorite = false) {
  if (!handlebars.tplCache['conversations']) {
    return setTimeout(History.displayData, 100, data);
  }

  const template = isFavorite ? 'favorites' : 'conversations';
  document.body.innerHTML = handlebars.tplCache[template]({data: data});

  const B = document.body,
      H = document.documentElement;

  let height;

  if (typeof document.height !== 'undefined') {
      height = document.height; // For webkit browsers
  } else {
      height = Math.max( B.scrollHeight, B.offsetHeight,H.clientHeight, H.scrollHeight, H.offsetHeight );
  }

  document.body.scrollTop = height + 100;

  attachListeners(document.getElementById('container'));

  const type = isFavorite ? 'favorites' : 'history';
  History.sendShowTelemetry(data, type);
}

function getDateFromTimestamp(time) {
    const d = new Date(time);

    let days = d.getDate();
    days = days > 9 ? days : '0' + days;

    let months = d.getMonth()+1;
    months = months > 9 ? months : '0' + months;

    const year = d.getFullYear();

    const formatedDate = days + '.' + months + '.' + year;
    return formatedDate;
}
function removeQuery(id) {
  let queries = utils.getLocalStorage().getObject('recentQueries', []);

  queries = queries.filter(query => id !== query.id);
  utils.getLocalStorage().setObject('recentQueries', queries);
}

function removeHistoryItem(id) {
  allHistory = allHistory.filter(history => id !== history.id);
  osAPI.removeHistoryItems([id]);
}

function removeItem(item) {
  const id = parseInt(item.dataset.id);
  item.getAttribute('class').indexOf('question') >= 0 ? removeQuery(id) : removeHistoryItem(id);
}

function unfavoriteItem(item) {
  const url = item.dataset.ref;
  const title = item.dataset.title;
  osAPI.setFavorites([{title, url}], false);
}

function init(onlyFavorites) {
  migrateQueries();
  History.showOnlyFavorite = onlyFavorites;
  update();
}

function update() {
  const callback = History.showOnlyFavorite ? showFavorites : showHistory;
  historyTimer = setTimeout(callback, 500, []);
  History.showOnlyFavorite ? osAPI.getFavorites('History.showFavorites') : osAPI.getHistoryItems('History.showHistory');
}

function clearHistory() {
  utils.getLocalStorage().setObject('recentQueries', []);
}

function clearFavorites() {
  utils.getLocalStorage().setObject('favoriteQueries', []);
}

function onElementClick(event) {
  const element = event.srcEvent.currentTarget;
  const type = element.getAttribute('class');
  const clickAction = type.indexOf('question') >= 0 ? osAPI.notifyQuery : osAPI.openLink;
  clickAction(element.dataset.ref);
  sendClickTelemetry(element);
}

function sendClickTelemetry(element) {
  const targeType = element.className.indexOf('question') >= 0 ? 'query' : 'url';
    utils.telemetry({
      type: History.showOnlyFavorite ? 'favorites' : 'history',
      action: 'click',
      target_type: targeType,
      target_index: parseInt(element.dataset.index),
      target_length: element.dataset.ref.length,
      target_ts: parseInt(element.dataset.timestamp)
    });
}

function crossTransform (element, x) {
  var platforms = ['', '-webkit-', '-ms-'];
  platforms.forEach(function (platform) {
    element.style[platform + 'transform'] = 'translate3d('+ x +'px, 0px, 0px)';
  });
}

function isElementDate(element) {
  return !element.dataset.timestamp
}

function attachListeners(list) {
  var listItems = list.getElementsByTagName("li");

  for (let i = 0; i < listItems.length; i++) {
    if(!isElementDate(listItems[i])) {
      new Hammer(listItems[i]).on('pan', onSwipe);
      new Hammer(listItems[i]).on('panend', onSwipeEnd);
      new Hammer(listItems[i]).on('tap', onElementClick);
    }
  }
}

function removeDomElement(element) {
  const prev = element.previousElementSibling;
  const next = element.nextElementSibling;
  if (prev && isElementDate(prev)) {
    if (!next || isElementDate(next)) {
      element.parentElement.removeChild(prev);
    }
  }
  element.parentElement.removeChild(element);
}

function onSwipe(e) {
  crossTransform(e.srcEvent.currentTarget, e.deltaX);
}
function onSwipeEnd(e) {
  const element = e.srcEvent.currentTarget;
  if (math.abs(e.velocityX) < -1 || math.abs(e.deltaX) > 150) {
    History.showOnlyFavorite ? unfavoriteItem(element) : removeItem(element);
    removeDomElement(element);
  } else {
    crossTransform(element, 0);
  }
}


/**
  This function is for migration of history and favorite queries
  to extension version Mobile Extension 3.5.2
**/
function migrateQueries() {
  if (utils.getLocalStorage().getItem('isFavoritesRefactored')) {
    return;
  }
  let queries = utils.getLocalStorage().getObject('recentQueries', []);
  let favoriteQueries = utils.getLocalStorage().getObject('favoriteQueries', []);
  queries = queries.map(query => {
    if (query.favorite) {
      favoriteQueries.unshift({query: query.query, timestamp: query.timestamp});
    }
    delete query.favorite;
    return query;
  });
  utils.getLocalStorage().setObject('recentQueries', queries);
  utils.getLocalStorage().setObject('favoriteQueries', favoriteQueries);
  utils.getLocalStorage().setItem('isFavoritesRefactored', true);
}


var History = {
  init,
  update,
  showHistory,
  showFavorites,
  clearHistory,
  clearFavorites,
  displayData,
  sendShowTelemetry,
  showOnlyFavorite: false
};

export default History;