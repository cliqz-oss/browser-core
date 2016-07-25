'use strict';
/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

var EXPORTED_SYMBOLS = ['CliqzResultProviders'];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');


var INIT_KEY = 'newProvidersAdded',
	LOG_KEY = 'NonDefaultProviders.jsm',
	KEY ='#',
	// default shortcut is first 2 lowercased letters
	// the folowing are non default
    MAPPING = {
        '#gi': 'Google Images',
        '#gm': 'Google Maps'
    },
    CUSTOM = {
        '#fee': {
            url: 'https://cliqz.com/support/'
        },
        '#team': {
            url: 'https://cliqz.com/team/'
        },
        '#cliqz': {
            url: 'https://cliqz.com/'
        },
        '#join': {
            url: 'https://cliqz.com/jobs/'
        }
    },
    ENGINE_CODES = ['google images', 'google maps', 'google', 'yahoo', 'bing', 'wikipedia', 'amazon', 'ebay', 'leo']
	;

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp


var CliqzResultProviders = {
    init: function(){
        // creates shortcuts for all the engines
        this.getSearchEngines();
    },
    getCustomResults: function(q){
        var results = null;
        var customQuery = CliqzResultProviders.isCustomQuery(q);

        if(customQuery){
            results = [
                Result.generic(
                    Result.CLIQZC + ' sources-' + customQuery.engineCode,
                    customQuery.queryURI,
                    null,
                    null,
                    null,
                    null,
                    {
                        q: customQuery.updatedQ,
                        engine: customQuery.engineName
                    }
                )
            ];
            q = customQuery.updatedQ;
        } else if(CliqzCalculator.isCalculatorSearch(q)){
            var calcRes = CliqzCalculator.get(q);
            if (calcRes != null){
                results = [calcRes];
            }
        }
        return [q, results];
    },
    getSearchEngines: function(){
        var engines = {},
            defEngines = Services.search.getEngines();
        for(var i=0; i<defEngines.length; i++){
            var engine = defEngines[i];
            if(engine.hidden != true && engine.iconURI){
                engines[engine.name] = {
                    prefix: CliqzResultProviders.getShortcut(engine.name),
                    name: engine.name,
                    icon: engine.iconURI.spec,
                    code: CliqzResultProviders.getEngineCode(engine.name),
                    base_url: engine.searchForm
                }


            }
        }
        return engines;
    },
    getEngineCode: function(engineName){
        for(var c in ENGINE_CODES){
            if(engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1){
                return +c + 1;
            }
        }
        // unknown engine
        return 0;
    },
    getEngineSubmission: function(engine, q){
        return Services.search.getEngineByName(engine).getSubmission(q);
    },
    setCurrentSearchEngine: function(engine){
        Services.search.currentEngine = Services.search.getEngineByName(engine);
    },
    // called for each query
    isCustomQuery: function(q){
        if(CUSTOM[q.trim()] && CUSTOM[q.trim()].url){
            return {
                updatedQ  : q,
                engineName: 'CLIQZ',
                queryURI  : CUSTOM[q.trim()].url
            }
        }
        // a prefix has min 4 chars
        if(q.length < 5) return false;

        var components = q.split(' ');

        if(components.length < 2) return false;

        var start = components[0],
            end = components[components.length-1];

        if(MAPPING.hasOwnProperty(start)){
            var uq = q.substring(start.length + 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[start],
                queryURI  : Services.search.getEngineByName(MAPPING[start]).getSubmission(uq).uri.spec,
                engineCode: CliqzResultProviders.getEngineCode(MAPPING[start])
            };
        } else if(MAPPING.hasOwnProperty(end)) {
            var uq = q.substring(0, q.length - end.length - 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[end],
                queryURI  : Services.search.getEngineByName(MAPPING[end]).getSubmission(uq).uri.spec,
                engineCode: CliqzResultProviders.getEngineCode(MAPPING[end])
            };
        }

        return null;
    },
    // called once at visual hashtag creation
	getShortcut: function(name){
        for(var key in MAPPING)
            if(MAPPING[key] === name)
                return key;

		return CliqzResultProviders.createShortcut(name);
	},
	// create a unique shortcut
	createShortcut: function(name){
		for(var i=2; i<name.length; i++){
			var candidate = KEY + name.substring(0, i).toLowerCase();

			if(MAPPING[candidate] == undefined){
				//this shortcut doesn't exist yet so we can use it
				MAPPING[candidate] = name;

				return candidate;
			}
		}
	},
    getM: function(){ return MAPPING }
}

var NonDefaultProviders = [
	{
		key: "#gi",
		url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
		name: "Google Images",
		iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
		method: 'GET'
	},
	{
		key: "#gm",
		url: "https://maps.google.de/maps?q={searchTerms}",
		name: "Google Maps",
		iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
        method: 'GET'
	}
];

if (!CliqzUtils.getPref(INIT_KEY, false)) {
    CliqzUtils.setPref(INIT_KEY, true);

    var PROPS = ["name", "iconURL", "name" /*alias*/, "name" /*description*/, "method", "url"];

    for(var idx = 0; idx < NonDefaultProviders.length; idx++){
    	var extern = NonDefaultProviders[idx];

    	try {
    	CliqzUtils.log('Analysing ' + extern.name, LOG_KEY);
	    if (!Services.search.getEngineByName(extern.name)) {
	    	CliqzUtils.log('Added ' + extern.name, LOG_KEY);
        	Services.search.addEngineWithDetails.apply(
        		Services.search,
            	PROPS.map(function (k) { return extern[k]; })
            );
   		} }
   		catch(e){
   			CliqzUtils.log(e, 'err' + LOG_KEY);
   		}
    }
}

CliqzResultProviders.init();
