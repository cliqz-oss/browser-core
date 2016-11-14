/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

import utils from "core/utils";
import console from "core/console";
import Result from "autocomplete/result";
import CliqzCalculator from "autocomplete/calculator";
import { setSearchEngine } from "core/search-engines";

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

    NonDefaultProviders.forEach(function (extern) {
      console.log("NonDefaultProviders");
      try {
        console.log('Analysing ' + extern.name, LOG_KEY);
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
      if(engine.prefix && (engine.name === alias)) { alias = engine.prefix; }
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
          null,
          null,
          null,
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
  // called once at visual hashtag creation
  // TODO: use the updated shortcuts from about:preferences#search
  getShortcut(name){
    for(var i=0; i < NonDefaultProviders.length; i++)
      if(NonDefaultProviders[i].name === name)
        return NonDefaultProviders[i].key;

    return this.createShortcut(name);
  }
  // create a unique shortcut -> first 2 lowercased letters
  createShortcut(name){
    return KEY + name.substring(0, 2).toLowerCase();
  }
  getSearchEngines(){
    return utils.getSearchEngines().map((function(e){
      e.prefix = this.getShortcut(e.name);
      e.code   = this.getEngineCode(e.name);
      return e;
    }).bind(this));
  }
}

// TODO: create language/location aware customization
var NonDefaultProviders = [
  {
    key: "#gi",
    url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
    name: "Google Images",
    iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
    method: 'GET',
    state:1
  },
  {
    key: "#gm",
    url: "https://maps.google.de/maps?q={searchTerms}",
    name: "Google Maps",
    iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
    method: 'GET',
    state: 1
  },
  {
    key: "#yt",
    url: "https://www.youtube.com/results?search_query={searchTerms}",
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
    url: "https://www.startpage.com/do/search?q={searchTerms}&ref=cliqz",
    name: "Start Page",
    iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAe9QTFRF0d3z0t701eD01eH11eP31eL21uH01+L11+H11eH02eP22Nzs16ux1oiG14iF16er2Nbm09/zr8PlydfvtMbml7DbmbLcucvo1+H02eP13OP02Y6L12FU2pOR2pWU2G9l2omEzNXsc5XNhaLTjKjXm7PdiabVb5LLqL7i3OX239fi2F1O3Kiq4O//4O384N/s4NDYz9nvcZTMoLfe3OX14un33eb2ytfu4+Pu23Zs2WZZ3qio4crR4+Pv5e/80t3xdZbOw9Hr5u355Ov45ez4rsLj6O/75tfe35CK2mZZ2VpK2mxg47q81eDydpfOxdPs6u/66O756O763+f2e5vQpbvg7PH77fX+7PL86+bu6M7S4ImA211O1szZdpnQydbt7/P77PH67vL72uPzdJbNs8bl7+vx6srM7urw8fj/8fv/6szN2ldG2MPMc5fPqb7g8vb87vL6qb7hdZbN1+Hy8eLl33Rn3nNm5aGa5qSe3W1f4oJ23t/rdpjOiqbVla7ZqL3gkq3YcZPMtcfl8/b8+Pr+9OTl6qym5I6D67Cq9uzt4+v3eJnOytftyNXrorjdpbrfztru9fj8+Pr9+vv++/3/+/7//P3/5ev2093v/////Pz+/Pz/+/z+/f3//v7/6O73eZnO1d/w+Pr88PT5zmljmAAAAAFiS0dEmpjfZxIAAAAJcEhZcwAACxMAAAsTAQCanBgAAABsSURBVBgZXcHbCoJAAEXRs/VQKaLzYv//fz0IEVloTF6QZlpL/0A5s1CMJRGiircv5BzIOZD4DL1bEtPQuiXV40DOgcO9Y+GOQ2DlAIgfdxAFPBpgOo2utYKKV6mzas/aVLerZi0K7cbmqc0Xo4UVg4tdcLcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTQtMDctMTVUMTA6NDg6NTgrMDI6MDB+HgtZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTA3LTE1VDEwOjQ4OjU4KzAyOjAwD0Oz5QAAABF0RVh0ZXhpZjpDb2xvclNwYWNlADEPmwJJAAAAEnRFWHRleGlmOkNvbXByZXNzaW9uADaY0ectAAAAIXRFWHRleGlmOkRhdGVUaW1lADIwMTQ6MDc6MTQgMTE6Mzg6MjfrLWLNAAAAGHRFWHRleGlmOkV4aWZJbWFnZUxlbmd0aAAyNjBOcW3eAAAAF3RFWHRleGlmOkV4aWZJbWFnZVdpZHRoADI2MNPu6MwAAAATdEVYdGV4aWY6RXhpZk9mZnNldAAxNjjFzWc/AAAAHnRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdAAzMDawHZ2iAAAAJXRFWHRleGlmOkpQRUdJbnRlcmNoYW5nZUZvcm1hdExlbmd0aAA3Njc3u8Y0mAAAAC10RVh0ZXhpZjpTb2Z0d2FyZQBBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoOzZ19QAAAA10RVh0cmRmOkJhZwAgICAgIFuLzEsAAAASdEVYdHhtcE1NOkRlcml2ZWRGcm9tAJeoJAgAAAAASUVORK5CYII=',
    method: 'GET',
    state: 5
  }
];

export default CliqzResultProviders;
