'use strict';
/* global document, CLIQZEnvironment, CliqzUtils, CliqzHandlebars, osAPI */

import LongPress from "mobile-touch/longpress"

var historyTimer;
var editMode = false, showOnlyFavorite = false, unfavoriteMode = false;
var allHistory = [];
var selectedQueries = [];
var selectedHistory = [];

function showHistory(history) {
  clearTimeout(historyTimer);
  let data = [];
  allHistory = history.results;
  let queries = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);

  for (let i=0; i < allHistory.length; i++) {
    allHistory[i].domain = allHistory[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  }

  allHistory.reverse();
  queries.reverse();
  let hi = 0;
  let qi = 0;
  let date = '';
  while (true) {
    if (hi >= allHistory.length || qi >= queries.length) {
      break;
    }

    if (allHistory[hi].timestamp <= queries[qi].timestamp) {
      if (getDateFromTimestamp(allHistory[hi].timestamp) !== date) {
        data.push({date: getDateFromTimestamp(allHistory[hi].timestamp)});
        date = getDateFromTimestamp(allHistory[hi].timestamp);
      }
      data.push(allHistory[hi]);

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
  while (hi < allHistory.length) {
    if (getDateFromTimestamp(allHistory[hi].timestamp) !== date) {
      data.push({date: getDateFromTimestamp(allHistory[hi].timestamp)});
      date = getDateFromTimestamp(allHistory[hi].timestamp);
    }
    data.push(allHistory[hi]);
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

  if (showOnlyFavorite) {
    displayFavorites(data);
  } else {
    displayData(data);
  }

}

function displayFavorites(data) {
  displayData(data.filter(function(item) {
    return item.date || item.favorite; // filter all unfavorite records
  }).filter(function(item, index, arr){
    return !item.date || (arr[index + 1] && !arr[index + 1].date); // filter empty days
  }), true);

  document.getElementById('show_history').className = '';
  document.getElementById('show_favorites_only').className = 'active';
}

function displayData(data, isFavorite = false) {
  if (!CliqzHandlebars.tplCache['conversations'] || CliqzUtils.getLocalizedString('mobile_history_title') === 'mobile_history_title') {
    return setTimeout(displayData, 100, data);
  }

  const emptyMsg = CliqzUtils.getLocalizedString(isFavorite ? 'mobile_no_favorites' : 'mobile_no_history');

  document.body.innerHTML = CliqzHandlebars.tplCache['conversations']({data: data, emptyMsg: emptyMsg});

  document.getElementById('show_favorites_only').className = '';
  document.getElementById('show_history').className = 'active';

  const B = document.body,
      H = document.documentElement;
  
  let height;

  if (typeof document.height !== 'undefined') {
      height = document.height; // For webkit browsers
  } else {
      height = Math.max( B.scrollHeight, B.offsetHeight,H.clientHeight, H.scrollHeight, H.offsetHeight );
  }

  document.body.scrollTop = height + 100;

  document.getElementById('search_input').addEventListener('keyup', function() {
      filterHistory(this.value);
  });

  CLIQZEnvironment.addEventListenerToElements('.question, .answer', 'click', function () {
    const targeType = this.className === 'question' ? 'query' : 'url';
    CliqzUtils.telemetry({
      type: 'history',
      action: 'click',
      target_type: targeType,
      target_index: parseInt(this.dataset.index),
      target_length: this.querySelector('.' + targeType).textContent.length,
      target_ts: parseInt(this.dataset.timestamp)
    });
  });
  const queryCount = data.filter(function (item) { return item.query; }).length,
      urlCount = data.filter(function (item) { return item.url; }).length;
  CliqzUtils.telemetry({
    type: 'history',
    action: 'show',
    active_day_count: data.length - queryCount - urlCount,
    query_count: queryCount,
    url_count: urlCount
  });


  function onTap (element) {
    const type = element.getAttribute('class');
    const clickAction = type.indexOf('question') >= 0 ? osAPI.notifyQuery : osAPI.openLink;
    if (editMode) {
      selectItem(element);
    } else {
      clickAction(element.getAttribute('data'));
    }
  }
  new LongPress('.question, .answer', launchEditMode, onTap);
}

function launchEditMode (element) {

  if (editMode) {
    endEditMode();
    launchEditMode(element);
  } else {
    let checkboxes = Array.from(document.getElementsByClassName('edit__delete'));
    checkboxes.forEach(function(checkbox){
      checkbox.style.display = 'block';
    });
    let div = document.getElementById('control');
    div.style.display = 'block';
    editMode = true;
    selectedQueries = [];
    selectedHistory = [];
    selectItem(element);
  }
}

function endEditMode () {
  const framers = [].slice.call(document.getElementsByClassName('framer'));
  framers.forEach(item => item.setAttribute('class', 'framer'));

  const checkboxes = Array.from(document.getElementsByClassName('edit__delete'));
  checkboxes.forEach(function(element){
    let checkbox = element.querySelector('input');
    checkbox.checked = false;
    element.style.display = 'none';
  });

  let div = document.getElementById('control');
  div.style.display = 'none';
  editMode = false;
  selectedQueries = [];
  selectedHistory = [];
}

function getDateFromTimestamp (time) {
    const d = new Date(time);

    let days = d.getDate();
    days = days > 9 ? days : '0' + days;

    let months = d.getMonth()+1;
    months = months > 9 ? months : '0' + months;

    const year = d.getFullYear();

    const formatedDate = days + '.' + months + '.' + year;
    return formatedDate;
}
function filterHistory (value) {
    var framers = document.getElementsByClassName('framer');
    for (var i=0;i<framers.length;i++) {
        if (framers[i].childNodes[1].firstChild.textContent.toLowerCase().match(value.toLowerCase())) {
            framers[i].parentNode.style.display = 'block';
        } else {
            framers[i].parentNode.style.display = 'none';
        }
    }
}


function favoriteSelected () {
  setQueryFavorite();
  if (selectedHistory.length > 0) {
    osAPI.setHistoryFavorite(selectedHistory, !unfavoriteMode);
  }
  endEditMode();
  getHistory(showOnlyFavorite);
}

function setQueryFavorite () {
  const allQueries = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);

  let index = 0;
  allQueries.forEach(function(item) {
    if (index >= selectedQueries.length) {
      return;
    }
    if (item.id === selectedQueries[index]) {
      item.favorite = !unfavoriteMode;
      index++;
    }
  });

  CLIQZEnvironment.getLocalStorage().setItem('recentQueries', JSON.stringify(allQueries));
}

function removeQueries () {
  let queries = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);

  let index = 0;
  queries = queries.filter(query => index >= selectedQueries.length || selectedQueries[index] !== query.id || (index++ && false));
  CLIQZEnvironment.getLocalStorage().setObject('recentQueries', queries);
}

function removeSelected () {
  if (selectedQueries.length > 0) {
    removeQueries();
  }
  if (selectedHistory.length > 0) {
    osAPI.removeHistory(selectedHistory);
  }
  endEditMode();
  getHistory(showOnlyFavorite);
}

function selectQuery (id) {
  for (let i = 0; i < selectedQueries.length; i++) {
    if (selectedQueries[i] === id) {
      selectedQueries.splice(i, 1);
      return;
    } else if (selectedQueries[i] < id) {
      selectedQueries.splice(i, 0, id);
      return;
    }
  }
  selectedQueries.push(id);
}

function selectHistory (id) {
  for (let i = 0; i < selectedHistory.length; i++) {
    if (selectedHistory[i] === id) {
      selectedHistory.splice(i, 1);
      return;
    } else if (selectedHistory[i] < id) {
      selectedHistory.splice(i, 0, id);
      return;
    }
  }
  selectedHistory.push(id);
}

function selectItem (item) {
  let checkbox = item.querySelector('input');
  checkbox.checked = !checkbox.checked;
  const selectAction = item.getAttribute('class').indexOf('question') >= 0 ? selectQuery : selectHistory;
  const id = parseInt(item.getAttribute('data-id'));
  selectAction(id);
  setUnfavoriteMode();
  if (unfavoriteMode) {
    document.getElementById('control_star').innerText = CliqzUtils.getLocalizedString('mobile_history_unstar');
  } else {
    document.getElementById('control_star').innerText = CliqzUtils.getLocalizedString('mobile_history_star');
  }
  let framer = item.getElementsByClassName('framer')[0];
  if (framer.getAttribute('class').indexOf('selected') >= 0) {
    framer.setAttribute('class', 'framer');
  } else {
    framer.setAttribute('class', 'framer selected');
  }
  if (selectedQueries.length + selectedHistory.length === 0) {
    endEditMode();
  }
}

function setUnfavoriteMode () {
  const selectedFavoriteQueries = getSelectedFavorite(CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []), selectedQueries);
  const selectedFavoriteHistory = getSelectedFavorite(allHistory, selectedHistory);
  unfavoriteMode = selectedFavoriteQueries.length + selectedFavoriteHistory.length > 0;
}

function getSelectedFavorite (list, selectedList) {
  return list.filter(item => item.favorite && selectedList.indexOf(item.id) > -1);
}

function getHistory (onlyFavorites) {
  showOnlyFavorite = onlyFavorites;
  historyTimer = setTimeout(showHistory, 200, {results: []});
  osAPI.searchHistory('', 'History.showHistory');
}


function clearQueries (removeFavorites) {
  if (removeFavorites) {
    CLIQZEnvironment.getLocalStorage().setObject('recentQueries', []);
  } else {
    const recentQueries = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);
    CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentQueries.filter(item => item.favorite));
  }
}


var History = {
  init: function(){
    getHistory(showOnlyFavorite);
  },
  showHistory: showHistory,
  getHistory: getHistory,
  clearQueries: clearQueries,
  favoriteSelected: favoriteSelected,
  removeSelected: removeSelected,
  endEditMode: endEditMode
};

export default History;
