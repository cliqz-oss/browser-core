/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

import utils from "../core/utils";
import console from "../core/console";
import Result from "./result";
import CliqzCalculator from "./calculator";
import { setSearchEngine } from "../core/search-engines";

// INIT_KEY ('newProvidersAdded') was used only as a boolean but now we have multiple states
// state 1 -> Google images & Google maps
// state 2 -> YouTube engine is added
// state 3 -> Aliases (shortcuts) are updated:
//  - to first 2 letters for default engines
//  - to key property for NonDefaultProviders
// state 4 -> Ecosia engine is added

var INIT_KEY = 'newProvidersAdded',
     LOG_KEY = 'NonDefaultProviders.jsm',
     KEY ='#',
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
     ENGINE_CODES = [
      'google images',
      'google maps',
      'google',
      'yahoo',
      'bing',
      'wikipedia',
      'amazon',
      'ebay',
      'leo',
      'youtube',
      'ecosia'
    ];

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp

class CliqzResultProviders {
  constructor() {
    console.log('CliqzResultProviders initialized', LOG_KEY);
    this.manageProviders();
    CliqzCalculator.init();
  }
  manageProviders() {

    var newProviderAdded = this.addCustomProviders();

    if(newProviderAdded) {
      this.updateEngineAliases();
    }
  }
  addCustomProviders() {
    var providersAddedState,
        maxState = -1,
        newProviderIsAdded = false;

    if (typeof utils.getPref(INIT_KEY) === "boolean") {
      providersAddedState = 1;
    } else {
      providersAddedState = utils.getPref(INIT_KEY, 0);
    }

    const lang = utils.getLanguageFromLocale(utils.getPref('general.useragent.locale', 'en', ''));

    // we only add non default search providers for the languages we support
    (NonDefaultProviders[lang] || []).forEach(function (extern) {
      try {
        if (!utils.getEngineByName(extern.name)) {
          if (providersAddedState < extern.state) {
            maxState = extern.state > maxState ? extern.state : maxState;
            console.log('Added ' + extern.name, LOG_KEY);
            utils.addEngineWithDetails(extern);
          }
        }
      } catch (e) {
        console.log(e, 'err' + LOG_KEY);
      }
    });

    if (maxState > 0) {
      utils.setPref(INIT_KEY, maxState);
      newProviderIsAdded = true;
    }

    return newProviderIsAdded;
  }
  updateEngineAliases() {
    this.getSearchEngines().forEach((function (engine) {
      var alias = engine.alias;
      if(!alias) { alias = this.createShortcut(engine.name); }
      this.updateAlias(engine.name, alias);

    }).bind(this));
  }
  updateAlias(name, newAlias) {
    utils.updateAlias(name, newAlias);
    console.log("Alias of engine  " + name + " was updated to " + newAlias, LOG_KEY);
  }
  getCustomResults (q) {
    var results = null;
    var customQuery = this.customizeQuery(q);

    if(customQuery){
      results = [
        Result.generic(
          Result.CLIQZC + ' sources-' + customQuery.code,
          customQuery.queryURI,
          q,
          customQuery.updatedQ,
          customQuery.queryURI,
          null,
          {
            extra: {
              q: customQuery.updatedQ,
              engine: customQuery.engineName,
            },
            template: 'custom'
          }
        )
      ];
      q = customQuery.updatedQ;
    } else if(CliqzCalculator.isCalculatorSearch(q)) {
      var calcRes = CliqzCalculator.calculate(q);
      if (calcRes != null) {
        results = [calcRes];
      }
    }
    return [q, results];
  }
  getEngineCode (engineName) {
    for(var c in ENGINE_CODES) {
      if(engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1){
        return +c + 1;
      }
    }
    // unknown engine
    return 0;
  }
  setCurrentSearchEngine(engine){
    const searchEngine = this.getEngineByName(engine);
    setSearchEngine(searchEngine);
  }
  // called for each query
  customizeQuery(q){
    if(CUSTOM[q.trim()] && CUSTOM[q.trim()].url){
      return {
        updatedQ  : q,
        engineName: 'CLIQZ',
        queryURI  : CUSTOM[q.trim()].url,
        code      : '#'
      }
    }
    //a prefix has min 3 chars
    if(q.length < 4) return false;

    var components = q.split(' ');

    if(components.length < 2) return false;

    var start = components[0],
        end = components[components.length-1],
        engineName, uq;

    if(this.getEngineByAlias(start)) {
      engineName = this.getEngineByAlias(start).name;
      uq = q.substring(start.length + 1);
    } else if(this.getEngineByAlias(end)) {
      engineName = this.getEngineByAlias(end).name;
      uq = q.substring(0, q.length - end.length - 1);
    }

    if (engineName) {
      return {
        updatedQ:   uq,
        engineName: engineName,
        queryURI:   this.getSubmissionByEngineName(engineName, uq),
        code:       this.getEngineCode(engineName)
      };
    } else {
      return null;
    }
  }
  getEngineByName(engine) {
    return utils.getEngineByName(engine);
  }
  getEngineByAlias(alias) {
    return utils.getEngineByAlias(alias);
  }
  getSubmissionByEngineName(name, query){
    var engine = this.getSearchEngines().find( engine => engine.name === name);
    if (engine) {
      return engine.getSubmissionForQuery(query);
    }
  }
  // create a unique shortcut -> first 2 lowercased letters
  createShortcut(name){
    return KEY + name.substring(0, 2).toLowerCase();
  }
  getSearchEngines(){
    return utils.getSearchEngines().map((function(e){
      e.code   = this.getEngineCode(e.name);
      return e;
    }).bind(this));
  }
}

// TODO: create language/location aware customization
var NonDefaultProviders = {
  'de': [
    {
      key: "#gi",
      url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
      name: "Google Images",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5QjI3QkY3REM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5QjI3QkY3RUM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdCQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjdDQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Wi2PvQAABaNJREFUWMPtV0uMFFUUPa+qunt+PcBAT/f8+DiJGhfOxkRg8BOM0ZWy0GBQoxsTo8YdK9euWJOw0rjxG0QEo25cQJgBFiABkQHmF5jpQWaanu5pmJnues9776uqrgJky0IKKtX1qt67955z7nk1yhiDh3k4eMjHowQeegLemTNn+PohiXEvna7W2tB/sDjtqcH3msVq+Grv6SWwfDVfg3ftPC3vRvNja/G79EzRmE/3+2j0gEfjryuF/YwGL3j/nrBPzP2GHzzwoGM/v+65rvOGQ0eYpe9r1E1dquXDb22FhoKq1WjMpxEVS6ZZuSAhqARo/Vc+JkH/Z97Y5StaEQQ8R2sfbW1tKOS7YWhM0xtrj/8Bp3wLpR07oVNpCuJLciagJJPJoJWSTKdSlJvB6modtdptOmuo+z4cpWIY3nP43sxsUQe1CF++35DJW554HKm5InKHv4W7tISVXDfKzwxDLVXhU6UZCti1voshxM35ecxcv07jPrrWdSFf6Ibr5FGcu4FyefE+gSNKjee4TpCaEVA44xv/3ET/xo1ws52oPjWEVGkByz0DUKsrEry9vQ35XA4X/rqII0d/weTkJFW+KvRkMmkUCj14aeeLGB7ehjZCZ6ZYjEFgYmgYeERYM68AWsWPCQntepjd84EoW/hdWUFrSwbdFPznI0fx/Q8HQfJBS0sLWok6RzmyaJECfvHlV7j49yW8/967WL/SJWikvEQ424ZGR3KKMhNh0Q/qSRJGQ54r4pOiIdedw7Fjx/H1N9+hszMLz0uJLjk4a4lPjwKxLkZHT4mm3t7zFqanr8m6KaLOb/hNJVJnyj/LSNDfGol+JnUK9B3t7aiUKzj44yGioR2um5KAruPK1XFUkIRNZs2aTpwYGcHVq+PYvGkAExMT0i2MWlitI0ahw1aylUs6Fgp5K2yrbEc7zv55DvPzJaTTaSgKGFbOi3LgZhKUGAmUg4yePEW6yMvaly9fkeJ4LhftSEBjg9ge1pZzk+xxCUYLTk1NwfVcG4yDUzFhQNtxNqHwYMhnZ2apu6hDutbhVrmM8YlJQZqTdnQEtZZAgn9gn3FLZaL5ukQt6XK1jg2oYtzb4DZwOMZB7iwvo9GoI0UFuCTsSqWC8ckpScpjfhPdyV6ggqoDQSLwfKEhmxVmFJKVNxFQ0RxrcEYEyWJtNKyJufSbCxkbu8IIGCRPRE4XPznbBp2bt2xmohIw23RiwSNEQEEb6O/rFdTKlUVY3zFCX71ehxMPEoqumQCiKyNQrVQxNPQ0chtyMtkGUff4nIr5ClOwdeuzmF9YwOJihe7dyAeFolD9JhCb9rnlQg3oGApAeXGROiGLXbtewwqZkhUnomrFxGLIVKtVDG/fhifJ1s+eOx88R8IVvZAvk9isQkQQdQLfNOo+OVoRO8hiGY3Dh48QEg1ywkykB36fx1bJtrny3bvfxPkLFzFFRpROp4DEXkpOmNijTGBAGrEPCG3HYbmtVGu4dn0Wr77yMgYHH8Ovv/1OrTktATln9ofengKef+E5SnQ7aLfFyMnT4o5oWktEtcfbJ2IZsU0ODPSLifBvE5pScOXNqkxclkolCfTpJx9hYaEkHHPCa9etpb1ig2jk2PETtB+MiX+wQSV3QouD11PIR6RxF/BOV+jOS8s0PSDcPG0JrlipK7xyoIH+PnR0dAgFrJNLl8YwMzuH2u078p0g1KAp9CYARnmDg4Mqrl6GPAyeCBxHQlux9ff1EbfTGBk9bW0XlkJeiPuet+ZQT1GDBav6thVdomD1EI28Q4OOXcAaSjNw0IqRSJr3mnp8E303cGsVi3PScoFtIZb3Xd9iRrqMqNRE4eesjJ9ouY9pfC/9dmV5c1cCYeBARaEu2M/5G7Kvt0c+SFgH0U4X03vUUXaecpXr9/b17OvMdhxQj/42/N8n8C+AMxJgeLQzoQAAAABJRU5ErkJggg==",
      method: 'GET',
      state:1
    },
    {
      key: "#gm",
      url: "https://www.google.de/maps?q={searchTerms}",
      name: "Google Maps",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2OUZEQTFEMkM5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2OUZEQTFEM0M5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdGQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjgwQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+UK0L7QAAB3lJREFU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",
      method: 'GET',
      state: 1
    },
    {
      key: "#yt",
      url: "https://www.youtube.com/results?search_query={searchTerms}&gl=DE&hl=de",
      name: "YouTube",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
      method: 'GET',
      state: 2
    },
    {
      key: "#ec",
      url: "https://www.ecosia.org/search?q={searchTerms}&ref=cliqz",
      name: "Ecosia",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAC8qzQBuaw3UrmsN6u5rDfruaw37bmsN+25rDfSuaw3fLmsNyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2rTokrLFGurqsNv+5rDf/uaw3/7msN/+5rDf/uaw3/7urNP/AqS7suqw2aAAAAAAAAAAAAAAAAAAAAAC/qjApkbpn4mvJlf/EqCr/uaw3/7msN/+5rDf/uaw3/7urNP+rsUj/ib5x/7qsNv+9qzKBAAAAAAAAAAC5rDcLwKkvzom9cf813Nb/lrlh/8KoLP+5rDf/uaw3/7msN//BqS3/eMSF/yXj6v+BwHv/lbli/7atO1IAAAAAuaw3bsCqL/+Rumb/K+Di/z3ZzP+dtln/vqox/7msN/+5rDf/waku/23Ikv8s4OH/ONvS/5m4Xv+7qzXZuaw3CbmsN9DBqS7/hL93/zDe3f8v393/RdbD/7OuPv+7qzX/uqw2/8WoKf99wn//Lt/e/y/e3f99wn//v6ow/7msN0+7qzT7s64+/0bWwf8y3tn/L97d/03TuP+usET/vKoz/7isOP+vr0P/XM6n/zDe3P813Nb/L97d/5O6Zf/EpymOu6s0/7OuPv8+2cv/J+Hn/1HStP+0rjz/vasy/76qMP9zxYr/NtzV/zTd1/823NX/NtzV/zLd2f9I1b//mbheqsGpLf+gtVX/bseR/3fEhv+wr0L/vaoy/7msN/+/qjD/Wc+q/yvg4/813Nb/Md7b/zfc1P833NT/Mt7a/zbc1aqHvnT6bMiT/522WP+wr0L/vqox/7msN/+5rDf/vaoy/6C1VP8/2cr/N9zT/2vJlf9hzKD/NtzU/zbc1f813NaONdzWz3HGjv9ky53/prNN/8SoKv+8qzT/uaw3/7msOP/EqCr/ecOE/0HYx/9V0K//N9vT/zXc1v823NX/NtzVTjXc120w3tz/Lt/e/0zUu/+Fv3X/rrBF/7msN/+7qzX/vaoy/6qxSf9G1sH/L9/d/zPd2P8x3tv/L9/e2C/f3Qk23NUKNtzVzDbc1v823NX/OdvQ/0nVvv+xr0H/ta07/7+qL/+7qzT/r69D/2LMoP823NX/VNGx/2TLnVEAAAAAAAAAADbc1Sc03dfgQNnJ/2bKm/862tD/pLRP/1vOqf9S0rP/ib1x/8CpL/+4rDj/qLJM/7qsNn4AAAAAAAAAAAAAAAAAAAAAM93YI0vUvLtux5H/VdGw/3DHj/9Zz6r/Xc2m/3rDgv+5rDf/u6s1672rM2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyaYjUburNaytsUbZuK056cGpLuS/qjDGuaw3gLmsNx4AAAAAAAAAAAAAAAAAAAAA+D8AAOAPAADAAwAAgAMAAIABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAACAAQAAgAMAAMAHAADgDwAA+B8AAA==',
      method: 'GET',
      state: 4
    },
    {
      key: "#st",
      url: "https://www.startpage.com/do/dsearch?query={searchTerms}&cat=web&pl=opensearch&language=deutsch",
      name: "Start Page",
      iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAe9QTFRF0d3z0t701eD01eH11eP31eL21uH01+L11+H11eH02eP22Nzs16ux1oiG14iF16er2Nbm09/zr8PlydfvtMbml7DbmbLcucvo1+H02eP13OP02Y6L12FU2pOR2pWU2G9l2omEzNXsc5XNhaLTjKjXm7PdiabVb5LLqL7i3OX239fi2F1O3Kiq4O//4O384N/s4NDYz9nvcZTMoLfe3OX14un33eb2ytfu4+Pu23Zs2WZZ3qio4crR4+Pv5e/80t3xdZbOw9Hr5u355Ov45ez4rsLj6O/75tfe35CK2mZZ2VpK2mxg47q81eDydpfOxdPs6u/66O756O763+f2e5vQpbvg7PH77fX+7PL86+bu6M7S4ImA211O1szZdpnQydbt7/P77PH67vL72uPzdJbNs8bl7+vx6srM7urw8fj/8fv/6szN2ldG2MPMc5fPqb7g8vb87vL6qb7hdZbN1+Hy8eLl33Rn3nNm5aGa5qSe3W1f4oJ23t/rdpjOiqbVla7ZqL3gkq3YcZPMtcfl8/b8+Pr+9OTl6qym5I6D67Cq9uzt4+v3eJnOytftyNXrorjdpbrfztru9fj8+Pr9+vv++/3/+/7//P3/5ev2093v/////Pz+/Pz/+/z+/f3//v7/6O73eZnO1d/w+Pr88PT5zmljmAAAAAFiS0dEmpjfZxIAAAAJcEhZcwAACxMAAAsTAQCanBgAAABsSURBVBgZXcHbCoJAAEXRs/VQKaLzYv//fz0IEVloTF6QZlpL/0A5s1CMJRGiircv5BzIOZD4DL1bEtPQuiXV40DOgcO9Y+GOQ2DlAIgfdxAFPBpgOo2utYKKV6mzas/aVLerZi0K7cbmqc0Xo4UVg4tdcLcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTQtMDctMTVUMTA6NDg6NTgrMDI6MDB+HgtZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTA3LTE1VDEwOjQ4OjU4KzAyOjAwD0Oz5QAAABF0RVh0ZXhpZjpDb2xvclNwYWNlADEPmwJJAAAAEnRFWHRleGlmOkNvbXByZXNzaW9uADaY0ectAAAAIXRFWHRleGlmOkRhdGVUaW1lADIwMTQ6MDc6MTQgMTE6Mzg6MjfrLWLNAAAAGHRFWHRleGlmOkV4aWZJbWFnZUxlbmd0aAAyNjBOcW3eAAAAF3RFWHRleGlmOkV4aWZJbWFnZVdpZHRoADI2MNPu6MwAAAATdEVYdGV4aWY6RXhpZk9mZnNldAAxNjjFzWc/AAAAHnRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdAAzMDawHZ2iAAAAJXRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdExlbmd0aAA3Njc3u8Y0mAAAAC10RVh0ZXhpZjpTb2Z0d2FyZQBBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoOzZ19QAAAA10RVh0cmRmOkJhZwAgICAgIFuLzEsAAAASdEVYdHhtcE1NOkRlcml2ZWRGcm9tAJeoJAgAAAAASUVORK5CYII=',
      method: 'GET',
      state: 5
    }
  ],
  'en': [
    {
      key: "#gi",
      url: "https://www.google.com/search?tbm=isch&q={searchTerms}",
      name: "Google Images",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5QjI3QkY3REM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5QjI3QkY3RUM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdCQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjdDQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Wi2PvQAABaNJREFUWMPtV0uMFFUUPa+qunt+PcBAT/f8+DiJGhfOxkRg8BOM0ZWy0GBQoxsTo8YdK9euWJOw0rjxG0QEo25cQJgBFiABkQHmF5jpQWaanu5pmJnues9776uqrgJky0IKKtX1qt67955z7nk1yhiDh3k4eMjHowQeegLemTNn+PohiXEvna7W2tB/sDjtqcH3msVq+Grv6SWwfDVfg3ftPC3vRvNja/G79EzRmE/3+2j0gEfjryuF/YwGL3j/nrBPzP2GHzzwoGM/v+65rvOGQ0eYpe9r1E1dquXDb22FhoKq1WjMpxEVS6ZZuSAhqARo/Vc+JkH/Z97Y5StaEQQ8R2sfbW1tKOS7YWhM0xtrj/8Bp3wLpR07oVNpCuJLciagJJPJoJWSTKdSlJvB6modtdptOmuo+z4cpWIY3nP43sxsUQe1CF++35DJW554HKm5InKHv4W7tISVXDfKzwxDLVXhU6UZCti1voshxM35ecxcv07jPrrWdSFf6Ibr5FGcu4FyefE+gSNKjee4TpCaEVA44xv/3ET/xo1ws52oPjWEVGkByz0DUKsrEry9vQ35XA4X/rqII0d/weTkJFW+KvRkMmkUCj14aeeLGB7ehjZCZ6ZYjEFgYmgYeERYM68AWsWPCQntepjd84EoW/hdWUFrSwbdFPznI0fx/Q8HQfJBS0sLWok6RzmyaJECfvHlV7j49yW8/967WL/SJWikvEQ424ZGR3KKMhNh0Q/qSRJGQ54r4pOiIdedw7Fjx/H1N9+hszMLz0uJLjk4a4lPjwKxLkZHT4mm3t7zFqanr8m6KaLOb/hNJVJnyj/LSNDfGol+JnUK9B3t7aiUKzj44yGioR2um5KAruPK1XFUkIRNZs2aTpwYGcHVq+PYvGkAExMT0i2MWlitI0ahw1aylUs6Fgp5K2yrbEc7zv55DvPzJaTTaSgKGFbOi3LgZhKUGAmUg4yePEW6yMvaly9fkeJ4LhftSEBjg9ge1pZzk+xxCUYLTk1NwfVcG4yDUzFhQNtxNqHwYMhnZ2apu6hDutbhVrmM8YlJQZqTdnQEtZZAgn9gn3FLZaL5ukQt6XK1jg2oYtzb4DZwOMZB7iwvo9GoI0UFuCTsSqWC8ckpScpjfhPdyV6ggqoDQSLwfKEhmxVmFJKVNxFQ0RxrcEYEyWJtNKyJufSbCxkbu8IIGCRPRE4XPznbBp2bt2xmohIw23RiwSNEQEEb6O/rFdTKlUVY3zFCX71ehxMPEoqumQCiKyNQrVQxNPQ0chtyMtkGUff4nIr5ClOwdeuzmF9YwOJihe7dyAeFolD9JhCb9rnlQg3oGApAeXGROiGLXbtewwqZkhUnomrFxGLIVKtVDG/fhifJ1s+eOx88R8IVvZAvk9isQkQQdQLfNOo+OVoRO8hiGY3Dh48QEg1ywkykB36fx1bJtrny3bvfxPkLFzFFRpROp4DEXkpOmNijTGBAGrEPCG3HYbmtVGu4dn0Wr77yMgYHH8Ovv/1OrTktATln9ofengKef+E5SnQ7aLfFyMnT4o5oWktEtcfbJ2IZsU0ODPSLifBvE5pScOXNqkxclkolCfTpJx9hYaEkHHPCa9etpb1ig2jk2PETtB+MiX+wQSV3QouD11PIR6RxF/BOV+jOS8s0PSDcPG0JrlipK7xyoIH+PnR0dAgFrJNLl8YwMzuH2u078p0g1KAp9CYARnmDg4Mqrl6GPAyeCBxHQlux9ff1EbfTGBk9bW0XlkJeiPuet+ZQT1GDBav6thVdomD1EI28Q4OOXcAaSjNw0IqRSJr3mnp8E303cGsVi3PScoFtIZb3Xd9iRrqMqNRE4eesjJ9ouY9pfC/9dmV5c1cCYeBARaEu2M/5G7Kvt0c+SFgH0U4X03vUUXaecpXr9/b17OvMdhxQj/42/N8n8C+AMxJgeLQzoQAAAABJRU5ErkJggg==",
      method: 'GET',
      state:1
    },
    {
      key: "#gm",
      url: "https://www.google.com/maps?q={searchTerms}",
      name: "Google Maps",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2OUZEQTFEMkM5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2OUZEQTFEM0M5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdGQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjgwQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+UK0L7QAAB3lJREFU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",
      method: 'GET',
      state: 1
    },
    {
      key: "#yt",
      url: "https://www.youtube.com/results?search_query={searchTerms}",
      name: "YouTube",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
      method: 'GET',
      state: 1
    },
    {
      key: "#ec",
      url: "https://www.ecosia.org/search?q={searchTerms}&ref=cliqz",
      name: "Ecosia",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAC8qzQBuaw3UrmsN6u5rDfruaw37bmsN+25rDfSuaw3fLmsNyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2rTokrLFGurqsNv+5rDf/uaw3/7msN/+5rDf/uaw3/7urNP/AqS7suqw2aAAAAAAAAAAAAAAAAAAAAAC/qjApkbpn4mvJlf/EqCr/uaw3/7msN/+5rDf/uaw3/7urNP+rsUj/ib5x/7qsNv+9qzKBAAAAAAAAAAC5rDcLwKkvzom9cf813Nb/lrlh/8KoLP+5rDf/uaw3/7msN//BqS3/eMSF/yXj6v+BwHv/lbli/7atO1IAAAAAuaw3bsCqL/+Rumb/K+Di/z3ZzP+dtln/vqox/7msN/+5rDf/waku/23Ikv8s4OH/ONvS/5m4Xv+7qzXZuaw3CbmsN9DBqS7/hL93/zDe3f8v393/RdbD/7OuPv+7qzX/uqw2/8WoKf99wn//Lt/e/y/e3f99wn//v6ow/7msN0+7qzT7s64+/0bWwf8y3tn/L97d/03TuP+usET/vKoz/7isOP+vr0P/XM6n/zDe3P813Nb/L97d/5O6Zf/EpymOu6s0/7OuPv8+2cv/J+Hn/1HStP+0rjz/vasy/76qMP9zxYr/NtzV/zTd1/823NX/NtzV/zLd2f9I1b//mbheqsGpLf+gtVX/bseR/3fEhv+wr0L/vaoy/7msN/+/qjD/Wc+q/yvg4/813Nb/Md7b/zfc1P833NT/Mt7a/zbc1aqHvnT6bMiT/522WP+wr0L/vqox/7msN/+5rDf/vaoy/6C1VP8/2cr/N9zT/2vJlf9hzKD/NtzU/zbc1f813NaONdzWz3HGjv9ky53/prNN/8SoKv+8qzT/uaw3/7msOP/EqCr/ecOE/0HYx/9V0K//N9vT/zXc1v823NX/NtzVTjXc120w3tz/Lt/e/0zUu/+Fv3X/rrBF/7msN/+7qzX/vaoy/6qxSf9G1sH/L9/d/zPd2P8x3tv/L9/e2C/f3Qk23NUKNtzVzDbc1v823NX/OdvQ/0nVvv+xr0H/ta07/7+qL/+7qzT/r69D/2LMoP823NX/VNGx/2TLnVEAAAAAAAAAADbc1Sc03dfgQNnJ/2bKm/862tD/pLRP/1vOqf9S0rP/ib1x/8CpL/+4rDj/qLJM/7qsNn4AAAAAAAAAAAAAAAAAAAAAM93YI0vUvLtux5H/VdGw/3DHj/9Zz6r/Xc2m/3rDgv+5rDf/u6s1672rM2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyaYjUburNaytsUbZuK056cGpLuS/qjDGuaw3gLmsNx4AAAAAAAAAAAAAAAAAAAAA+D8AAOAPAADAAwAAgAMAAIABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAACAAQAAgAMAAMAHAADgDwAA+B8AAA==',
      method: 'GET',
      state: 1
    },
    {
      key: "#st",
      url: "https://www.startpage.com/do/dsearch?query={searchTerms}&cat=web&pl=opensearch&language=english",
      name: "Start Page",
      iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAe9QTFRF0d3z0t701eD01eH11eP31eL21uH01+L11+H11eH02eP22Nzs16ux1oiG14iF16er2Nbm09/zr8PlydfvtMbml7DbmbLcucvo1+H02eP13OP02Y6L12FU2pOR2pWU2G9l2omEzNXsc5XNhaLTjKjXm7PdiabVb5LLqL7i3OX239fi2F1O3Kiq4O//4O384N/s4NDYz9nvcZTMoLfe3OX14un33eb2ytfu4+Pu23Zs2WZZ3qio4crR4+Pv5e/80t3xdZbOw9Hr5u355Ov45ez4rsLj6O/75tfe35CK2mZZ2VpK2mxg47q81eDydpfOxdPs6u/66O756O763+f2e5vQpbvg7PH77fX+7PL86+bu6M7S4ImA211O1szZdpnQydbt7/P77PH67vL72uPzdJbNs8bl7+vx6srM7urw8fj/8fv/6szN2ldG2MPMc5fPqb7g8vb87vL6qb7hdZbN1+Hy8eLl33Rn3nNm5aGa5qSe3W1f4oJ23t/rdpjOiqbVla7ZqL3gkq3YcZPMtcfl8/b8+Pr+9OTl6qym5I6D67Cq9uzt4+v3eJnOytftyNXrorjdpbrfztru9fj8+Pr9+vv++/3/+/7//P3/5ev2093v/////Pz+/Pz/+/z+/f3//v7/6O73eZnO1d/w+Pr88PT5zmljmAAAAAFiS0dEmpjfZxIAAAAJcEhZcwAACxMAAAsTAQCanBgAAABsSURBVBgZXcHbCoJAAEXRs/VQKaLzYv//fz0IEVloTF6QZlpL/0A5s1CMJRGiircv5BzIOZD4DL1bEtPQuiXV40DOgcO9Y+GOQ2DlAIgfdxAFPBpgOo2utYKKV6mzas/aVLerZi0K7cbmqc0Xo4UVg4tdcLcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTQtMDctMTVUMTA6NDg6NTgrMDI6MDB+HgtZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTA3LTE1VDEwOjQ4OjU4KzAyOjAwD0Oz5QAAABF0RVh0ZXhpZjpDb2xvclNwYWNlADEPmwJJAAAAEnRFWHRleGlmOkNvbXByZXNzaW9uADaY0ectAAAAIXRFWHRleGlmOkRhdGVUaW1lADIwMTQ6MDc6MTQgMTE6Mzg6MjfrLWLNAAAAGHRFWHRleGlmOkV4aWZJbWFnZUxlbmd0aAAyNjBOcW3eAAAAF3RFWHRleGlmOkV4aWZJbWFnZVdpZHRoADI2MNPu6MwAAAATdEVYdGV4aWY6RXhpZk9mZnNldAAxNjjFzWc/AAAAHnRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdAAzMDawHZ2iAAAAJXRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdExlbmd0aAA3Njc3u8Y0mAAAAC10RVh0ZXhpZjpTb2Z0d2FyZQBBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoOzZ19QAAAA10RVh0cmRmOkJhZwAgICAgIFuLzEsAAAASdEVYdHhtcE1NOkRlcml2ZWRGcm9tAJeoJAgAAAAASUVORK5CYII=',
      method: 'GET',
      state: 1
    }
  ],
  'fr': [
    {
      key: "#gi",
      url: "https://www.google.fr/search?tbm=isch&q={searchTerms}",
      name: "Google Images",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5QjI3QkY3REM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5QjI3QkY3RUM5MzIxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdCQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjdDQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Wi2PvQAABaNJREFUWMPtV0uMFFUUPa+qunt+PcBAT/f8+DiJGhfOxkRg8BOM0ZWy0GBQoxsTo8YdK9euWJOw0rjxG0QEo25cQJgBFiABkQHmF5jpQWaanu5pmJnues9776uqrgJky0IKKtX1qt67955z7nk1yhiDh3k4eMjHowQeegLemTNn+PohiXEvna7W2tB/sDjtqcH3msVq+Grv6SWwfDVfg3ftPC3vRvNja/G79EzRmE/3+2j0gEfjryuF/YwGL3j/nrBPzP2GHzzwoGM/v+65rvOGQ0eYpe9r1E1dquXDb22FhoKq1WjMpxEVS6ZZuSAhqARo/Vc+JkH/Z97Y5StaEQQ8R2sfbW1tKOS7YWhM0xtrj/8Bp3wLpR07oVNpCuJLciagJJPJoJWSTKdSlJvB6modtdptOmuo+z4cpWIY3nP43sxsUQe1CF++35DJW554HKm5InKHv4W7tISVXDfKzwxDLVXhU6UZCti1voshxM35ecxcv07jPrrWdSFf6Ibr5FGcu4FyefE+gSNKjee4TpCaEVA44xv/3ET/xo1ws52oPjWEVGkByz0DUKsrEry9vQ35XA4X/rqII0d/weTkJFW+KvRkMmkUCj14aeeLGB7ehjZCZ6ZYjEFgYmgYeERYM68AWsWPCQntepjd84EoW/hdWUFrSwbdFPznI0fx/Q8HQfJBS0sLWok6RzmyaJECfvHlV7j49yW8/967WL/SJWikvEQ424ZGR3KKMhNh0Q/qSRJGQ54r4pOiIdedw7Fjx/H1N9+hszMLz0uJLjk4a4lPjwKxLkZHT4mm3t7zFqanr8m6KaLOb/hNJVJnyj/LSNDfGol+JnUK9B3t7aiUKzj44yGioR2um5KAruPK1XFUkIRNZs2aTpwYGcHVq+PYvGkAExMT0i2MWlitI0ahw1aylUs6Fgp5K2yrbEc7zv55DvPzJaTTaSgKGFbOi3LgZhKUGAmUg4yePEW6yMvaly9fkeJ4LhftSEBjg9ge1pZzk+xxCUYLTk1NwfVcG4yDUzFhQNtxNqHwYMhnZ2apu6hDutbhVrmM8YlJQZqTdnQEtZZAgn9gn3FLZaL5ukQt6XK1jg2oYtzb4DZwOMZB7iwvo9GoI0UFuCTsSqWC8ckpScpjfhPdyV6ggqoDQSLwfKEhmxVmFJKVNxFQ0RxrcEYEyWJtNKyJufSbCxkbu8IIGCRPRE4XPznbBp2bt2xmohIw23RiwSNEQEEb6O/rFdTKlUVY3zFCX71ehxMPEoqumQCiKyNQrVQxNPQ0chtyMtkGUff4nIr5ClOwdeuzmF9YwOJihe7dyAeFolD9JhCb9rnlQg3oGApAeXGROiGLXbtewwqZkhUnomrFxGLIVKtVDG/fhifJ1s+eOx88R8IVvZAvk9isQkQQdQLfNOo+OVoRO8hiGY3Dh48QEg1ywkykB36fx1bJtrny3bvfxPkLFzFFRpROp4DEXkpOmNijTGBAGrEPCG3HYbmtVGu4dn0Wr77yMgYHH8Ovv/1OrTktATln9ofengKef+E5SnQ7aLfFyMnT4o5oWktEtcfbJ2IZsU0ODPSLifBvE5pScOXNqkxclkolCfTpJx9hYaEkHHPCa9etpb1ig2jk2PETtB+MiX+wQSV3QouD11PIR6RxF/BOV+jOS8s0PSDcPG0JrlipK7xyoIH+PnR0dAgFrJNLl8YwMzuH2u078p0g1KAp9CYARnmDg4Mqrl6GPAyeCBxHQlux9ff1EbfTGBk9bW0XlkJeiPuet+ZQT1GDBav6thVdomD1EI28Q4OOXcAaSjNw0IqRSJr3mnp8E303cGsVi3PScoFtIZb3Xd9iRrqMqNRE4eesjJ9ouY9pfC/9dmV5c1cCYeBARaEu2M/5G7Kvt0c+SFgH0U4X03vUUXaecpXr9/b17OvMdhxQj/42/N8n8C+AMxJgeLQzoQAAAABJRU5ErkJggg==",
      method: 'GET',
      state:1
    },
    {
      key: "#gm",
      url: "https://www.google.fr/maps?q={searchTerms}",
      name: "Google Maps",
      iconURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2OUZEQTFEMkM5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2OUZEQTFEM0M5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdGQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjgwQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+UK0L7QAAB3lJREFU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",
      method: 'GET',
      state: 1
    },
    {
      key: "#yt",
      url: "https://www.youtube.com/results?search_query={searchTerms}&gl=FR&hl=fr",
      name: "YouTube",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
      method: 'GET',
      state: 1
    },
    {
      key: "#ec",
      url: "https://www.ecosia.org/search?q={searchTerms}&ref=cliqz",
      name: "Ecosia",
      iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAC8qzQBuaw3UrmsN6u5rDfruaw37bmsN+25rDfSuaw3fLmsNyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2rTokrLFGurqsNv+5rDf/uaw3/7msN/+5rDf/uaw3/7urNP/AqS7suqw2aAAAAAAAAAAAAAAAAAAAAAC/qjApkbpn4mvJlf/EqCr/uaw3/7msN/+5rDf/uaw3/7urNP+rsUj/ib5x/7qsNv+9qzKBAAAAAAAAAAC5rDcLwKkvzom9cf813Nb/lrlh/8KoLP+5rDf/uaw3/7msN//BqS3/eMSF/yXj6v+BwHv/lbli/7atO1IAAAAAuaw3bsCqL/+Rumb/K+Di/z3ZzP+dtln/vqox/7msN/+5rDf/waku/23Ikv8s4OH/ONvS/5m4Xv+7qzXZuaw3CbmsN9DBqS7/hL93/zDe3f8v393/RdbD/7OuPv+7qzX/uqw2/8WoKf99wn//Lt/e/y/e3f99wn//v6ow/7msN0+7qzT7s64+/0bWwf8y3tn/L97d/03TuP+usET/vKoz/7isOP+vr0P/XM6n/zDe3P813Nb/L97d/5O6Zf/EpymOu6s0/7OuPv8+2cv/J+Hn/1HStP+0rjz/vasy/76qMP9zxYr/NtzV/zTd1/823NX/NtzV/zLd2f9I1b//mbheqsGpLf+gtVX/bseR/3fEhv+wr0L/vaoy/7msN/+/qjD/Wc+q/yvg4/813Nb/Md7b/zfc1P833NT/Mt7a/zbc1aqHvnT6bMiT/522WP+wr0L/vqox/7msN/+5rDf/vaoy/6C1VP8/2cr/N9zT/2vJlf9hzKD/NtzU/zbc1f813NaONdzWz3HGjv9ky53/prNN/8SoKv+8qzT/uaw3/7msOP/EqCr/ecOE/0HYx/9V0K//N9vT/zXc1v823NX/NtzVTjXc120w3tz/Lt/e/0zUu/+Fv3X/rrBF/7msN/+7qzX/vaoy/6qxSf9G1sH/L9/d/zPd2P8x3tv/L9/e2C/f3Qk23NUKNtzVzDbc1v823NX/OdvQ/0nVvv+xr0H/ta07/7+qL/+7qzT/r69D/2LMoP823NX/VNGx/2TLnVEAAAAAAAAAADbc1Sc03dfgQNnJ/2bKm/862tD/pLRP/1vOqf9S0rP/ib1x/8CpL/+4rDj/qLJM/7qsNn4AAAAAAAAAAAAAAAAAAAAAM93YI0vUvLtux5H/VdGw/3DHj/9Zz6r/Xc2m/3rDgv+5rDf/u6s1672rM2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyaYjUburNaytsUbZuK056cGpLuS/qjDGuaw3gLmsNx4AAAAAAAAAAAAAAAAAAAAA+D8AAOAPAADAAwAAgAMAAIABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAACAAQAAgAMAAMAHAADgDwAA+B8AAA==',
      method: 'GET',
      state: 1
    },
    {
      key: "#st",
      url: "https://www.startpage.com/do/dsearch?query={searchTerms}&cat=web&pl=opensearch&language=francais",
      name: "Start Page",
      iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAe9QTFRF0d3z0t701eD01eH11eP31eL21uH01+L11+H11eH02eP22Nzs16ux1oiG14iF16er2Nbm09/zr8PlydfvtMbml7DbmbLcucvo1+H02eP13OP02Y6L12FU2pOR2pWU2G9l2omEzNXsc5XNhaLTjKjXm7PdiabVb5LLqL7i3OX239fi2F1O3Kiq4O//4O384N/s4NDYz9nvcZTMoLfe3OX14un33eb2ytfu4+Pu23Zs2WZZ3qio4crR4+Pv5e/80t3xdZbOw9Hr5u355Ov45ez4rsLj6O/75tfe35CK2mZZ2VpK2mxg47q81eDydpfOxdPs6u/66O756O763+f2e5vQpbvg7PH77fX+7PL86+bu6M7S4ImA211O1szZdpnQydbt7/P77PH67vL72uPzdJbNs8bl7+vx6srM7urw8fj/8fv/6szN2ldG2MPMc5fPqb7g8vb87vL6qb7hdZbN1+Hy8eLl33Rn3nNm5aGa5qSe3W1f4oJ23t/rdpjOiqbVla7ZqL3gkq3YcZPMtcfl8/b8+Pr+9OTl6qym5I6D67Cq9uzt4+v3eJnOytftyNXrorjdpbrfztru9fj8+Pr9+vv++/3/+/7//P3/5ev2093v/////Pz+/Pz/+/z+/f3//v7/6O73eZnO1d/w+Pr88PT5zmljmAAAAAFiS0dEmpjfZxIAAAAJcEhZcwAACxMAAAsTAQCanBgAAABsSURBVBgZXcHbCoJAAEXRs/VQKaLzYv//fz0IEVloTF6QZlpL/0A5s1CMJRGiircv5BzIOZD4DL1bEtPQuiXV40DOgcO9Y+GOQ2DlAIgfdxAFPBpgOo2utYKKV6mzas/aVLerZi0K7cbmqc0Xo4UVg4tdcLcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTQtMDctMTVUMTA6NDg6NTgrMDI6MDB+HgtZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTA3LTE1VDEwOjQ4OjU4KzAyOjAwD0Oz5QAAABF0RVh0ZXhpZjpDb2xvclNwYWNlADEPmwJJAAAAEnRFWHRleGlmOkNvbXByZXNzaW9uADaY0ectAAAAIXRFWHRleGlmOkRhdGVUaW1lADIwMTQ6MDc6MTQgMTE6Mzg6MjfrLWLNAAAAGHRFWHRleGlmOkV4aWZJbWFnZUxlbmd0aAAyNjBOcW3eAAAAF3RFWHRleGlmOkV4aWZJbWFnZVdpZHRoADI2MNPu6MwAAAATdEVYdGV4aWY6RXhpZk9mZnNldAAxNjjFzWc/AAAAHnRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdAAzMDawHZ2iAAAAJXRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdExlbmd0aAA3Njc3u8Y0mAAAAC10RVh0ZXhpZjpTb2Z0d2FyZQBBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoOzZ19QAAAA10RVh0cmRmOkJhZwAgICAgIFuLzEsAAAASdEVYdHhtcE1NOkRlcml2ZWRGcm9tAJeoJAgAAAAASUVORK5CYII=',
      method: 'GET',
      state: 1
    },
    {
      key: "#qw",
      url: "https://www.qwant.com/?q={searchTerms}",
      name: "Qwant",
      iconURL: 'data:image/png;base64,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',
      method: 'GET',
      state: 1
    },
    {
      key: "#mi",
      url: "https://millionshort.com/search?country=fr-FR&keywords={searchTerms}",
      name: "Million Short",
      iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHIAAAByCAYAAACP3YV9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUY2QUMwQjY1NDA0MTFFNTlBOTU5NDM2MDE3NDY5QTUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUY2QUMwQjc1NDA0MTFFNTlBOTU5NDM2MDE3NDY5QTUiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRjZBQzBCNDU0MDQxMUU1OUE5NTk0MzYwMTc0NjlBNSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRjZBQzBCNTU0MDQxMUU1OUE5NTk0MzYwMTc0NjlBNSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pq7y15AAAAk0SURBVHja7F09axxH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',
      method: 'GET',
      state: 1
    }
  ],
};

export default CliqzResultProviders;
