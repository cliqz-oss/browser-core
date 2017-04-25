'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */


function load(ctx) {

var CliqzAutocomplete;
var CliqzHandlebars;
var CliqzEvents;
var System;
var PlacesUtils;

function isValidURL(str) {
  var pattern = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
  return pattern.test(str);
}

var TEMPLATES = CliqzUtils.TEMPLATES,
    VERTICALS = CliqzUtils.VERTICAL_TEMPLATES,
    urlbar = null,
    IC = 'cqz-result-box', // result item class
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN],
    IMAGE_HEIGHT = 64,
    IMAGE_WIDTH = 114,
    DEL = 46,
    BACKSPACE = 8,
    ESC = 27,
    currentResults, // enhancedResults
    rawResults, // raw results
    adultMessage = 0, //0 - show, 1 - temp allow, 2 - temp dissalow
    privateWindow = false;

var UI = {
    showDebug: false,
    preventAutocompleteHighlight: false,
    lastInputTime: 0,
    lastInput: "",
    lastSelectedUrl: null,
    mouseOver: false,
    DROPDOWN_HEIGHT: 349,
    popupClosed: true,
    getPopupDimensions: null, // Set by ui/sources/window.es
    VIEWS: Object.create(null),
    preinit: function (autocomplete, handlebars, cliqzEvents, system, placesUtils) {
        CliqzAutocomplete = autocomplete;
        CliqzHandlebars = handlebars;
        CliqzEvents = cliqzEvents;
        System = system;
        PlacesUtils = placesUtils;
    },
    init: function(_urlbar) {
        urlbar = _urlbar
        if(!urlbar.mInputField) urlbar.mInputField = urlbar; //not FF

        UI.showDebug = CliqzUtils.getPref('showQueryDebug', false);

        CliqzEvents.sub('msg_handler_dropdown:message_ready', function (message) {
          CLIQZ.UI.messageCenterMessage = message;
        });
        CliqzEvents.sub('msg_handler_dropdown:message_revoked', function (message) {
          CLIQZ.UI.messageCenterMessage = null;
          // hide immediately
          clearMessage(message["footer-message"].location);
        });
        loadViews();

        // we need to know if the window is private or not in some
        // cases like switchTab which needs to be deactivated
        privateWindow = CliqzUtils.isOnPrivateTab(window);
    },
    main: function(box) {
        CLIQZ.UI.gCliqzBox = gCliqzBox = box;
        const mainTpl = UI.getTemplateName('main');
        //check if loading is done
        if(!CliqzHandlebars.tplCache[mainTpl])return;

        box.innerHTML = CliqzHandlebars.tplCache[mainTpl]();

        var resultsBox = document.getElementById('cliqz-results',box);
        var messageContainer = document.getElementById('cliqz-message-container'),
            messageContainerTop = document.getElementById('cliqz-message-container-top');

        resultsBox.addEventListener('mouseup', resultClick);
        resultsBox.addEventListener('mousedown', handleMouseDown);
        messageContainer.addEventListener('mouseup', resultClick);
        messageContainer.addEventListener('mousedown', handleMouseDown);

        resultsBox.addEventListener('mouseout', function(){
            XULBrowserWindow.updateStatusField();
        });

        //enable right click context menu
        CLIQZ.ContextMenu && CLIQZ.ContextMenu.enableContextMenu(box);

        messageContainer.addEventListener('mouseup', messageClick);
        messageContainerTop.addEventListener('mouseup', messageClick);
        gCliqzBox.messageContainer = messageContainer;
        gCliqzBox.messageContainerTop = messageContainerTop;
        resultsBox.addEventListener('scroll', resultScroll);

        box.addEventListener('mousemove', resultMove);
        gCliqzBox.resultsBox = resultsBox;

        // TEMP
        if (CliqzUtils.getPref('hist_search_type', 0))
            resultsBox.style.height = "580px";
    },
    getMinimalResultData(data) {
      // If an EZ ends up in the 2nd place (or after), we want to display it as
      // a simple reslut. This function converts the EZ into a regular result

      return {
        title: data.title,
        hasAd: data.extra && data.extra.is_ad && CliqzUtils.getPref('dropdownAdCampaignPosition', '') !== '',
        description: data.description || data.desc,
        friendlyUrl: data.friendlyUrl,
        trigger_urls: data.trigger_urls,
        kind: data.kind,
        template: 'generic'
      }
    },
    // FF specific
    handleResults: function(){
      // TODO: this is FF specific - move it to another place!
      var popup = urlbar.popup,
        data = [],
        ctrl = popup.mInput.controller,
        q = ctrl.searchString.replace(/^\s+/, '').replace(/\s+$/, ''),
        lastRes = CliqzAutocomplete.lastResult;
        // width = Math.max(urlbar.clientWidth, 500);


      // the search component UI might not be initialized yet
      if (!gCliqzBox)
         return;

      // try to recreate main container if it doesnt exist
      if(!gCliqzBox.resultsBox){
          var cliqzBox = CLIQZ.Core.popup.cliqzBox;
          if(cliqzBox){
              UI.main(cliqzBox);
          }
      }
      // set the width
      // simply setting the width on the popup element and allowing the content to be 100% doenst work
      // gCliqzBox.style.width = width + 1 + 'px';
      // gCliqzBox.resultsBox.style.width = width + (CliqzUtils.isWindows() ? -1 : 1) + "px";
      for(var i=0; i<popup._matchCount; i++) {
          data.push({
            title: ctrl.getCommentAt(i),
            url: unEscapeUrl(ctrl.getValueAt(i)),
            originalUrl: ctrl.getValueAt(i),
            type: ctrl.getStyleAt(i),
            text: q,
            data: lastRes && lastRes.getDataAt(i),
            maxNumberOfSlots: (i == 0 ? 3 : 1 )
          });
      }

      CLIQZ.UI.setRawResults({
        q: q,
        results: data,
        isInstant: lastRes && lastRes.isInstant,
        isMixed: lastRes && lastRes.isMixed,
      });

      var currentResults = CLIQZ.UI.render();

      // cache heights (1-3) for result order
      CliqzAutocomplete.lastResultHeights =
        Array.prototype.slice.call(
          gCliqzBox.getElementsByClassName("cqz-result-box")).map(
            function (r) {
              return Math.floor(r.offsetHeight / 100);
            });

      var curResAll = currentResults.results, firstResult = curResAll[0];
      if(curResAll && curResAll.length > 0){
        //if the first result has no url and it is a history pattern result try to extract the first url and set it to the whole entry
        if(!firstResult.url && firstResult.type == "cliqz-pattern"
            && firstResult.data
            && firstResult.data.urls
            && firstResult.data.urls.length > 0) {
          firstResult.url = firstResult.data.urls[0].href;
        }

        if(firstResult.url){
          setTimeout(function () {
            CLIQZ.UI.autocompleteQuery(firstResult.url, firstResult.title);
          }, 0);
        }

        snippetQualityTelemetry(curResAll);
      }

      XULBrowserWindow.updateStatusField();
      CliqzUtils._queryLastDraw = Date.now();
    },
    setRawResults: function(res){
      rawResults = res
    },
    getTemplateName: function(tpl) {
      const prefix = CliqzUtils.dropDownStyle === 'simple' ? 'simple-ui/' : '';
      return prefix + tpl;
    },
    // results function
    render: function(){
        if (CliqzUtils.dropDownStyle === 'simple') {
          clearTimeout(UI.resultIconsTimer);
        }
        currentResults = enhanceResults(rawResults);
        var query = currentResults.q;
        if (!query)
          query = "";

        // try to avoid Stack size limitations on Linux by breaking out Handlebars processing
        setTimeout(function(currentResults, query){
          if(gCliqzBox.resultsBox && currentResults.isMixed) {
            UI.redrawDropdown(CliqzHandlebars.tplCache[UI.getTemplateName('results')](currentResults), query);
          }

          //might be unset at the first open
          CLIQZ.Core.popup.mPopupOpen = true;
          if (CliqzUtils.dropDownStyle === 'simple') {
            UI.resultIconsTimer = setTimeout(() => {
              let iconPlaceHolders = gCliqzBox.resultsBox.getElementsByClassName('result-icon-placeholder');
              for (var i = 0; i < iconPlaceHolders.length; i++) {
                UI.setResultTypeIcon(iconPlaceHolders[i]);
              }
            }, 400);
          }

          // try to find and hide misaligned elemets - eg - weather
          setTimeout(function(box){
              hideMisalignedElements(box);
              smCqzAnalogClock($('.cqz-analog-clock', box));

              CliqzUtils.onRenderComplete(CliqzAutocomplete.lastSearch, box);
          }, 0, gCliqzBox.resultsBox);


          // find out if scrolling is possible
          CliqzAutocomplete.resultsOverflowHeight =
              gCliqzBox.resultsBox.scrollHeight - gCliqzBox.resultsBox.clientHeight;

        }, 0, currentResults, query);

        return currentResults;
    },

    lastInstantLength: 0,
    lastQuery: "",
    setResultTypeIcon: function (imgPlaceHolder) {
      if (!PlacesUtils) return;
      const url = imgPlaceHolder.getAttribute('url');
      const uri = CliqzUtils.makeUri(url);
      if (PlacesUtils.bookmarks.isBookmarked(uri)) {
        imgPlaceHolder.setAttribute('src', 'chrome://cliqz/content/static/skin/simple-ui/bookmark.svg')
      }
      else {
        PlacesUtils.asyncHistory.isURIVisited(uri, function(aURI, isVisited) {
          if (isVisited) {
            imgPlaceHolder.setAttribute('src', 'chrome://cliqz/content/static/skin/simple-ui/history.svg');
          }
        });
      }

    },
    redrawDropdown: function(newHTML, query) {
      var box = gCliqzBox.resultsBox;

      if(query && query.indexOf(UI.lastQuery) == -1) box.innerHTML = "";
      if(query) UI.lastQuery = query;

      var oldBox = box.cloneNode(true);
      var newBox = box.cloneNode(true);
      newBox.innerHTML = newHTML;

      // Extract old/new results
      var oldResults = oldBox.getElementsByClassName("cqz-result-box");
      var newResults = newBox.getElementsByClassName("cqz-result-box");

      if (CliqzAutocomplete.lastResultIsInstant) UI.lastInstantLength = newResults.length;
      // Process Instant Results
      if (CliqzAutocomplete.lastResultIsInstant && newResults.length <= oldResults.length) {
        for(var i=0; i<newResults.length; i++) {
          var oldChild = oldResults[i];
          var curUrls = UI.extractResultUrls(oldChild.innerHTML);
          var newUrls = newResults[i] ? UI.extractResultUrls(newResults[i].innerHTML) : null;
          if(!UI.urlListsEqual(curUrls, newUrls)) {
            box.replaceChild(newResults[i], box.children[i]);
          }
        }
        // Detect duplicate entries
        var historyShown = false;
        for(var i=0; i<box.children.length; i++) {
          var res = box.children[i], type = res.getAttribute("type");
          if(type && type.indexOf("cliqz-pattern") != -1) {
            if(historyShown)
              box.removeChild(res);
            historyShown = true;
          }
        }

        if(CliqzAutocomplete.selectAutocomplete) UI.selectAutocomplete();
        return;
      }

      box.innerHTML = newHTML;

      if(CliqzAutocomplete.selectAutocomplete) UI.selectAutocomplete();
    },
    // Returns a concatenated string of all urls in a result list
    extractResultUrls: function(str) {
      return str.match(/((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi);
    },
    urlListsEqual: function(a, b) {
      if(a && b) {
        var s, l, m;

        if(a.length > b.length) {
          s = b;
          l = a;
        } else {
          s = a;
          l = b;
        }
        for(var i=0; i<s.length; i++) {
          if (l.indexOf(s[i]) == -1) return false;
        }
        return true;
      }
      return false;
    },
    // redraws a result
    // usage: redrawResult('[type="cliqz-cluster"]', 'clustering', {url:...}
    redrawResult: function(filter, template, data){
        var result = $('.' + IC + filter, gCliqzBox);
        if(result) result.innerHTML = CliqzHandlebars.tplCache[template](data);
    },
    keyDown: function(ev){
        var sel = getResultSelection(),
            //allArrowable should be cached
            allArrowable = CliqzUtils.extractSelectableElements(gCliqzBox);
        var pos = allArrowable.indexOf(sel);

        UI.lastInputTime = (new Date()).getTime()
        if(ev.keyCode != ESC && UI.popupClosed) {
          if(gCliqzBox.resultsBox) gCliqzBox.resultsBox.innerHTML = "";
          UI.popupClosed = false;
        }
        switch(ev.keyCode) {
            case TAB:
                if (!CLIQZ.Core.popup.mPopupOpen) return false;
                // move up if SHIFT key is held down
                if (ev.shiftKey) {
                    selectPrevResult(pos, allArrowable);
                } else {
                    selectNextResult(pos, allArrowable);
                }
                return true;
            case UP:
                selectPrevResult(pos, allArrowable);
                return true;
            break;
            case DOWN:
                selectNextResult(pos, allArrowable);
                return true;
            break;
            case ENTER:
                UI.lastInput = "";
                return onEnter(ev, sel);
            break;
            case RIGHT:
            case LEFT:
                var selection = UI.getSelectionRange(ev.keyCode, urlbar.selectionStart, urlbar.selectionEnd, ev.shiftKey, ev.altKey, ev.ctrlKey | ev.metaKey);
                urlbar.setSelectionRange(selection.selectionStart, selection.selectionEnd);

                CliqzAutocomplete.spellCheck.state.override = true;
                return true;
            case KeyEvent.DOM_VK_HOME:
                if (ev.shiftKey) {
                  // do nothing
                } else {
                  // set the caret at the beginning of the text box
                  urlbar.selectionEnd = 0;
                }
                (ev.target || ev.srcElement).setSelectionRange(0, urlbar.selectionEnd);
                // return true to prevent the default action
                // on linux the default action will autocomplete to the url of the first result
                return true;
            case BACKSPACE:
            case DEL:
                UI.lastInput = "";
                if (CliqzAutocomplete.spellCheck.state.on && CliqzAutocomplete.lastSuggestions && Object.getOwnPropertyNames(CliqzAutocomplete.spellCheck.state.correctBack).length != 0) {
                    CliqzAutocomplete.spellCheck.state.override = true
                    // correct back the last word if it was changed
                    var words = urlbar.mInputField.value.split(' ');
                    var wrongWords = CliqzAutocomplete.lastSuggestions[1].split(' ');
                    CliqzUtils.log(JSON.stringify(words), 'spellcorr');
                    CliqzUtils.log(JSON.stringify(wrongWords), 'spellcorr');
                    CliqzUtils.log(words[words.length-1].length, 'spellcorr');
                    if (words[words.length-1].length == 0 && words[words.length-2] != wrongWords[wrongWords.length-2]) {
                        CliqzUtils.log('hi', 'spellcorr');
                        words[words.length-2] = wrongWords[wrongWords.length-2];
                        urlbar.mInputField.value = words.join(' ');
                  var signal = {
                      type: 'activity',
                      action: 'del_correct_back'
                  };
                  CliqzUtils.telemetry(signal);
                    }
                } else {
                    var signal = {
                        type: 'activity',
                        action: 'keystroke_del'
                    };
                    CliqzUtils.telemetry(signal);
                }
                UI.preventAutocompleteHighlight = true;
                UI.lastSelectedUrl = "";
                clearResultSelection();
                return false;
            case ESC:
                if (CLIQZ.Core.urlbar.mInputField.value.length == 0) {
                  CliqzEvents.pub('ui:popup_hide');
                }
                return false;
            default:
                UI.lastInput = "";
                UI.preventAutocompleteHighlight = false;
                UI.cursor = urlbar.selectionStart;
                return false;
        }
    },

    selectResultByIndex: function (pos) {
      var selectables = CliqzUtils.extractSelectableElements(gCliqzBox);
      setResultSelection(selectables[pos], false, true);
    },

    entitySearchKeyDown: function(event, element) {
      if(event.keyCode==13) {
        event.preventDefault();
        navigateToEZinput(element);
      }
    },
    animationEnd: 0,
    selectAutocomplete: function() {
      var target = function() {
        var index = 0;
        var target = $$('[arrow]', gCliqzBox)[0];
        while(target &&
          CliqzUtils.generalizeUrl(target.getAttribute("url")) !=
          CliqzUtils.generalizeUrl(CliqzAutocomplete.lastAutocomplete))
          target = $$('[arrow]', gCliqzBox)[++index];
        // Prevent page changing
        var offset = target ? target.offsetTop : 0;
        if(target && target.classList.contains("cliqz-pattern")) {
          var context = $('.cqz-result-pattern', gCliqzBox);
          if(context) offset += context.parentElement.offsetTop;
        }
        if(offset > 300) {
          // Remove autocomplete from urlbar
          urlbar.mInputField.value = urlbar.mInputField.value.substr(0, urlbar.selectionStart);
          CliqzAutocomplete.lastAutocomplete = null;
          CliqzAutocomplete.lastAutocompleteActive = null;
          CliqzAutocomplete.selectAutocomplete = false;
          return null;
        }
        return target;
      };
      // Skip timeout if element was selected before
      if (target() && UI.lastSelectedUrl == target().getAttribute("url")) {
        setResultSelection(target(), false);
        return;
      }
      // Timeout to wait for user to finish keyboard input
      // and prevent multiple animations at once
      setTimeout(function() {
        var time = (new Date()).getTime();
        if(time - UI.lastInputTime > 300) {
          if (!UI.preventAutocompleteHighlight && time > UI.animationEnd
            && gCliqzBox && CliqzAutocomplete.selectAutocomplete) {
            UI.animationEnd = (new Date()).getTime() + 330;
            setResultSelection(target(), false);
          }
        }
      },300);

    },
    clearAutocomplete: function() {
      clearResultSelection();
    },
    // call from onboarding tour to look like mouse over
    simulateSelectFirstElement: function () {
      setResultSelection($('[arrow]', gCliqzBox), false, false, true);
    },
    cursor: 0,
    getSelectionRange: function(key, curStart, curEnd, shift, alt, meta) {
      var start = curStart, end = curEnd;

      if (CliqzUtils.isWindows()) {
        // Do nothing if alt is pressed
        if(alt) return;
        // On Windows: CTRL selects words, ALT does nothing
        // Meta key -> same behavior as ALT on OSX
        alt = meta;
        meta = false;
      }

      if (key == LEFT) {
        if (shift && meta) {
            start = 0;
            UI.cursor = start;
        } else if (meta) {
            start = 0;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == end) {
                end = selectWord(urlbar.mInputField.value, LEFT);
                start = curStart;
                UI.cursor = end;
            } else {
                start = selectWord(urlbar.mInputField.value, LEFT);
                end = curEnd;
                UI.cursor = start;
            }
        } else if(alt) {
            start = selectWord(urlbar.mInputField.value, LEFT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == end) {
                end -= 1;
                UI.cursor = end;
            } else {
                if(start >= 1) start -= 1;
                UI.cursor = start;
            }
          // Default action
        } else {
            if (start != end) {
                end = start;
            } else {
                start -= 1;
                end = start;
            }
            UI.cursor = start;
        }
      } else if (key == RIGHT) {
        if (shift && meta) {
            end = urlbar.mInputField.value.length;
            UI.cursor = end;
        }
        else if (meta) {
            start = urlbar.mInputField.value.length;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == start) {
                start = selectWord(urlbar.mInputField.value, RIGHT);
                end = curEnd;
                UI.cursor = start;
            } else {
                end = selectWord(urlbar.mInputField.value, RIGHT);
                start = curStart;
                UI.cursor = end;
            }
        } else if(alt) {
            start = selectWord(urlbar.mInputField.value, RIGHT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == start) {
                start += 1;
                UI.cursor = start;
            } else {
                if(end < urlbar.mInputField.value.length) end += 1;
                UI.cursor = end;
            }
        // Default action
        } else {
          if (start != end) {
              start = end;
          } else {
              start += 1;
              end = start;
          }
          UI.cursor = end;
        }
      }

      return {
        selectionStart: start,
        selectionEnd: end
      };
    },
    enhanceSpecificResult: function(r) {
      var specificView;
      if (r.subType && r.subType.id) {
        // Indicate that this is a RH result.
        r.type = "cliqz-extra";
      }
      specificView = UI.VIEWS[r.data.template] || UI.VIEWS.generic;
      if (specificView && specificView.enhanceResults) {
        specificView.enhanceResults(r.data);
      }
    },
    isLocal: function(result) {
      return result
             && result.data
             && result.data.subType
             && result.data.subType.class === "EntityLocal";
    },
    hasAskedForLocation: function(result) {
      return result
             && result.data
             && result.data.extra
             && result.data.extra.no_location;
    },
    sessionEnd: sessionEnd,
    getResultOrChildAttr: getResultOrChildAttr,
    getElementByAttr: getElementByAttr,
    enhanceResults: enhanceResults,
    logUIEvent: logUIEvent,
    getResultSelection: getResultSelection,
    getResultKind: getResultKind
};

function navigateToEZinput(element){
    var provider_name = element.getAttribute("search-provider"),
        search_url = element.getAttribute("search-url"),
        value = element.value,
        search_engine = CliqzUtils.getEngineByName(provider_name),
        dest_url = search_url + value;

    if (search_engine) {
        dest_url = search_engine.getSubmissionForQuery(value);
    }
    openUILink(dest_url);
    CliqzEvents.pub('ui:popup_hide');

    var action_type = element.getAttribute("logg-action-type");
    var signal = {
      type: 'activity',
      action: action_type
    };
    CliqzUtils.telemetry(signal);
}

function selectWord(input, direction) {
  var start = 0, end = 0;
  var cursor = UI.cursor;
  input = input.replace(/\W/g, ' ');

  if(direction == LEFT) {
    if(cursor > 0) cursor -= 1;
    for(;input[cursor] == ' ' && cursor >= 0;cursor--);
    for(; cursor>=0 && input[cursor] != " "; cursor--);
    return cursor+1;
  } else {
    for(;input[cursor] == ' ' && cursor < input.length;cursor++);
    for(; cursor<input.length && input[cursor] != " "; cursor++);
    return cursor;
  }
}

//called on urlbarBlur
function sessionEnd(){
    adultMessage = 0; //show message in the next session
    if (CliqzUtils.SHARE_LOCATION_ONCE) {
      CliqzUtils.USER_LAT = null;
      CliqzUtils.USER_LNG = null;
      CliqzUtils.SHARE_LOCATION_ONCE = false;
    }
}

// hide elements in a context folowing a priority (0-lowest)
//
// looks for all the elements with 'hide-check' attribute and
// hides childrens based on the 'hide-priority' order
function hideMisalignedElements(ctx){
    var elems = $$('[hide-check]', ctx);
    for(var i = 0; elems && i < elems.length; i++){
        var el = elems[i], childrenW = 40 /* paddings */;
        for(var c=0; c<el.children.length; c++)
            childrenW += el.children[c].clientWidth;

        if(childrenW > el.clientWidth){
            var children = [].slice.call(el.children);

            while(children.length && childrenW > el.clientWidth){
                var excluded = children.pop();
                childrenW -= excluded.clientWidth;
                excluded.style.display = 'none';
                excluded.setAttribute('hidden', true);
            }
        }
    }
}

//returns the first child which matches the selector
function $(selector, ctx){return (ctx || document).querySelector(selector); }

//returns all the childs which match the selector
function $$(selector, ctx){return (ctx || document).querySelectorAll(selector); }

//returns the ctx itself if its a match or first child which matches the selector
function $_(selector, ctx){
    if(matches(ctx || document, selector)){
        return ctx || document;
    } else return $(selector, ctx);
}


// returns true if the selector matches the element
function matches(elem, selector) {
    var f = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
    if(f){
        return f.bind(elem)(selector);
    }
    else {
        //older FF doest have mathes - create our own
        return elem.parentNode && Array.prototype.indexOf.call(elem.parentNode.querySelectorAll(selector), elem) != -1;
    }
}

/**
 * Finds the closest ancestor of @p elem that matches @p selector.
 *
 * @see http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
 */
function closest(elem, selector) {
    while (elem) {
        if (matches(elem, selector)) {
            return elem;
        } else {
            elem = elem.parentElement;
        }
    }
    return false;
}

function generateLogoClass(urlDetails){
    var cls = '';
    // lowest priority: base domain, no tld
    cls += ' logo-' + urlDetails.name;
    // domain.tld
    cls += ' logo-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    if (urlDetails.subdomains.length > 0) {
        // subdomain.domain - to match domains like maps.google.co.uk and maps.google.de with maps-google
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name;
        // subdomain.domain.tld
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    }

    return cls;
}

function constructImage(data){
    if (data && data.image) {
        var height = IMAGE_HEIGHT,
            img = data.image;
        var ratio = 0;

        switch((data.extra.rich_data && data.extra.rich_data.type) || data.type){
            case 'news': //fallthrough
            case 'shopping':
              height = 64;
              ratio = 1;
              break;
            case 'hq':
                try {
                    if(img.ratio){
                        ratio = parseInt(img.ratio);
                    } else if(img.width && img.height) {
                        ratio = parseInt(img.width) / parseInt(img.height);
                    }
                } catch(e){}
                break;
            case 'video':
                ratio = 16/9;
                break;
            case 'poster':
                height = 67;
                ratio = 214/317;
                break;
            case 'people': //fallthough
            case 'person':
                ratio = 1;
                break;
            default:
                ratio = 0;
                break;
        }
        // only show the image if the ratio is between 0.4 and 2.5
        if(ratio == 0 || ratio > 0.4 && ratio < 2.5){
            var image = { src: img.src };
            if(ratio > 0) {
                image.backgroundSize = height * ratio;
                image.width = height * ratio ;
                image.height = height;
            }
            if (img && img.duration) {
                image.text = img.duration;
            }

            image.width = image.width || IMAGE_WIDTH;

            return image
        }
    }
    return null;
}

//loops though al the source and returns the first one with custom snippet
function getFirstVertical(type){
    while(type && !VERTICALS[type[0]])type = type.substr(1);
    return VERTICALS[type[0]] || 'generic';
}

function getPartial(type){
    if(type === 'cliqz-images') return 'images';
    if(type === 'cliqz-cluster') return 'clustering';
    if(type.indexOf('cliqz-pattern') === 0) return 'pattern';
    if(type === 'cliqz-series') return 'series';
    if(type.indexOf('cliqz-custom sources-') === 0) return 'custom';
    if(type.indexOf('cliqz-results sources-') == 0){
        // type format: cliqz-results sources-XXXX
        // XXXX -  are the verticals which provided the result
        return getFirstVertical(type.substr(22));
    }
    // history and cliqz results, eg: favicon sources-XXXXX
    var combined = type.split(' ');
    if(combined.length == 2 && combined[0].length > 0 && combined[1].length > 8){
        return getFirstVertical(combined[1].substr(8));
    }

    return 'generic';
}

// tags are piggybacked in the title, eg: Lady gaga - tag1,tag2,tag3
function getTags(fullTitle){
    //[, title, tags] = fullTitle.match(/^(.+) \u2013 (.+)$/);
    var res = fullTitle.match(/^(.+) \u2013 (.+)$/);

    // Each tag is split by a comma in an undefined order, so sort it
    return [res[1], res[2].split(",").sort()]
}

function unEscapeUrl(url){
  return Components.classes['@mozilla.org/intl/texttosuburi;1'].
            getService(Components.interfaces.nsITextToSubURI).
            unEscapeURIForUI('UTF-8', url)
}

// Determine partials to be used for generic results
function setPartialTemplates(data) {
  // Every entry has title and URL
  var partials = ['title', 'url'];

  // Description
  if (data.description || data.desc) {
    partials.push('description');
  }

  // Local data

  if (data.subType && data.subType.class == 'EntityLocal') {
    if (data.extra.no_location) {
      partials.push('missing_location_1');
    } else {
      partials.push('local-data-sc');
    }
  }



  // History
  if (data.urls && data.urls.length) {
    partials.push('history');
    var index = partials.indexOf('description');

    if (index > -1) {
      if(data.urls.length <= 5) {
        partials[index] = 'description-m';
      }else {
        data.urls = data.urls.slice(0, 6);
        partials.splice(index, 1);
      }
    }
  }


  if (data.deepResults) {
    data.deepResults.forEach(function (item) {
      if (item.type == 'buttons') {
        data.btns = item.links;
        partials.push('buttons');
      }
    })
  }

  // Bottom buttons
  if (data.subType && (data.subType.class === 'EntityMusic' || data.subType.class === 'EntityDownload')) {
    partials.push('bottom-data-sc');
  }

  return partials;
}

function getNoResultsForSimpleUI(r) {
  const engine = CliqzUtils.getDefaultSearchEngine(),
        searchUrl = engine.getSubmissionForQuery(r.text),
        urlbarBox = urlbar.getBoundingClientRect(),
        urlDetails = CliqzUtils.getDetailsFromUrl(searchUrl);
  return {
    title: r.text + ' - ' + CliqzUtils.getLocalizedString('searchOn', engine.name),
    url: searchUrl,
    type: 'cliqz-extra',
    width: Math.max(urlbarBox.width, 500),
    urlDetails: urlDetails,
    logo: CliqzUtils.getLogoDetails(urlDetails),
    data: {
      template: 'generic',
      resultIcon: 'https://cdn.cliqz.com/extension/core/icons/search_cliqz.svg',
      resultXPosition: urlbarBox.x,
    },
  };
}

function getCustomResultForSimpleUI(r) {
  r.title = r.title + ' - ' + CliqzUtils.getLocalizedString('searchOn', r.data.extra.engine);
  return r;
}

var TYPE_LOGO_WIDTH = 100; //the width of the type and logo elements in each result
function enhanceResults(res){
    // is this smart?
    // clone the object to avoid losing the raw version
    res = JSON.parse(JSON.stringify(res));

    clearMessage('bottom');
    var adult = false,
        data,
        hasAd = false,
        resultWithAd = {},
        adPosition = CliqzUtils.getPref('dropdownAdCampaignPosition', ''),
        adIndex;

    for(var i=0; i<res.results.length; i++) {
        var r = res.results[i];
        if (!r.data) {
          if (r.snippet) {
            r.data = r.snippet;
            delete r.snippet;
          }
          else {
            r.data = {};
          }
        }

        if (r.subType && !r.data.subType) {
          r.data.subType = r.subType;
        }
        if (r.template && !r.data.template) {
          r.data.template = r.template;
        }
        if (r.type.indexOf('bookmark') >= 0) {
          r.data.resultIcon = 'chrome://cliqz/content/static/skin/simple-ui/bookmark.svg';
          r.title = r.data.title || r.title;
        } else if (r.type.indexOf('favicon') >= 0) {
          r.data.resultIcon = 'chrome://cliqz/content/static/skin/simple-ui/history.svg';
          r.title = r.data.title || r.title;
        } else if (r.data.template == 'news') {
          r.data.resultIcon = 'https://cdn.cliqz.com/extension/core/icons/news_cliqz.svg';
        } else if (r.data.template === 'noResult' && CliqzUtils.dropDownStyle === 'simple') {
          res.results[i] = r = getNoResultsForSimpleUI(r);
        } else if (r.data.template === 'custom' && CliqzUtils.dropDownStyle === 'simple') {
          res.results[i] = r = getCustomResultForSimpleUI(r);
        }
        if(r.data.extra && r.data.extra.adult) adult = true;

        if(r.data.extra && r.data.extra.is_ad && adPosition !== '') {
          r.data.hasAd = r.data.extra.is_ad;
          hasAd = true;
          resultWithAd = r;
          adIndex = i;

          if (r.data.extra.url_ad) {
            r.url = r.data.extra.url_ad;
          }
        }

        if (r.type.indexOf('cliqz-extra') !== -1 &&  i > 0 ) {
          r.data = UI.getMinimalResultData(r.data);
        }

        // Prepare list of partial templates for rendering
        r.data.partials = setPartialTemplates(r.data);

        //always use data.btns independetly of whether the buttons come from (history, rich header etc)
        r.data.btnExtra = 'cat';

        UI.enhanceSpecificResult(r);

        var d = r.data;
        if(d) {
          if(d.template && TEMPLATES.hasOwnProperty(d.template)){
            r.vertical = d.template;
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
            if (r.vertical == 'text') r.dontCountAsResult = true;
          } else {
            // double safety - to be removed
            r.invalid = true;
            r.dontCountAsResult = true;
            continue;
          }

          // Display the title instead of the name, if available
          if(d.title)
            d.name = d.title;
        }
        var urlbarBox = urlbar.getBoundingClientRect();
        r.data.resultXPosition = urlbarBox.x;
        r.width = Math.max(urlbarBox.width, 500);
        if(r.data && r.data.generic) {// this entry combines several domains, so show CLIQZ logo
            r.logo.logo_url = "https://cliqz.com"; // Clicking on the logo should take the user here
            r.logo.style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.logo.logo_url)).style;
            if(r.logo.style.indexOf('background-image') == -1){
                //add local cliqz image if there is no internet
                r.logo.style += ";background-image:url(" + CliqzUtils.SKIN_PATH + "img/cliqzLogo.svg)";
            }
            r.logo.add_logo_url = true;
        }

        if (CliqzUtils.dropDownStyle !== 'simple') {
          // backend messages disabled in simple UI
          if (r.type == 'cliqz-extra' && r.data && r.data.extra && r.data.extra.__message__) {
            var msg = r.data.extra.__message__;
            if (CliqzUtils.getPref(msg.pref, true)) {
              updateMessage('bottom', {
                "footer-message": {
                  simple_message: CliqzUtils.getLocalizedString(msg.text),
                  telemetry: "rh_message-" + msg.pref || 'null',
                  searchTerm: CliqzUtils.getLocalizedString(msg.searchTerm),
                  options: msg.buttons.map(function(b) {
                    return {
                      text: CliqzUtils.getLocalizedString(b.text),
                      action: b.action,
                      state: b.state || 'default',
                      pref: msg.pref || 'null',
                      prefVal: b.prefVal || 'null'
                    }
                  })
                }
              });
            }
          }
        }
    }

    // remove adResult from results, we will display it as an Ad at the footer
    if(hasAd && adPosition === 'bottom') {
      res.results = res.results.filter((r) => {
        return !r.data.hasAd;
      });
    }

    var spellCheckMessage;

    //filter adult results
    if(adult) {
        var level = CliqzUtils.getPref('adultContentFilter', 'moderate');
        if(level != 'liberal' && adultMessage != 1)
            res.results = res.results.filter(function(r){ return !(r.data && r.data.extra && r.data.extra.adult); });

        // if there no results after adult filter - show no results entry
        if(res.results.length == 0){
          const noResults = CliqzUtils.dropDownStyle === 'simple' ? getNoResultsForSimpleUI(CliqzUtils.getNoResults(res.q)) : CliqzUtils.getNoResults(res.q);
          res.results.push(noResults);
          res.results[0].vertical = 'noResult';
        }

        if (level == 'moderate' && adultMessage == 0) {
            updateMessage('bottom', {
                "footer-message": {
                    type: 'cqz-message-alert',
                    simple_message: CliqzUtils.getLocalizedString('adultInfo'),
                    telemetry: 'adultFilter',
                    options: [
                        {
                            text: CliqzUtils.getLocalizedString('show_once'),
                            action: 'adult-showOnce',
                            state: 'default'
                        },
                        {
                            text: CliqzUtils.getLocalizedString('always'),
                            action: 'adult-conservative',
                            state: 'default'
                        },
                        {
                            text: CliqzUtils.getLocalizedString('never'),
                            action: 'adult-liberal',
                            state: 'default'
                        },
                    ]
                }
            });
        }
    } else if(hasAd && adPosition === 'bottom') {
      updateMessage('bottom', {
        "footer-ad": resultWithAd
      });
      //Keep original ranking of the result for telemetry purposes
      document.getElementById('ad-container').setAttribute('idx', adIndex);
    }
    else if (notSupported()) {
      updateMessage('bottom', {
          "footer-message": getNotSupported()
       });
    }
    else if (CliqzAutocomplete.spellCheck &&
      (spellCheckMessage = CliqzAutocomplete.spellCheck.getCurrentMessage(urlbar.mInputField.value))){
      updateMessage('bottom', {
        "footer-message": {
          simple_message: CliqzUtils.getLocalizedString('spell_correction'),
          messages: spellCheckMessage,
          telemetry: 'spellcorrect',
          options: [{
              text: CliqzUtils.getLocalizedString('yes'),
              action: 'spellcorrect-revert',
              state: 'default'
            },
            {
              text: CliqzUtils.getLocalizedString('no'),
              action: 'spellcorrect-keep',
              state: 'default'
            }
          ]
        }
      });
    }
    else if (CLIQZ.UI.messageCenterMessage) {
      updateMessage(CLIQZ.UI.messageCenterMessage["footer-message"].location,
        CLIQZ.UI.messageCenterMessage);
    }
    return res;

}


// returns a number from 1 to `range` for specific part of hour.
// So range = 6, cuts hour into six parts and returns:
// 1: for minutes 0-9, 2: for minutes 10-19, etc.
function getRandomForCurrentTime(range) {
  return 1 + Math.floor( (new Date()).getMinutes() * range / 60 );
}

function notSupported(r){
    // Has the user seen our warning about cliqz not being optimized for their country, but chosen to ignore it? (i.e: By clicking OK)
    // or he is in germany
    var supportedIndexCountries = JSON.parse(CliqzUtils.getPref("config_backends", '["de"]'))
    if(CliqzUtils.getPref("ignored_location_warning", false) ||
        supportedIndexCountries.indexOf(CliqzUtils.getPref("backend_country", "de")) > -1 ||
        // in case location is unknown do not show the message
        CliqzUtils.getPref("backend_country", "de") == '') return false

    //if he is not in germany he might still be  speaking the language
    // of one of the supported countries
    // doesn't work for countries where the country iso
    // doesnt match the language one
    var lang = navigator.language.toLowerCase();
    return supportedIndexCountries.indexOf(lang) < 0  && supportedIndexCountries.indexOf(lang.split('-')[0]) < 0;
}

function getNotSupported(){
  return {
    simple_message: CliqzUtils.getLocalizedString('OutOfCoverageWarning'),
    telemetry: 'international',
    type: 'cqz-message-alert',
    options: [{
        text: CliqzUtils.getLocalizedString('keep-cliqz'),
        action: 'keep-cliqz',
        state: 'success'
      }, {
        text: CliqzUtils.getLocalizedString('disable-cliqz'),
        action: 'disable-cliqz',
        state: 'error'
      }
    ]
  }
}

 /*
  * Updates the state of the message box at the top or bottom of the dropdown.
  * @param location, either 'top' or 'bottom'
  * @param messages the dictionary of messages
  * specified by the name of the template, excluding the .tpl extension.
  * The name should be in MESSAGE_TEMPLATES, so the template can be automatically rendered.
  * In the dictionary, the key is the name of the template, and the value is the dictinary
  * of template arguments; {} to delete the currently shown messages
  * example:
  * updateMessage("top", {
                "adult": {
                  "adultConfig": CliqzUtils.getAdultFilterState()
                }
             });
  * You can also pass multiple messages at once, e.g:
             updateMessage("top", {
                "adult": {
                    "adultConfig": CliqzUtils.getAdultFilterState()
                },
                "footer-message": {
                  // Template has no arguments.
                }
             });
  */

function updateMessage(location, messages) {
  var container = {
    top: gCliqzBox.messageContainerTop,
    bottom: gCliqzBox.messageContainer
  }[location] || gCliqzBox.messageContainer;

  container.innerHTML = Object.keys(messages).map(function (tplName) {
    return CliqzHandlebars.tplCache[tplName](messages[tplName]);
  }).join('');
}

function clearMessage(location) {
  updateMessage(location, {});
}

function getResultPosition(el){
    return getResultOrChildAttr(el, 'idx');
}

function getResultKind(el){
    return getResultOrChildAttr(el, 'kind').split(';');
}

// bubbles up maximum to the result container
function getResultOrChildAttr(el, attr) {
  if (el == null) return '';
  if (el.className == IC) return el.getAttribute(attr) || '';
  return el.getAttribute(attr) || getResultOrChildAttr(el.parentElement, attr);
}

function getElementByAttr(el, attr, val) {
  if (el && el.getAttribute(attr) === val) {
    return el;
  }
  if (el === null) return null;
  if (el.classList.contains(IC)) return null;

  return getElementByAttr(el.parentNode, attr, val);
}

function urlIndexInHistory(url, urlList) {
    var index = 0;
    for(var key in urlList) {
      if (urlList[key].href == url) {
        index = urlList.indexOf(urlList[key]);
        if (currentResults.results[0].data.cluster === true) {
          index += 1;
        }
        break;
      }
    }
    return index;
}

    function messageClick(ev) {

        var el = ev.target;
        // Handle adult results

        while (el && (ev.button == 0 || ev.button == 1) && !el.classList.contains("cliqz-message-container")) {
            var action = el.getAttribute('cliqz-action');

            /*********************************/
            /* BEGIN "Handle message clicks" */

            if (action === 'footer-message-action') {
                // "Cliqz is not optimized for your country" message */

                var state = ev.target.getAttribute("state");

                switch (state) {
                    //not supported country
                    case 'disable-cliqz':
                        clearMessage('bottom');
                        CliqzEvents.pub('autocomplete:disable-search', {
                          urlbar: urlbar
                        });
                        break;
                    case 'keep-cliqz':
                        clearMessage('bottom');
                        // Lets us know that the user has ignored the warning
                        CliqzUtils.setPref('ignored_location_warning', true);
                        break;

                    case 'spellcorrect-revert':
                        var revertedInput = CliqzAutocomplete.spellCheck.revert(urlbar.value);
                        urlbar.mInputField.setUserInput(revertedInput);
                        clearMessage('bottom');
                        break;
                    case 'spellcorrect-keep':
                        CliqzAutocomplete.spellCheck.keep();
                        clearMessage('bottom');
                        break;
                    case 'dismiss':
                        clearMessage('bottom');
                        var pref = ev.target.getAttribute("pref");
                        if (pref && pref != "null")
                            CliqzUtils.setPref(pref, false);
                        break;
                    case 'set':
                        clearMessage('bottom');
                        var pref = ev.target.getAttribute("pref");
                        var prefVal = ev.target.getAttribute("prefVal");
                        if (pref && prefVal && pref != "null" && prefVal != "null")
                            CliqzUtils.setPref(pref, prefVal);
                        break;
                    case 'adult-conservative':
                    case 'adult-showOnce':
                    case 'adult-liberal':
                        //Adult state can be conservative, moderate, liberal
                        var state = state.split('-')[1],
                            ignored_location_warning = CliqzUtils.getPref("ignored_location_warning"),
                            user_location = CliqzUtils.getPref("config_location");

                        if (state === 'showOnce') {
                            // Old Logic telemetry, that is why is hardcoded not to break the results
                            state = 'yes'
                            adultMessage = 1;
                        } else {
                            CliqzUtils.log("SETTING","UI");
                            CliqzUtils.setPref('adultContentFilter', state);
                        }
                        clearMessage('bottom');
                        UI.render();
                        if (notSupported())
                            updateMessage('bottom', {
                                "footer-message": getNotSupported()
                            });
                        break;
                    default:
                        break;
                }
                CliqzEvents.pub('ui:dropdown_message_click',
                  ev.target.getAttribute('state'));
                CliqzUtils.telemetry({
                    type: 'setting',
                    setting: el.getAttribute('cliqz-telemetry'),
                    value: state
                });
            }
            /* Propagate event up the DOM tree */
            el = el.parentElement;
        }

    /*  END "Handle message clicks"  */
    /*********************************/

}


function logUIEvent(el, historyLogType, extraData, query) {
  if (!el)
    return;

  if(!query)
    query = urlbar.value;
  var queryAutocompleted = null;
  if (urlbar.selectionEnd !== urlbar.selectionStart) {
      var first = gCliqzBox.resultsBox && gCliqzBox.resultsBox.children[0];
      if (first && !CliqzUtils.isPrivateResultType(getResultKind(first)))
          queryAutocompleted = query;
      if(extraData.action != "result_click")
        var autocompleteUrl = urlbar.mInputField.value;
      query = query.substr(0, urlbar.selectionStart);
  }
  if(typeof el.getAttribute != 'function')
    el.getAttribute = function(k) { return this[k]; };

  let url = CliqzUtils.cleanMozillaActions(el.getAttribute('url') || '')[1];
  if (!url)
    return;

  let lr = CliqzAutocomplete.lastResult;
  let result_order = currentResults &&
      CliqzAutocomplete.prepareResultOrder(currentResults.results);
  // Extra data about the link. Note: resultCliqz passes extra in extraData,
  // but not other events, e.g. enter (8Jul2015)
  let action = {
    type: 'activity',
    current_position: getResultPosition(el),
    query_length: CliqzAutocomplete.lastSearch.length,
    // Link inside the result or the actual result
    inner_link: el.className ? el.className != IC : false,
    position_type: getResultKind(el),
    extra: extraData['extra'] || el.getAttribute('extra'),
    search: CliqzUtils.isSearch(url),
    has_image: el.getAttribute('hasimage') || false,
    clustering_override: !!(lr && lr._results[0] && lr._results[0].override),
    reaction_time: (new Date()).getTime() - CliqzAutocomplete.lastQueryTime,
    display_time: CliqzAutocomplete.lastDisplayTime ?
        (new Date()).getTime() - CliqzAutocomplete.lastDisplayTime : null,
    result_order: result_order,
    v: 2.1
  };
  for (let key in extraData) {
    action[key] = extraData[key];
  }
  CliqzUtils.telemetry(action);

  if (CliqzUtils.isOnPrivateTab(window))
    return;

  CliqzUtils.resultTelemetry(
      query,
      queryAutocompleted,
      getResultPosition(el),
      CliqzUtils.isPrivateResultType(action.position_type) ? '' : url,
      result_order,
      action.extra
  );

  if (isValidURL(url)) {
    CliqzEvents.pub("ui:click-on-url",
        {
          url: decodeURIComponent(url),
          query: CliqzAutocomplete.lastSearch,
          type: CliqzUtils.isPrivateResultType(action.position_type) ?
              'othr' : 'cl',
          positionType: action.position_type
        }
    );
  }
}

// user scroll event
function resultScroll(ev) {
    CliqzAutocomplete.hasUserScrolledCurrentResults = true;
}

function copyResult(val) {
    CliqzUtils.copyResult(val);
}

function resultClick(ev) {
    var el = ev.target, url,
        newTab = ev.metaKey || ev.button == 1 ||
            ev.ctrlKey ||
            (ev.target.getAttribute('newtab') || false);
    var extra = null;

    var coordinate = null;
    if (urlbar && UI.getPopupDimensions) {
      let popupDimensions = UI.getPopupDimensions(urlbar, window),
          urlbarBox = urlbar.getBoundingClientRect(),
          urlbarX = (urlbarBox.left || urlbarBox.x || 0),
          urlbarY = urlbarBox.bottom;
      coordinate = [ev.clientX - urlbarX - popupDimensions.x , ev.clientY - urlbarY - popupDimensions.y, CLIQZ.Core.popup.width || window.innerWidth];
    }


    while (el && (ev.button == 0 || ev.button == 1)) {
        extra = extra || el.getAttribute("extra");
        url = el.getAttribute("href") || el.getAttribute('url');
        if (url && url != "#") {
            el.setAttribute('url', url); //set the url in DOM - will be checked later (to be improved)
            var localSource = getResultOrChildAttr(el, 'local-source');

            var signal = {
                action: "result_click",
                new_tab: newTab,
                extra: extra,
                mouse: coordinate,
                local_source: localSource,
                position_type: getResultKind(el)
            };
            logUIEvent(el, "result", signal, CliqzAutocomplete.lastSearch);

            //publish result_click
            const lastResults = CliqzAutocomplete.lastResult && CliqzAutocomplete.lastResult._results;
            if(lastResults){
              const result = lastResults.find(res => res.label === url);
              signal.isLocal = UI.isLocal(result);
              signal.hasAskedForLocation = UI.hasAskedForLocation(result);
            }
            CliqzEvents.pub("result_click", signal, {});

            if (!privateWindow && localSource.indexOf('switchtab') != -1) {
              let prevTab = gBrowser.selectedTab;
              if (switchToTabHavingURI(url) && isTabEmpty(prevTab)) {
                gBrowser.removeTab(prevTab);
              }
              return;
            }
            else {
              CliqzUtils.openLink(window, url, newTab);
            }

            //decouple!
            window.CliqzHistoryManager && window.CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, url);
            if (!newTab) CliqzEvents.pub('ui:popup_hide');
            break;
        } else if (el.getAttribute('cliqz-action')) {
            switch (el.getAttribute('cliqz-action')) {
                case 'copy_val':
                    copyResult(el.textContent.trim());
                    return;
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    copyResult(document.getElementById('calc-answer').innerHTML);
                    document.getElementById('calc-copied-msg').style.display = "";
                    document.getElementById('calc-copy-msg').style.display = "none";
                    break;
                case 'toggle':
                    var toggleId = el.getAttribute('toggle-id');
                    var context = el.getAttribute('toggle-context');
                    if (toggleId && context) {
                        var toggleAttr = el.getAttribute('toggle-attr') || 'cliqz-toggle';
                        var ancestor = closest(el, '.' + context);
                        var toggleElements = $$("[" + toggleAttr + "]", ancestor);
                        for (var i = 0; i < toggleElements.length; i++) {
                            if (toggleElements[i].getAttribute(toggleAttr) == toggleId) {
                                toggleElements[i].style.display = "";
                            } else {
                                toggleElements[i].style.display = "none";
                            }
                        }
                        return;
                    }
                case 'searchEZbutton':
                    ev.preventDefault();
                    navigateToEZinput($('input', el));
                    return;
                case 'alternative-search-engine':
                    enginesClick(ev);
                    return;
                default:
                    break;
            }
        } else {
          var elId = el.getAttribute("id");
          if( elId in UI.clickHandlers ) {
            UI.clickHandlers[elId](ev);
            break;
          }
        }

        if (el.classList.contains(IC)) break; //do not go higher than a result
        el = el.parentElement;
    }
}



function getResultSelection(){
    return $('[arrow="true"]', gCliqzBox);
}

function clearResultSelection(){
    UI.keyboardSelection = null;
    var el = getResultSelection();
    el && el.setAttribute('arrow', 'false');
    var arrow = $('.cqz-result-selected', gCliqzBox);
    arrow && arrow.removeAttribute('active');
}

function selectNextResult(pos, allArrowable) {
    if (pos != allArrowable.length - 1) {
        var nextEl = allArrowable[pos + 1];
        setResultSelection(nextEl, false, true);
        arrowNavigationTelemetry(nextEl);
    }
}

function selectPrevResult(pos, allArrowable) {
    var nextEl = allArrowable[pos - 1];
    setResultSelection(nextEl, true, true);
    arrowNavigationTelemetry(nextEl);
}

function setResultSelection(el, scrollTop, changeUrl, mouseOver){
    if(el && el.getAttribute("url")){
        //focus on the title - or on the arrow element inside the element
        var target = $('.cqz-ez-title', el) || $('[arrow-override]', el) || el;
        var arrow = $('.cqz-result-selected', gCliqzBox);

        if(!target.hasAttribute('arrow-override') &&
          el.getElementsByClassName("cqz-ez-title").length != 0 && mouseOver) return;

        // Clear Selection
        clearResultSelection();

        if(target != el){
            //arrow target is now on an inner element
            el.removeAttribute('arrow');
            target.setAttribute('url', el.getAttribute('url'));
        }
        arrow.className = arrow.className.replace(" notransition", "");
        if(!mouseOver &&
           (el.getAttribute("url") == UI.lastSelectedUrl ||
            el.getAttribute('type') && el.getAttribute('type').indexOf('cliqz-custom') == 0)){
          arrow.className += " notransition";
        }

        UI.lastSelectedUrl = el.getAttribute("url");

        var offset = target.offsetTop;
        if(target.hasAttribute("useParentOffset")){
          offset += target.parentElement.offsetTop || target.parentElement.parentElement.offsetTop
        }

        if(el.hasAttribute('arrow-override') || target.hasAttribute('arrow-override')){
          offset += closest(el, '.cqz-result-box').offsetTop;
        }

        if (target.classList.contains("cliqz-pattern")) {
          var context = $('.cqz-result-pattern', gCliqzBox);
          if(context) offset += context.parentElement.offsetTop;
        }

        if (!mouseOver) {
          //make the whole result visible
          closest(target, '.cqz-result-box').scrollIntoView({block: "end", behavior: "smooth"});
        }

        target.setAttribute('arrow', 'true');
        arrow.style.top = (offset + target.offsetHeight/2 - 7) + 'px';
        if (CliqzUtils.dropDownStyle !== 'simple') {
          arrow.setAttribute('active', 'true');
        }

        // update the URL bar with the selected URL
        if (UI.lastInput == "") {
            if (urlbar.selectionStart !== urlbar.selectionEnd)
                UI.lastInput = urlbar.value.substr(0, urlbar.selectionStart);
            else
                UI.lastInput = urlbar.value;
        }
        if(changeUrl)
            urlbar.value = el.getAttribute("url");

        if (!mouseOver)
          UI.keyboardSelection = target;

        CliqzUtils.onSelectionChange(el);
    } else if (changeUrl && UI.lastInput != "") {
        urlbar.value = UI.lastInput;
        UI.lastSelectedUrl = "";
        clearResultSelection();
    }
}

function getStatus(ev, el){
  var oTarget = ev.target || ev.srcElement;

  return /* newtab */ (oTarget.hasAttribute('newtab') && el.getAttribute('url') ?
          CliqzUtils.getLocalizedString("openInNewTab", el.getAttribute('url')) : ''
     )
     ||
     //deepUrl
     (oTarget.hasAttribute('show-status') &&
        (oTarget.getAttribute('url')
          ||
         oTarget.parentElement.hasAttribute('show-status') && oTarget.parentElement.getAttribute('url'))
     )
     ||
     //arrowUrl
     (el.hasAttribute('arrow') ? el.getAttribute('url') : '');
}

var lastMoveTime = Date.now();
function resultMove(ev){
  if (UI._scrolling || (Date.now() - lastMoveTime) < 50)
    return;
  lastMoveTime = Date.now();

  var el = ev.target;
  while (el && !el.classList.contains(IC) && !el.hasAttribute('arrow')) {
      el = el.parentElement;
  }
  setResultSelection(el, false, false, true);

  if (el)
    XULBrowserWindow.setOverLink(getStatus(ev, el) || '');
}

function onEnter(ev, item){
  var input = urlbar.mInputField.value;
  var cleanInput = input;
  var lastAuto = CliqzAutocomplete.lastAutocomplete ? CliqzAutocomplete.lastAutocomplete : "";
  var urlbar_time = CliqzAutocomplete.lastFocusTime ? (new Date()).getTime() - CliqzAutocomplete.lastFocusTime: null;
  var newTab = ev.metaKey || ev.altKey;
  var isFFaction = false;

  // Check if protocols match
  if(input.indexOf("://") == -1 && lastAuto.indexOf("://") != -1) {
    if(CliqzUtils.generalizeUrl(lastAuto)
    == CliqzUtils.generalizeUrl(input))
      input = lastAuto;
  }

  // Check for login url
  if(input.indexOf("@") != -1 &&
    input.split("@")[0].indexOf(":") != -1) {
      if(input.indexOf("://") == -1)
        input = "http://" + input;
      var login = input.substr(input.indexOf("://")+3, input.indexOf("@")-input.indexOf("://")-2);
      cleanInput = input.replace(login, "");
  }

  // Logging
  // Autocomplete
  if (CliqzUtils.generalizeUrl(lastAuto)
  == CliqzUtils.generalizeUrl(input) &&
  urlbar.selectionStart !== 0 && urlbar.selectionStart !== urlbar.selectionEnd) {
    var localSource = getResultOrChildAttr(UI.keyboardSelection, 'local-source');

    logUIEvent(UI.keyboardSelection, "autocomplete", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      autocompleted: CliqzAutocomplete.lastAutocompleteActive,
      autocompleted_length: CliqzAutocomplete.lastAutocompleteLength,
      position_type: ['inbar_url'],
      local_source: localSource,
      source: getResultKind(item),
      current_position: -1,
      new_tab: newTab
    });

    //publish autocomplete event
    CliqzEvents.pub('autocomplete', {"autocompleted": CliqzAutocomplete.lastAutocompleteActive});

    [input, isFFaction] = tryHandleFirefoxActions(localSource, input);
  }
  // Google
  else if ((!CliqzUtils.isUrl(input) && !CliqzUtils.isUrl(cleanInput)) || input.endsWith('.')) {
    if(currentResults &&
      CliqzUtils.getPref("double-enter2", false) &&
      input.indexOf('about:') !== 0 &&
      !currentResults.blocked && // ignore enter only once
      (CliqzAutocomplete.lastQueryTime + 1500 > Date.now())){

      var r = currentResults.results;

      // simplifying complex condition
      let notCustom = (r.length > 0) && (r[0].vertical != 'custom')
      let notBlockedAndExists = !currentResults.blocked
                                && (r.length > 1 || r[0].vertical != 'noResult')

      if(notCustom && notBlockedAndExists) {
        currentResults.blocked = true;
        var signal = {
            type: 'activity',
            action: 'double_enter'
        };
        CliqzUtils.telemetry(signal);
        return true;
      }
    }

    logUIEvent({url: input}, "google", {
      action: "result_enter",
      position_type: ['inbar_query'],
      urlbar_time: urlbar_time,
      current_position: -1
    });

    CliqzEvents.pub("alternative_search", {
        cleanInput: cleanInput,
        lastAuto: lastAuto
    });

    CLIQZ.Core.triggerLastQ = true;

    var customQuery = CliqzAutocomplete.CliqzResultProviders.customizeQuery(input);
    if(customQuery){
        urlbar.value = customQuery.queryURI;
    }

    if (input.endsWith('.')) {
      var engine = CliqzUtils.getDefaultSearchEngine();
      urlbar.value = engine.getSubmissionForQuery(input);
    }
    return false;
  }
  // Typed
  else if (!getResultSelection()){
    logUIEvent({url: input}, "typed", {
      action: "result_enter",
      position_type: ['inbar_url'],
      urlbar_time: urlbar_time,
      current_position: -1,
      new_tab: newTab
    }, urlbar.mInputField.value);
    CLIQZ.Core.triggerLastQ = true;

    CliqzEvents.pub("alternative_search", {
      cleanInput: cleanInput,
      lastAuto: lastAuto
    });
  // Result
  } else {
    var localSource = getResultOrChildAttr(UI.keyboardSelection, 'local-source');

    logUIEvent(UI.keyboardSelection, "result", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      new_tab: newTab,
      local_source: localSource
    }, CliqzAutocomplete.lastSearch);

    CliqzEvents.pub("result_enter", {"position_type": getResultKind(UI.keyboardSelection)}, {'vertical_list': Object.keys(VERTICALS)});

    [input, isFFaction] = tryHandleFirefoxActions(localSource, input);
  }

  //might be expensive
  setTimeout(function(){
    window.CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, input);
  }, 0);

  if(isFFaction){
    // we delegate to FF all their actions
    if(CLIQZ.Core.urlbar) {
      CLIQZ.Core.urlbar.value = input;
      CLIQZ.Core.urlbar.mInputField.value = input;
    }
    return false;
  } else {
    CliqzUtils.openLink(window, input, newTab, false, false);
    return true;
  }
}

function tryHandleFirefoxActions(localSource, input) {
  if( localSource && localSource.indexOf('switchtab') !== -1 ){
    // we delegate this one to Firefox

    // protocol is required for firefox actions
    if(input.indexOf("://") == -1 && input.trim().indexOf('about:') != 0)
      input = "http://" + input;

    return ["moz-action:switchtab," + JSON.stringify({url: input}), true];
  } else {
    return [input, false];
  }
}

function enginesClick(ev){
    var el = ev.target,
        engineName = getResultOrChildAttr(el, 'engine');

    if(engineName){
        var engine = CliqzUtils.getEngineByName(engineName);
        if(engine){
            var userInput = urlbar.value;

            // avoid autocompleted urls
            if(urlbar.selectionStart &&
               urlbar.selectionEnd &&
               urlbar.selectionStart != urlbar.selectionEnd){
                userInput = userInput.slice(0, urlbar.selectionStart);
            }

            var url = engine.getSubmissionForQuery(userInput),
                action = {
                    type: 'activity',
                    action: 'visual_hash_tag',
                    engine: ev.target.getAttribute('engineCode') || -1
                };

            if(ev.metaKey || ev.ctrlKey){
                CliqzUtils.openLink(window, url, true);
                action.new_tab = true;
            } else {
                CliqzUtils.openLink(window, url);
                CLIQZ.Core.popup.closePopup();
                action.new_tab = false;
            }

            CliqzUtils.telemetry(action);
        }
    }
}

function arrowNavigationTelemetry(el){
    var action = {
        type: 'activity',
        action: 'arrow_key',
        current_position: getResultPosition(el),
    };
    if(el){
        // for inner link info
        if(el.getAttribute('extra'))
            action.extra = el.getAttribute('extra');

        action.position_type = getResultKind(el);
        var url = getResultOrChildAttr(el, 'url');
        action.search = CliqzUtils.isSearch(url);
    }
    CliqzUtils.telemetry(action);
}

// only consider results which fill the first 3 slots
function snippetQualityTelemetry(results){
  var data = [], slots = 0;
  for(var i=0; i<results.length && slots <3; i++){
    var r = results[i];
    if(r.vertical && r.vertical.indexOf('pattern') != 0 && r.type != 'cliqz-extra')
      data.push({
        logo: (r.logo && r.logo.backgroundImage) ? true : false,
        desc: (r.data && r.data.description) ? true : false
      })
    // push empty data for EZones and history
    else data.push({});

    slots += CliqzUtils.TEMPLATES[r.vertical];

    // entity generic can be 3 slots height
    if(r.vertical == 'entity-generic' && r.data.urls) slots++;

    // hq results are 3 slots height if they have images
    if(r.vertical == 'hq' && r.data) {
      (r.data.deepResults || []).forEach(function(dr) {
        if (dr.type === 'images' && dr.links.length > 0) slots++;
      });
    }
  }

  CliqzUtils.telemetry({
    type: 'snippet',
    action: 'quality',
    data: data
  });
}

function handleMouseDown(e) {
  var walk_the_DOM = function walk(node) {
    while(node) {
      if (node.classList.contains(IC)) return; //do not go higher that results box
      //disable onclick handling for anchor tags, click event handling is left on the div
      //type window.location.href = SOME_URL in the console to see what would happen otherwise:-)
      if (node.tagName === 'a') {
        node.setAttribute('onclick', 'return false;');
        e.preventDefault();
        return false;
      } else {
        //case we clicked on an em, we need to walk up the DOM
        node = node.parentNode;
        walk(node);
      }
    }
  }
  walk_the_DOM(e.target || e.srcElement);
}

    function smCqzAnalogClock(elm) {

        if (!elm)
            return


        var element = elm,
            gethand = function (value, fullcircle) {
                return value * 2 * Math.PI / fullcircle - Math.PI / 2
            },
            lpad = function (n) {
                var ns = n.toString()

                return ns.length == 1 ? "0" + ns.toString() : ns
            }

        var curDate = elm.dataset.time;


        for (var i = 0; i < 12; i++) {
            var item = $(".notch", element);
            var itemClone = $('.clock', element).appendChild(item.cloneNode(true));

            itemClone.style.cssText = "transform: rotateZ(" + gethand(i, 12) + "rad)";
        }

        var curTime = elm.dataset.time.split(':');
        var tick = function () {
            if (elm && elm.offsetParent) {
                //setTimeout(tick, 1000);
            } else {
                return
            }

            var actualTime = new Date(),
                d = new Date();

            actualTime.setHours(curTime[0]);
            actualTime.setMinutes(curTime[1]);


            var hourDiff = d.getHours() - actualTime.getHours(),
                minDiff = d.getMinutes() - actualTime.getMinutes();


            d.setHours(d.getHours() - hourDiff);
            d.setMinutes(d.getMinutes() - minDiff);

            var hour = gethand(d.getHours() + d.getMinutes() / 60, 12),
                minute = gethand(d.getMinutes() + d.getSeconds() / 60, 60),
                second = gethand(d.getSeconds(), 60)

            $(".hand-hour", element).style.cssText = "transform: rotateZ(" + hour + "rad);";
            $(".hand-minute", element).style.cssText = "transform: rotateZ(" + minute + "rad);";
            $(".hand-second", element).style.cssText = "transform: rotateZ(" + second + "rad);";
        }

       setTimeout(tick, 100);
    }


UI.clickHandlers = {};
function loadViews() {
  Object.keys(CliqzHandlebars.TEMPLATES)
    .concat(CliqzHandlebars.MESSAGE_TEMPLATES)
    .concat(CliqzHandlebars.PARTIALS)
    .forEach(function (templateName) {
      UI.VIEWS[templateName] = Object.create(null);
      try {
        var module = System.get(System.normalizeSync("ui/views/"+templateName));
        if (module) {
          UI.VIEWS[templateName] = new module.default(ctx);

          if(UI.VIEWS[templateName].events && UI.VIEWS[templateName].events.click){
            Object.keys(UI.VIEWS[templateName].events.click).forEach(function (selector) {
              UI.clickHandlers[selector] = UI.VIEWS[templateName].events.click[selector];
            });
          }
        }
      } catch (ex) {
        ctx.console.error(ex);
      }

    });
}

ctx.CLIQZ.UI = UI;

};

load(this)
