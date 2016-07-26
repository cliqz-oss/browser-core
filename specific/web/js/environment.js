var db = {
    showConsoleLogs: true,
    share_location: 'ask'
};

var ENGINES,
    contextMenu,
    contextMenuState = 0,
    contextMenuActive = 'context-menu-active',
    menuPosition,
    menuPositionX,
    menuPositionY;

CLIQZEnvironment = {
    logScreen() {},
  	TEMPLATES_PATH: _cliqzIsMobile ? '/mobile/search/templates/' : './static/templates/',
    LOCALE_PATH: './static/locale/',
    SKIN_PATH: './static/skin/',
    log: function(msg, key){ console.log(key, msg) },
    getPref: function(k, d){return db[k] || d; },
    setPref: function(k,v){db[k] = v},
    setInterval: function(){ return setInterval.apply(null, arguments) },
    setTimeout: function(){ return setTimeout.apply(null, arguments) },
    clearTimeout: function(){ clearTimeout.apply(null, arguments) },
    tldExtractor: function(host){
    	//temp
    	return host.split('.').splice(-1)[0];
    },
    OS: 'darwin',
    isPrivate: function(){ return false; },
    getWindow: function(){ return window; },
    httpHandler: function(method, url, callback, onerror, timeout, data){
        var req = new XMLHttpRequest();
        req.open(method, url, true);
        req.overrideMimeType('application/json');
        req.onload = function(){
            if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
                callback && callback(req);
            } else {
                CLIQZEnvironment.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CLIQZEnvironment){
                CLIQZEnvironment.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CLIQZEnvironment){ //might happen after disabling the extension
                CLIQZEnvironment.log( "timeout for " + url, "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }

        if(callback){
            if(timeout){
                req.timeout = parseInt(timeout)
            } else {
                req.timeout = (method == 'POST'? 10000 : 1000);
            }
        }

        req.send(data);
        return req;
    },
    openLink: function(win, url, newTab, newWindow) {
        // Don't open links for mobile because the swipe causes random click events
        // on non-touch devices
        if (!_cliqzIsMobile) {
          if(newTab) {
            win.open(url,'_blank');
          } else if(newWindow) {
            win.open(url, '_blank', 'height=800,width=800');
          }
        }
    },
    historySearch: function(q, callback, searchParam, sessionStart){
        var res = [];
        if (!_cliqzIsMobile) {
            for (var i = 0; i<30; i++) {
                res.push({
                    style:   'favicon',
                    value:   'http://coolurl.com/' + i ,
                    image:   '',
                    comment: q + ' Title ' +i,
                    label:   ''
                });
            }
            setTimeout(function(q,res){
                callback({
                    query: q,
                    results: q.length % 2 == 0?res:[],
                    ready:  true
                });
            }, 10, q, res);
        }
    },
    getSearchEngines: function(){
        return ENGINES.map(function(e){
            e.getSubmissionForQuery = function(q){
                //TODO: create the correct search URL
                return e.searchForm;
            }

            return e
        });
    },
    updateAlias: function(name, newAlias) {
      for(var engine in ENGINES) {
          if(ENGINES[engine].name === name) {
            ENGINES[engine].alias = newAlias;
          }
      }
    },
    getEngineByAlias: function(alias) {
      return ENGINES.find(function (engine) { return engine.alias === alias; });
    },
    getEngineByName: function(name) {
      return ENGINES.find(function (engine) { return engine.name === name; });
    },
    addEngineWithDetails: function(engine) {
      return;
    },
    createContextMenu: function(box, menuItems) {
      if (contextMenu == undefined) {
        contextMenu = document.createElement('ul');
        contextMenu.setAttribute('class', 'context-menu');
        for(var item = 0; item < menuItems.length; item++) {
          if (menuItems[item].displayInDebug) {
            var menuItem = document.createElement('li');
            menuItem.setAttribute('class', 'context-menu-item');
            menuItem.addEventListener('click', menuItems[item].command);
            contextMenu.appendChild(menuItem);
            menuItem.innerHTML = menuItems[item].label;
          }
        }
        document.body.appendChild(contextMenu);
        CLIQZEnvironment.clickListener();

      }
      return contextMenu;
    },
    clickListener: function() {
      document.addEventListener('click', function(e) {
          var button = e.which || e.button;
          //hide the context menu when left mouse is clicked
          if (button === 1) {
            CLIQZEnvironment.toggleContextMenuOff();
          }
      });
    },
    openPopup: function(contextMenu, ev, x, y) {
      ev.preventDefault();
      CLIQZEnvironment.toggleContextMenuOn();
      CLIQZEnvironment.positionMenu(ev);
    },
    toggleContextMenuOn: function() {
      if(contextMenuState !== 1) {
        contextMenuState = 1;
        contextMenu.classList.add(contextMenuActive);
      }
    },
    toggleContextMenuOff: function() {
      if(contextMenuState !== 0) {
        contextMenuState = 0;
        contextMenu.classList.remove(contextMenuActive);
      }
    },
    getContextMenuPosition: function(e) {
      var posX = 0,
          posY = 0;

      if (!e) var e = window.event;

      if (e.pageX || e.pageY) {
        posX = e.pageX;
        posY = e.pageY;
      } else if (e.clientX || e.clientY) {
        posX = e.clientX + document.body.scrollLeft +
                document.documentElement.scrollLeft;
        posY = e.clientY + document.body.scrollTop +
                       document.documentElement.scrollTop;
      }

      return {
        x: posX,
        y: posY
      }
    },
    positionMenu: function(e) {
      menuPosition = CLIQZEnvironment.getContextMenuPosition(e);
      menuPositionX = menuPosition.x + "px";
      menuPositionY = menuPosition.y + "px";

      contextMenu.style.left = menuPositionX;
      contextMenu.style.top = menuPositionY;
    }
}

// shimming FF specific stuff
CliqzLanguage = {
	stateToQueryString: function(){ return ''; }
}

CliqzHistory = {
    updateQuery: function(){},
    setTabData: function(){}
}
XPCOMUtils = {
	defineLazyModuleGetter: function(){},
    generateQI: function(){},
}
Services = {
	scriptloader: {
		loadSubScript: function(){}
	}
}

Components = {
    interfaces: {
        nsIAutoCompleteResult: {}
    },
	utils: {
		import: function(){}
	},
    ID: function(){}
}


ENGINES = [
    {
        "name": "Google",
        "alias": "#go",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAB9AQAAJgAAACAgAAAAAAAA8gIAAKMBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAFESURBVDjLpZNJSwNBEIXnt4lE4kHxovgT9BDwJHqPy0HEEOJBiAuCRg+KUdC4QS4KrpC4gCBGE3NQ48JsnZ6eZ3UOM6gjaePhQU93v6+qq2q0pqgeJj2S8EdJT1hr0OxBtKCD5iEd8QxDYpvhvOBAuMDKURX9C9aPu4GA1GEVkzvMg10UBfYveWAWgYAP00V01fa+R9M2bA51wJvhIn3qR+ybt3D3JNQBE5sMjCIOLFpoHzOwdsLRO22qA6R6kiZiWwxUvy/PUQZIhYZ1vFM9cvcOOsYNdcBgysISdSJBnZjJMlR0Fw8vAp0xoz5gao/h+NZBy4i/10XGwrPA+hmvDyhVRG2Avu/LwcrkFADZa16L1h330w1RNgc3DiJzCpPYRm1bpveXX11clQR28xwblHpk1vq1iP/5mcoS0CoXDZiL0vsJ+dzfl+3T/VYAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAK5SURBVFjDxVfrSxRRFJ9/Jta/oyWjF5XQm6D6EkHRgygIIgjUTcueVgqVWSRRkppEUQYWWB8ye1iGWilWlo/Ude489s7M6Zw7D9dlt53dmd29cFiWvXvO77x+51xpaaUsoSxBaUWZQ4ECy5xji2xKZDyCMlMEw6lCNiOSgwZKJK1SkcKeSealfP64t0mBjl4Ow39MkDUL0p2RSROOtqhZdeUEYM1pBl39XCg/fEeFtWcY7G9W4csvUxjlBkCsQ4Nt9QyWVfvT6RsAKXw3aoDGATZeYIt+W1kjw7cJG0RctWDTRebbKd8A6h5pwsDb70ba3w/eUr3wt/cmwgfw6Yft4TNMQaY7o1P2ncm4FT4ANQH/jQBJ2xv7kqIXEADDql8eS3+n8bku7oxNm+EDIM/dU92upb3T/NJGeaNbDx/AsbsLRUY5Xn92caWXY5d8RV6gWllxSg4fAEnTC90DQW13BLlgXR2D3dcUeDVkwOthA1bXspxILWcm3HdThcfvufB26LcJpkOEAz9NKI/lzqpSEC7feol5EWnpSeSlIxCALUkApmULdjUqxQVAQnl3D/X/yQda4QBEq2TYc12By091MQ17Bg3R88nHKlQbVmHvj89awNBLYrwT9zXY2aBAxTkGFdiSxP/Jp6FLDw+AS7GfsdJTJ2EqSO5khD43nGfBARy/ZxOQgZHe7GPM1jzUvChUtmnBAXQPcKGMJp3fdFGq6NByEhiAO4b/YptFfQJwNyQ/bZkVQGcf90Ja25ndIyrKBOa/f8wIpwi3X1G8UcxNu7ozUS7tiH0jBswwS3RIaF1w6LYKU/ML2+8sGnjygQswtKrVIy/Qd9qQP6LnO64q4fPAKpxyZIymHo1jWk6p1ag2BsdNwQMHcC+M5kHFJX+YlPxpVlbCx2mZ5DzPI04k4kUwHHdskU3pH76iftG8yWlkAAAAAElFTkSuQmCC",
        "code": 3,
        "searchForm": "https://www.google.com/search?q=&ie=utf-8&oe=utf-8"
    },
    {
        "name": "Bing",
        "alias": "#bi",
        "icon": "data:image/x-icon;base64,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",
        "code": 5,
        "searchForm": "https://www.bing.com/search?q=&pc=MOZI"
    },
    {
        "name": "Google Images",
        "alias": "#gi",
        "icon": "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
        "code": 1,
        "searchForm": "http://www.google.de"
    },
    {
        "name": "Google Maps",
        "alias": "#gm",
        "icon": "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
        "code": 2,
        "searchForm": "http://maps.google.de"
    },
    {
        "name": "Ask.com",
        "alias": "#as",
        "icon": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8An5/t/1BQ3v8AAM//AADP/wAAz/8AAM//MDDY/3Bw5P/Pz/b/////AP///wD///8A////AP///wD///8AQEDb/wAAz/8AAM//AADP/wAAz/8AAM//AADP/wAAz/8AAM//AADP/0BA2//f3/n/////AP///wD///8Af3/n/wAAz/+Skuv/kJDq/wAAz/8AAM//AADP/wAAz/8AAM//AADP/wAAz/8AAM//EBDS/5+f7f////8A////ABAQ0v8AAM//YGDh//////9NTd3/j4/q/8DA8///////4OD5/wAAz/+Bgef/Dw/S/0BA2/8AAM//n5/t/////wAAAM//AADP/wAAz//g4Pn////////////AwPP/TU3d/8/P9v///////////56e7f/g4Pn/AADP/wAAz//f3/n/AADP/wAAz/8AAM//X1/h//Dw/P+Njer/gIDn/15e4f//////fn7n////////////jo7q/wAAz/8AAM//YGDh/1BQ3v8AAM//AADP/wAAz//g4Pn/4OD5/39/5/+xsfD/4OD5/wAAz//Q0Pb//////8DA8/8AAM//AADP/wAAz//Pz/b/AADP/wAAz/8AAM//YGDh//////+AgOf/Li7Y/8HB8/+QkOr/r6/w/87O9v/w8Pz/UFDe/wAAz/8AAM//////AJ+f7f8AAM//AADP/wAAz//g4Pn/YGDh/wAAz/8AAM//AADP/4CA5//g4Pn/AADP/wAAz/8AAM//EBDS/////wD///8An5/t/wAAz/8AAM//cXHk/0BA2/8AAM//AADP/wAAz/9AQNv//////wAAz/8AAM//AADP/3Bw5P////8A////AP///wDPz/b/QEDb/wAAz/8AAM//AADP/wAAz/8AAM//EBDS/8HB8/8AAM//AADP/0BA2/////8A////AP///wD///8A////AP///wC/v/P/YGDh/yAg1f8AAM//AADP/wAAz/8AAM//AADP/5+f7f////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AADAHwAAgAcAAAADAAAAAQAAAAAAAAAAAAAAAAAAAAAAAIAAAADAAAAA4AEAAPgDAAD//wAA//8AAA==",
        "code": 0,
        "searchForm": "http://www.ask.com/"
    },
    {
        "name": "DuckDuckGo",
        "alias": "#du",
        "icon": "data:image/icon;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAATCwAAEwsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA11RgALs6oACbQ9wAj0v8AI9L/ACfQ9wAu0agANdUYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzzN4CNdL/oK/z//////////////////////+jsPv/BDXX/wAz0t4AAAAAAAAAAAAAAAAAAAAAAAAAAAAyzvNSduD//////8jK/v+P+Lf/IbQL/17RPP+J3Y//wOKX//////9YeuX/ADLO8wAAAAAAAAAAAAAAAAAw091piOX/8/X9/1Fx5P9xhu//WOWZ/0W9Lv9Lwjn/J8BB/xyDAP9bdfL/9fP//2mI5v8AMNPdAAAAAAc610YRQ9f//////0Zr4P8AGdD/sb32////////////wrv//wAh1/8MPab/ACPc/05r4///////EkPX/wc610YANtWkrr/y/6S48P8AJ9L/AB3R/+/w/v///////////3+D7f8AQeL/AYTw/wFr5/8AMNb/p7Tv/6698v8AM9WkADLW//////8yXt//AC3V/wAw1/////////////z///8A0P7/AKb1/wWI7P8AuPf/AJ3w/zZW3P//////ADHV/wAx2P//////AzrZ/wAu1/84ZOL////////////e////AND//wC1+f8Atff/AZbv/wY62f8ELNf//////wAw1/8AMtn//////wAw2f8ALNn/kKrz////+//cwbH////////////R////Rcb8/wDO/f8A/P//AHzo//////8AMNj/ADXa//////8vXuL/ACna/4yq9///79T/jUkg/9i+r///////r2Q0/7Cozv8BKdr/AirY/zdZ4P//////ADTa/wI72tOuv/T/prr0/wAl2v+JqPb//7yW/+bUxv/9+/n////u//W+n/+Op/L/ADPd/wAv2v+ru/T/r7/0/wI72tMLQd1DEEjg//////9Cbef/ADng///////////////////////R3///AC3g/wAy3v9SeOn//////xFI4P8LQd1DAAAAAAM64PNmiuz/9/j//2mN7f/m7P3///////////9Cb+n/ACXd/wAt3v9rju3//////2iL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/P8J0vz/ELDz/xt85v8mSdj/JknY/yZJ2P8lStowJUjXYCZJ2P8nSdhwJErZryZK2f8oSNcgJUnajyZK2f8mStn/JkrZ/yZK2f8mStn/iJPA////////////////////////////0ff+/xjV/P8J0vz/Drn1/xiO6/8Yjuv/GI7r/xCw8/8Lyvr/CdL8/xmF6P8mStn/JkrZ/yVJ2o8oSNcgJkrZ/yRK2a8jStrfI0rZ3wAAAAAlSdq/Jkra/yZK2v8mStr/Jkra/yZK2v+xtsf///////////////////////////8o2Pz/CdL8/wvK+v8mStr/Jkra/yZK2v8mStr/Jkra/yZK2v8iW97/Jkra/yZK2v8mStr/JUnavwAAAAAjStnfI0ra3yZK2v8lSdq/AAAAACZH2O8mStr/Jkra/yZK2v8mStr/L1HY/9HR0f///////////////////////////yjY/P8J0vz/CdL8/xCw9P8QsPT/ELD0/xSf7/8ddeX/Jkra/yZK2v8mStr/Jkra/yZK2v8mR9jvAAAAACVJ2r8mStr/Jkvb/yVJ2r8AAAAAJkvb/yZL2/8mS9v/Jkvb/yZL2/9KZtL/4+Pj////////////////////////////4Pn//0fd/f8J0vz/CdL8/wnS/P8J0vz/CdL8/wnS/P8Lyvr/Fpfu/yJc3/8mS9v/Jkvb/yZL2/8AAAAAJUnavyZL2/8mS9z/JUncvwAAAAAmS9z/Jkvc/yZL3P8mS9z/Jkvc/26AyP/x8fH//////////////////////////////////////9H3/v/C9P7/o+7+/2fa+/8Oufb/CdL8/wnS/P8J0vz/CdL8/xiP7P8mS9z/Jkvc/wAAAAAlSdy/Jkvc/yZM3P8lTNy/AAAAACZJ2e8mTNz/Jkzc/yZM3P8mTNz/iJTB////////////qnth/5VaOf/x6eX///////////////////////Hp5f/x6eX/ydL2/yZM3P8kVN7/G37o/xKo8v8QsfT/HXbm/yZM3P8mSdnvAAAAACVM3L8mTNz/I0vc3yZJ2u8AAAAAJUzevyZM3f8mTN3/Jkzd/yZM3f+fqc3///////////+VWjn/v5yI/+re1///////////////////////jk8s/7iRe//J0vb/Jkzd/yZM3f8mTN3/Jkzd/yZM3f8mTN3/Jkzd/yVM3r8AAAAAI0vc3yNL3N8kTd2vJk3d/yhQ3yAlTd2PJk3d/yZN3f8mTd3/Jk3d/6St0v////////////Hp5f/q3tf///////////////////////////+xhm7/49PK/6Cx8P8mTd3/Jk3d/yZN3f8mTd3/Jk3d/yZN3f8mTd3/JU3djyhQ3yAmTd3/JE3drydN33AmTd7/J03fcCVK3zAmTd7/Jk3e/yZN3v8mTd7/pK7S///////Sp5r/////////////////////////////////////////////////T27k/yZN3v8mTd7/Jk3e/yZN3v8mTd7/Jk3e/yZN3v8lSt8wJ03fcCZN3v8nTd9wKFDfICZO3/8mTt3PAAAAACVN3r8mTt//Jk7f/yZO3/+EltX//////+fRyv/SqaD/59LO///////////////////////at63/vIBy/7Glxf8mTt//Jk7f/yZO3/8mTt//Jk7f/yZO3/8mTt//JU3evwAAAAAmTt3PJk7f/yhQ3yAAAAAAJE/dryZO3/8oUN9AKFDfQCZO3/8mTt//Jk7f/zhb2v/o6/T/////////////////////////////////////////////////XHrn/yZO3/8mTt//Jk7f/yZO3/8mTt//Jk7f/yZO3/8oUN9AKFDfQCZO3/8kT92vAAAAAAAAAAAoUN9AJk7g/yZO4M8AAAAAJk/hnyZO4P8mTuD/Jk7g/05v5v/k6fv//////////////////////////////////////3eR7P8mTuD/Jk7g/yZO4P8mTuD/Jk7g/yZO4P8mTuD/Jk/hnwAAAAAmTuDPJk7g/yhQ30AAAAAAAAAAAAAAAAAjT+GfJU/h/yVO4Y8gUN8QIk7gzyVP4f8lT+H/SWnW/0lp1v+bq+H/8fHx/////////////////6Cy8v9OcOb/JU/h/yVP4f8lT+H/JU/h/yVP4f8lT+H/JU/h/yJO4M8gUN8QJU7hjyVP4f8jT+GfAAAAAAAAAAAAAAAAAAAAACBQ3xAlTOHvJU/h/yVQ4mAgUN8QIk7hzyVP4f+ktOv///////////////////////H0/f9phur/JU/h/yVP4f8lT+H/JU/h/yVP4f8lT+H/JU/h/yVP4f8iTuHPIFDfECVQ4mAlT+H/JUzh7yBQ3xAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ3zAlUOLvJVDi/yVQ4mAgUN8QI1Din4mb2//J0/j/ydP4/6299P93ku3/M1vk/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/I1DinyBQ3xAlUOJgJVDi/yVQ4u8lUN8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ5DAlUOLvJVDi/yVQ4o8AAAAAJFDjQCVQ4r8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDivyRQ40AAAAAAJVDijyVQ4v8lUOLvJVDkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ5DAjUeTfJVHj/yNR5N8kUONAAAAAACVQ5DAmUuOAJVHivyNR5N8lUeP/JVHj/yNR5N8lUeK/JlLjgCVQ5DAAAAAAJFDjQCNR5N8lUeP/I1Hk3yVQ5DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBQ3xAjUuSfJVHk/yVR5P8jUeTfJFLkcChQ5yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoUOcgJFLkcCNR5N8lUeT/JVHk/yNS5J8gUN8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkUONAI1LknyVS5P8lUuT/JVLk/yVS5O8lUeS/JVHkvyVR5L8lUeS/JVLk7yVS5P8lUuT/JVLk/yRS468kUONAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIFDfECVS5GAjUuWfIlPlzyVS5f8lUuX/JVLl/yVS5f8iU+XPI1LlnyVS5GAgUN8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AA///AAD//AAAP/ggBB/wgAEP4AAAB8AAAAPAAAADiAAAEYAAAAEQAAAIAAAAAAAAAAAgAAAEIAAABCAAAAQgAAAEIAAABCAAAAQAAAAAAAAAABAAAAiAAAABiAAAEcAAAAPAAAAD4AAAB/CAAQ/4IAQf/AfgP/8AAP//wAP/",
        "code": 0,
        "searchForm": "https://duckduckgo.com"
    },
    {
        "name": "Wikipedia (en)",
        "alias": "#wi",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAA4AQAAJgAAACAgAAAAAAAAJAMAAGQBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAEFSURBVDjLxZPRDYJAEESJoQjpgBoM/9IBtoAl4KcUQQlSAjYgJWAH0gPmyNtkzEEuxkQTPzawc3Ozc3MQTc/JfVPR/wW6a+eKQ+Hyfe54B2wvrfXVqXLDfTCMd3j0VHksrTcH9bl2aZq+BCgEwCCPj9E4TdPYGj0C9CYAKdkmBrIIxiIYbvpbb2sSl8AiA+ywAbJE5YLpCImLU/WRDyIAWRgu4k1s4v50ODru4haYSCk4ntkuM0wcMAINXiPKTJQ9CfgB40phBr8DyFjGKkKEhYhCY4iCDgpAYAM2EZBlhJnsZxQUYBNkSkfBvjDd0ttPeR0mxREQ+OhfYOJ6EmL+l/qzn2kGli9cAF3BOfkAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAIKSURBVFjD7ZdBSgNRDIYLguAB7FLwAkXwBl0JgiDYjQcY8ARduBJKu3I5C0EoWDxAT9AL9AK9QBeCIHQlCM/3DZOSmeZNZ2r1bQyEGV7yXv7kJZlJq6XIOXfs+crzwPPTnvnR863n05ZFufDD/T595Q4eauM37u/pWYwfeX53cegcABcuHg0AkEQE8AKAu4gAXv8BrAEMh0PXbrddt9t1vV4v406nk62laeqm02n2LjKYIuK5WCyyfeiLDF32yLn6TJ5mBFarlev3+9nBMMqsabkYhmezWcEd2ctTE/tYBwhgt14BhtmAV2VaLpdrAHioCW+VdwWy9IMAUBQjJcQFTwGqvcTD+Xy+oc8askZJyAYrnKEokCeWLpQkSSZvBIANYgSDVVEQQJaeyHQu1QIgiQNb6AmrTtaQ9+RFSLa1D4iXgfsrVITloeSFFZlaAEjAUMaXo2DJWQtVRe1OKF5aJUkf0NdglXO5VzQGoI2USwwD3LEl590CtdO3QBoT5WSFV+Q63Oha17ITgMlkslGSGBWPdeNiDR2SL1B6zQFINmOAkFOW5eTSURCdvX6OdUlapaWjsKX0dgOg26/VWHSUKhrPz35ISKwq76R9Wx+kKgC1f0o5mISsypUG3kPj2L/lDzKYvEUwzoh2JtPRdQQAo1jD6afne88H1oTMeH6ZK+x7PB/lQ/CJtvkNEgDh1dr/bVYAAAAASUVORK5CYII=",
        "code": 6,
        "searchForm": "https://en.wikipedia.org/wiki/Special:Search?search=&sourceid=Mozilla-search"
    },
    {
        "name": "Amazon.com",
        "alias": "#am",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAC0AQAAJgAAACAgAAAAAAAA6QIAANoBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAF7SURBVDjLlZPLasJAFIaFRF+iVV+h6hO0GF+gVB9AaHwDt64qCG03tQgtdCFIuyhUelmGli66MXThSt24kNiFBUlAYi6ezjnNxSuawB/ITP7v/HNmJgQAEaZzpgHs/gwcTyTEXuXl2U6nA8ViEbK5HKler28CVRAwnB9ptVrAh8MrQuCaZ4iA8fzIqSgCxwzpTIaSuN/RWGwdYLwCUBQFZFkGSZLgqdmEE7YEN8VOAKyaSKUW4nNBAFmnYiKZpDRX1WqwBBzP089n5f/NEQsFL4WqqtsBWJlzDAJr5PwSMM1awEzzdxIbGI3Hvc6jCZeVFgRQRwpY7Qcw3ktgfpR8wLRxCPaot/X4GS95MppfF6DX9n2A3f+kAZycaT8bAZjU6r6B/duD6d3BYg9wQq/tkYzHY1blEiz5lmQyGc95mrO6r2CxgpjCBXgNsJVviolpXJiraeOIjJRE10juUa4sR8V+mO17VvmGqtuOcdNlwut8zTQJcJ0njifyB2bgTdKh6w4BAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACsElEQVRYw71XQWsTURBe2LQgeNKLB+tVemt6txcteNSD/QGC6VEIGDx5s+eKPQqFgJhLNdFLBWMP7cU0oSAWjB70koC9WHbVQ5SO8+XtS14mr7svyaYDH9m87Jv55puZt1nPi4yIzjMeMj7T9OwjI88455nGC1cZX+nsDESumJmPFDwIAqrX6z00Gg1qt9vjkJgFgUeuO16Vy3RjeZkyMzM9+MY1fsM9I9h9zyV7ZAznZrA4FAoFVwJ1z+WuOysrg1lnMolkHJX4k0igzI5sARYWF7vEZEk0rvO6iyUSuJfLJUqM7zYSqRDIra4OOUZPmNZsNrsl8UVTpkJAjh1GzmaSpJ8mAWmYeZB5urHRhW5SNOfUCCDo47W1bvPZsp2qAhipy3Nz1kaLG8dUCEBqM5AvpgElqFar01NgIZsdco7Zb7VasU2YigIYL5tjqCL7Q5YkFQXKlcqQ7DbHthIALk/IWAKor82xPIhshxWABCYioDMz51sexcVi0XoG4DPLIyvJjkTArK3scDQnRvO0MdTrUHGiKZCP4tNgO6BAEI08EQH9Z2Qow0hyPypJGIa9p6JWKCn4SA8jSKmJIDgyRvPJkcRxjfUwNGr/i8+Mo32iHzWiThBD4NM60bet9P77/ubA728RlTjMiwiH6zEEfvIrwdZFtQmMJ7W/ofIDBZD5m3mVZGwJcOP2kmILIlCkE45HoPWurwCSg0+UQRD4ZyXxId+T7gQb9+4q9sioY5ltrOG3L5vqXiiJffDx/aUi83ZJ7jr2ohcEu8Hh6/m+I7OWGiVxbWKHsz+O3vSOakqFQdsFgQeJUiKD7Wv9YKXBgCeSUC3v2kM5EJhlHDh3NcgcPlG1BXZu98sDmTuBa4fsMnz9fniJUaGzs+eMC540XuR0aDO2L8Y3qPyMcdOM+R/8XcqRA3qp9gAAAABJRU5ErkJggg==",
        "code": 7,
        "searchForm": "http://www.amazon.com/exec/obidos/external-search/?field-keywords=&mode=blended&tag=mozilla-20&sourceid=Mozilla-search"
    },
    {
        "name": "Yahoo",
        "alias": "#ya",
        "icon": "data:image/x-icon;base64,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",
        "code": 4,
        "searchForm": "https://search.yahoo.com/yhs/search?p=&ei=UTF-8&hspart=mozilla"
    },
    {
        "name": "eBay",
        "alias": "#eb",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAB6AQAAJgAAACAgAAAAAAAAQgMAAKABAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAFBSURBVDjLtZPdK0MBGIf3J5Babhx3rinFBWuipaUskX9DYvkopqgV90q5UJpyp0OKrUWM2VrRsS9D0zZKHGaOnW1nj4vtypVtPPe/533r9746QAAOAJXfo5Yzgg44pHrcugon/6Sgo0b+XuAOZ2iZiVQmyPoDpIwmUkYTzqM7GsdDdC7F6Lbf8pzOkfWOouzqeZem2b+2AqAV8zjD8yVBqqcf2b7C66yNiMGMfixIQSvi8Mp0LEbR5ADq1QSKWM+Gx0RC9nOZ2GLzwlIWdPWiuNzk4w/EpThNkyEAXKEP2ud8KGId2sspilhPMrmNwzfCuqePr/xbSfC5I/I0MMSj2YJ3z49gDdO2cEOrLUowJpE9G0QRG1ClKbR0EIdvmOPYcnUtnN+vsnZiQC1k/qnGagQ1n3LNzySUJZVskitnmr8BlQG7T2hvgxsAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAMJSURBVFjD7ZddSFNhGMeHXXQTZFFCWfR1pRhUECQlBdWVToo+6KYu1KigtDASG5qUfZgFZvahEDosECPDktKZS1FL+1DRnEvdUptjug91X2dnZzv/3vO6OZbWnR4v9sADL+fs7P97/s/znu2VAJD4UkpSSdKG+QubTyPBr+sXz8XCR64fIAHihVTis0SsUAoAVhEBrBKIHCGAEMB/ARi3F5LkbpS2WMRzYEEBXC2tsD6T03R9agsCGLNyqPw6CXmrBT06JvhbPHZwmkdwtR0B138PPKOHgzXD5jLAy3tmibo4K9weZwDAazJj/FQKRnfugfHMeRiTz0K3Ixam1HQKcPC+Fisu9NK1P08Uj4DleHgMdXC+WQ7nu3UEOhFMfTQcVUvQ1H4IN2sj8H2k7K+2TqCc3GseyA8AmDOzMBq7D9bS8sAr6nEJdNt3UbHVF1XQGtmZew8bTPT6tWoD3KpsUvlR8NxUoEICMvl6KQo+xqCwcRs4T8Ax5c8bFExjbAgAjO7aS8VsLypgq3g5nWStjztAhWRVhqAqeB6IuKTClkw1eNYEbrCQQBwD8yGGOsAooogLYejQPKBi7UPF9DkH+ezd+o141ZkUPAOC+L9SAMivNc7q46YMNSLTe4n1kaQF4XD3ZIDTPgU3XEYciKcAHrsGJS1xKFBGgyVzouiT4VbdGhjt/cEA5isyKsaz7jl3we7bg7Rqf6j0LoSldON4wWcqJDgQNGTN++l13vELA+MK6kKd6iryFOvxtidt9i5gO7owdjKJQliflNAU1pas6xQgnAzg1ux+lJEdILixNr0Pq9JUUA8NwVG9DM73G0jlcnh+V4BpjIWzJmIGQIjnXw5TiDuKSEwxurm3ITc8DNO51BnrLbIcsrW0dNA6RxgUKU1UdGVqLy5X6qGzTLvlnewiBZyGs3Yz6X8UeaYI3olvZDhzwLumZ+eHvooCCC0Q5VUsb4unwycM4YIDqA01tPqmgbzQr2EIYPECiPm33LYoDiZSsY9moh9O/Znoa4d9HkXtPg2pX/cPKCoRQ+ocZa4AAAAASUVORK5CYII=",
        "code": 8,
        "searchForm": "http://search.ebay.com/"
    },
    {
        "name": "Twitter",
        "alias": "#tw",
        "icon": "data:image/x-icon;base64,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",
        "code": 0,
        "searchForm": "https://twitter.com/search?q=&partner=Firefox&source=desktop-search"
    },
    {
        "name": "YouTube",
        "alias": "#yt",
        "icon": 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
        "code": 10,
        "searchForm": "https://www.youtube.de"
    }
];
