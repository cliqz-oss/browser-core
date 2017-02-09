'use strict';
/* global osAPI, math */

import utils from 'core/utils';
import window from "platform/window";
import Storage from "core/storage";

const storage = new Storage();
let allHistory = [];
let allFavorites = [];
let lastQueryIndex = 0, isAllHistory = false;
let pageCount = 0;
let showOnlyFavorite = false;
let loadStartTime = 0;

function showHistory(history = []) {

  const queries = storage.getObject('recentQueries', []);

  history.forEach(item => {
    item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  });

  const historyWithLogos = addLogos(history);
  isAllHistory = history.length < History.RECORD_LIMIT;
  allHistory = allHistory.concat(history);

  const data = mixHistoryWithQueries(queries, historyWithLogos);
  History.displayData(data, showOnlyFavorite);
}

function showFavorites(favorites) {

  allFavorites = favorites;

  favorites.forEach(item => {
    item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  });

  const favoritesWithLogos = addLogos(favorites);

  History.displayData(favoritesWithLogos, showOnlyFavorite);
}

function addLogos(list) {
  return list.map(item => {
    const details = utils.getDetailsFromUrl(item.url);
    item.logo = utils.getLogoDetails(details);
    return item;
  });
}

function sendLoadTelemetry(data) {
  const type = showOnlyFavorite ? 'favorites' : 'history';
  const loadDuration = Date.now() - loadStartTime;

  const signal = {
    type,
    action: 'load',
    load_duration: loadDuration,
    url_count: showOnlyFavorite ? allFavorites.length : allHistory.length,
  }

  if (!showOnlyFavorite) {
    signal.active_day_count = data.length - lastQueryIndex - allHistory.length;
    signal.query_count = lastQueryIndex;
  }
  utils.telemetry(signal);
}


function mixHistoryWithQueries(queries, history) {
  let data = [];
  let hi = 0;
  while (true) {
    if (hi >= history.length || lastQueryIndex >= queries.length) {
      break;
    }

    if (history[hi].timestamp > queries[lastQueryIndex].timestamp) {
      data.unshift(history[hi]);
      hi++;
    } else {
      data.unshift(queries[lastQueryIndex]);
      lastQueryIndex++;
    }
  }
  while (hi < history.length) {
    data.unshift(history[hi]);
    hi++;
  }

  while (isAllHistory && lastQueryIndex < queries.length) {
    data.unshift(queries[lastQueryIndex]);
    lastQueryIndex++;
  }


  return addDateSeparators(data);
}

function addDateSeparators(data) {
  if (!data.length) {
    return [];
  }

  let dataWithDates = [];
  let date = '';
  data.forEach(record => {
    const recordDate = getDateFromTimestamp(record.timestamp);
    if (recordDate !== date) {
      dataWithDates.push({ date: recordDate });
      date = recordDate;
    }
    dataWithDates.push(record);
  });

  return dataWithDates;
}

function displayData(data, isFavorite = false) {

  const template = CLIQZ.templates[isFavorite ? 'favorites' : 'conversations'];
  $('body').prepend(template({data: data, pageCount}));
  const container = window.document.getElementById(`container-${pageCount}`);

  window.document.body.scrollTop = container.scrollHeight;
  attachListeners(container);

  sendLoadTelemetry(data);
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
  showOnlyFavorite = onlyFavorites;
  if(!onlyFavorites) {
    window.addEventListener('scroll', onScroll);
  }
  update();
}

function update() {
  initializeVariables();
  window.document.body.innerHTML = "";

  loadStartTime = Date.now();
  showOnlyFavorite ? osAPI.getFavorites('History.showFavorites') : osAPI.getHistoryItems('History.showHistory', 0, History.RECORD_LIMIT);
}

function initializeVariables () {
  isAllHistory = false;
  allHistory = allFavorites = [];
  lastQueryIndex = 0;
}

function onScroll() {
  if (document.body.scrollTop !== 0 || isAllHistory) {
    return;
  }
  loadStartTime = Date.now();
  osAPI.getHistoryItems('History.showHistory', allHistory.length, History.RECORD_LIMIT);
}

function clearHistory() {
  storage.setObject('recentQueries', []);
}

function clearFavorites() {
  storage.setObject('favoriteQueries', []);
}

function onElementClick(event) {
  const element = getElement(event.target);
  const tab = showOnlyFavorite ? 'favorites' : 'history';
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
      const hammer = new window.Hammer(listItems[i]);
      hammer.on('panstart', onSwipeStart);
      hammer.on('panmove', onSwipe);
      hammer.on('panend', onSwipeEnd);
      hammer.on('tap', onElementClick);
      hammer.get('tap').set({time: 400});
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
  const tab = showOnlyFavorite ? 'favorites' : 'history';
  const targetType = element.getAttribute('class').indexOf('question') >= 0 ? 'query' : 'site';
  const direction = e.direction === 4 ? 'right' : 'left';
  if (math.abs(e.velocityX) < -1 || math.abs(e.deltaX) > 150) {
    showOnlyFavorite ? unfavoriteItem(element) : removeItem(element);
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


var History = {
  init,
  update,
  showHistory,
  showFavorites,
  clearHistory,
  clearFavorites,
  displayData,
  RECORD_LIMIT: 50,
};

export default History;
