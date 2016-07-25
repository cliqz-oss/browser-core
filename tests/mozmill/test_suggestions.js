'use strict';

/*
    check mockserver/server.py for mocks !

    VERY IMPORTANT !!!
    Avoid polluting the logs - all the tests should not send logs to production logging systems
*/

var {assert} = require('lib/assertions');
var WAIT_TIME_FOR_KEY_PRESS = 700,
    WAIT_TIME_FOR_MULTIPLE_KEY_PRESSES = 2000;

var setupModule = function (module) {
    module.controller = mozmill.getBrowserController();
    module.CLIQZ = controller.window.CLIQZ;
    module.CliqzUtils = controller.window.CliqzUtils;
}

function clearLocationBar (locationBar) {
    var locationBarNode = locationBar.getNode();
    locationBarNode.value = '';
}

function alert(txt){
    controller.window.alert(txt);
}

var locationAction = function(){
    let locationBar = new findElement.ID(controller.window.document, 'urlbar')
        ,popup = new findElement.ID(controller.window.document, 'PopupAutoCompleteRichResult')
        ,popupBox = popup.getNode()
        ;


    this.getNode = function(){ return locationBar.getNode(); };
    this.clean = function(){ locationBar.getNode().value = ''; };
    // adds a key to the urlbar
    this.kepPress = function(key) {
        locationBar.sendKeys(key);
        controller.sleep(WAIT_TIME_FOR_KEY_PRESS);
    };
    // multiple key press
    this.multiKeyPress = function(data, wait) {
        for(let key of data){
            locationBar.sendKeys(key);
            controller.sleep(WAIT_TIME_FOR_MULTIPLE_KEY_PRESSES);
        }
        wait && controller.sleep(WAIT_TIME_FOR_KEY_PRESS);
    };
    this.enter = function(){
        locationBar.keypress('VK_ENTER');
    };
    this.navigateTo = function(url) {
        this.clean();
        locationBar.sendKeys(url);
        this.enter();
    };
    this.open = function(url, wait){
        controller.open(url);
        wait && controller.waitForPageLoad();
    };
    this.results = function(){
        //wait for initialization
        if(!popupBox.cliqzBox)controller.sleep(2000);
        return this.jsonify(popupBox.cliqzBox.resultsBox.children, ['url', 'type', 'idx']);
    };
    this.jsonify = function(results, fields){
        function json(item){
            var ret = {}
            for(var f of fields)ret[f] = item.getAttribute(f)

            return ret;
        }
        return Array.prototype.map.call(results, json);
    }
    this.suggestions = function(){
        //wait for initialization
        while(!popupBox.cliqzBox)controller.sleep(100);
        return this.jsonify(popupBox.cliqzBox.suggestionBox.children, ['val', 'idx']);
    };
    // replace https to http to enable mocking
    CliqzUtils.LOG="http://192.168.33.22:80/";
    CliqzUtils.RESULTS_PROVIDER = 'http://192.168.33.22:80/api/v1/results?q=';
    CliqzUtils.SUGGESTIONS = 'http://192.168.33.22:80/complete/search?q=';
    this.clean();

    return this;
}


function testResults() {
    let input = 'facebook', expectedUrl ='https://www.facebook.com/',
        expectedTitle = 'Willkommen bei Facebook',
        action = new locationAction(),
        currentInput = '',
        locNode = action.getNode();;

    for(let key of input){
        action.kepPress(key);
        currentInput += key;
        let results = action.results();

        // mocked results kick in from the 4th caracter for "face..."
        if(currentInput.length>3){
            assert.equal(results[0].url, expectedUrl, 'url should be facebook');
            assert.equal(results[0].type, 'cliqz-results sources-d', 'Is a cliqz-deutsche-cache result');


        } else {
            for(let r of results){
                assert.notMatch(r.type, '/cliqz-results/i', 'Is not a result');
            }
        }
    }
}

function testQuerySuggestions() {
  let input = 'facebook login',
      action = new locationAction(),
      currentInput = '';

    for(let key of input){
        action.kepPress(key);
        currentInput += key;
        if(currentInput.length > 3){
            let suggestions = action.suggestions();
            var mocked = ['one', 'two', 'three'];
            for(let i in mocked){
                assert.equal(suggestions[i].val, mocked[i], 'url is mocked suggestion');
            }
        }
    }
}

function testAutocomplete () {
    let input = 'facebook', expected = 'facebook.com/',
        action = new locationAction(),
        currentInput = '',
        locNode = action.getNode();;

    currentInput = input.slice(0,3);
    action.multiKeyPress(currentInput, true);


    for(let key of input.slice(3)){
        action.kepPress(key);
        currentInput += key;

        assert.equal(locNode.selectionStart, currentInput.length, "Start selection after inputed text.");
        assert.equal(locNode.selectionEnd, 13, "End selection after autocomplete text.");
        assert.equal(locNode.value, "facebook.com/", "For faceboo autocomplete facebook.com/");
      }
}
