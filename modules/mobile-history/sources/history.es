'use strict';
/* global osAPI, math */

import utils from 'core/utils';
import { document, Hammer } from 'mobile-history/webview';
import Storage from "core/storage";

const storage = new Storage();

let allHistory = [];
let allFavorites = [];

function showHistory(history) {
  if (!utils.BRANDS_DATABASE.buttons) {
    return setTimeout(History.showHistory, 50, history);
  }

  allHistory = history;
  const queries = storage.getObject('recentQueries', []).reverse();

  history.forEach(item => {
    item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  });

  const historyWithLogos = addLogos(history);
  const data = mixHistoryWithQueries(queries, historyWithLogos);
  History.displayData(data, History.showOnlyFavorite);
}

function showFavorites(favorites) {
  if (!utils.BRANDS_DATABASE.buttons) {
    return setTimeout(History.showFavorites, 50, favorites);
  }

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

  const template = isFavorite ? 'favorites' : 'conversations';
  document.body.innerHTML = CLIQZ.templates[template]({data: data});

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
  let queries = storage.getObject('recentQueries', []);

  queries = queries.filter(query => id !== query.id);
  storage.setObject('recentQueries', queries);
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
  History.showOnlyFavorite ? osAPI.getFavorites('History.showFavorites') : osAPI.getHistoryItems('History.showHistory');
}

function clearHistory() {
  storage.setObject('recentQueries', []);
}

function clearFavorites() {
  storage.setObject('favoriteQueries', []);
}

function onElementClick(event) {
  const element = getElement(event.target);
  const tab = History.showOnlyFavorite ? 'favorites' : 'history';
  const targetType = element.getAttribute('class');
  if (targetType.indexOf('question') >= 0) {
    osAPI.notifyQuery(element.dataset.ref);
    sendClickTelemetry(event.target, 'query', tab);
  } else {
    osAPI.openLink(element.dataset.ref);
    sendClickTelemetry(event.target, 'site', tab);
  }

}

function getElement(el) {
  if (!el || el.tagName === 'LI') {
    return el;
  }
  return getElement(el.parentElement);
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
      const hammer = new Hammer(listItems[i]);
      hammer.on('panstart', onSwipeStart);
      hammer.on('pan', onSwipe);
      hammer.on('panend', onSwipeEnd);
      hammer.on('tap', onElementClick);
    }
  }
}
let moving = false;
function onSwipeStart(ev) {
  moving = false;
  var angle = Math.abs(ev.angle);
  if (angle > 30 && angle < 150) {
    return;
  }
  moving = true;
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
  if (!moving) {
    return;
  }
  crossTransform(getElement(e.target), e.deltaX);
}
function onSwipeEnd(e) {
  if (!moving) {
    return;
  }
  moving = false;
  const element = getElement(e.target);
  const tab = History.showOnlyFavorite ? 'favorites' : 'history';
  const targetType = element.getAttribute('class').indexOf('question') >= 0 ? 'query' : 'site';
  const direction = e.direction === 4 ? 'right' : 'left';
  if (math.abs(e.velocityX) < -1 || math.abs(e.deltaX) > 150) {
    History.showOnlyFavorite ? unfavoriteItem(element) : removeItem(element);
    removeDomElement(element);
    sendSwipeTelemetry(targetType, tab, direction);
  } else {
    crossTransform(element, 0);
  }
}

function sendClickTelemetry(element, targetType, tab) {
    utils.telemetry({
      type: tab,
      action: 'click',
      target: targetType,
      element: element.dataset.name
    });
}

function sendSwipeTelemetry(targetType, tab, direction) {
  utils.telemetry({
    type: tab,
    action: `swipe_${direction}`,
    target: targetType
  });
}


/**
  This function is for migration of history and favorite queries
  to extension version Mobile Extension 3.5.2
**/
function migrateQueries() {
  if (storage.getItem('isFavoritesRefactored')) {
    return;
  }
  let queries = storage.getObject('recentQueries', []);
  let favoriteQueries = storage.getObject('favoriteQueries', []);
  queries = queries.map(query => {
    if (query.favorite) {
      favoriteQueries.unshift({query: query.query, timestamp: query.timestamp});
    }
    delete query.favorite;
    return query;
  });
  storage.setObject('recentQueries', queries);
  storage.setObject('favoriteQueries', favoriteQueries);
  storage.setItem('isFavoritesRefactored', true);
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
