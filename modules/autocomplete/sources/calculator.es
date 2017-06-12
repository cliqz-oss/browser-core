/*
 * This module handles various calculations
 *
 */

import mathLib from 'mathjs';
import { utils } from "../core/cliqz";
import Result from "./result";
import { isFirefox } from "../core/platform";


// REF:
//      http://mathjs.org/docs/index.html
//      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
//      http://jsbin.com/duduru/1/edit?html,output


function getEqualOperator(val, localizedStr){
  var valStr = val.toString().replace(",","").replace(".",""),
    normLocalizedStr = localizedStr.replace(",","").replace(".","");
  return valStr === normLocalizedStr ? "=" : "\u2248";
}

var CliqzCalculator = {
  CALCULATOR_RES: 0,
  UNIT_RES: '',
  IS_UNIT_CONVERTER: false,
  BASE_UNIT_CONVERTER: '',
  FLOAT_DEC: [100000, 100, 1],
  FLOAT_DEC_THRESHOLD: [99, 99999],
  ACCEPT_ERROR: 1e-8,
  UNIT_CONVERSION_DATA: {  // http://en.wikipedia.org/wiki/Conversion_of_units
    // http://www.convert-me.com/en/convert/length/
    'LOCALIZE_KEYS': {'de-DE': 'names_de', 'en-US': 'names_en', 'default': 'names_de'},
    'types': ['length', 'mass'],
    'length': {
      'base': 'm',
      'units': [
        {'val': 4828, 'names': ['lea', 'leuge', 'league', 'leagues']},
        {'val': 0.3048006096012192, // this is US foot, there're IDIAN, CLA, BEN,...
          'names': ['ft', 'foot', 'feet', 'fu\u00DF'],
          'names_en': {'s': 'foot', 'p': 'feet'},
          'names_de': {'s': 'fu\u00DF', 'p': 'fu\u00DF'}},
        {'val': 0.0254, 'names': ['in', 'inch', 'inches', 'zoll']},
        {'val': 1000, 'names': ['km', 'kilometer', 'kilometre', 'kilometres', 'kilometers']},
        {'val': 1, 'names': ['m', 'meter', 'metre', 'metres', 'meters']},
        {'val': 0.1, 'names': ['dm', 'decimeter', 'decimetre', 'decimeters', 'decimetres', 'dezimeter']},
        {'val': 0.01, 'names': ['cm', 'centimeter', 'centimetre', 'centimetres', 'centimeters', 'zentimeter']},
        {'val': 0.001, 'names': ['mm', 'millimeter', 'millimetre', 'millimetres', 'millimeters']},
        {'val': 1e-6, 'names': ['micron', 'micrometer', 'micrometre', 'micrometres', 'micrometers', 'mikrometer']},
        {'val': 1e-9, 'names': ['nm', 'nanometre', 'nanometre', 'nanometer', 'nanometers']},
        {'val': 10000, 'names': ['mil']},  // this is Sweden and Norway unit
        {'val': 1609.344,
          'names': ['mil.', 'mi.', 'mile', 'miles', 'meile', 'meilen'],
          'names_en': {'s': 'mile', 'p': 'miles'},
          'names_de': {'s': 'meile', 'p': 'meilen'}},
        {'val': 201.168, 'names': ['furlong', 'furlongs']},
        {'val': 0.9144, 'names': ['yd', 'yard', 'yards']},
        {'val': 2.54 * 1e-5, 'names': ['thou']},
        {'val': 1.8288, 'names': ['fm', 'fathom', 'fathoms', 'faden', 'f\u00E4den']},
        {'val': 5.0292, 'names': ['rd', 'rod', 'rods', 'rute', 'ruten']},
        {'val': 0.1016, 'names': ['hand', 'hands', 'handbreit']},
        {'val': 0.2286, 'names': ['span', 'spans', 'spanne', 'spannen']},
        {'val': 5556, 'names': ['naut.leag', 'nautical league', 'naut.leags', 'nautical league']},
        {'val': 1852, 'names': ['naut.mil', 'naut.mils', 'nautical mile', 'nautical miles', 'naut.meile', 'naut.meilen', 'nautische meile', 'nautische meilen']},
        {'val': 1852.216, 'names': ['sm', 'Seemeile']},
        {'val': 185.2, 'names': ['cbl', 'cable length', "cable'slength", 'Kabel', 'Kabellänge']}
      ]
    },
    'mass': {
      "base": 'g',
      'units': [
        {'val': 102, 'names': ['kN', 'kn', 'kilonewton', 'kilonewtons']},
        {'val': 1e9, 'names': ['kt', 'kilotonne', 'kilotonnes', 'kilotonnen']},
        {'val': 1e6, 'names': ['t', 'tonne', 'tonnes', 'tonnen', 'metric ton', 'metric tons']},
        {'val': 1e6, 'names': ['Mg', 'megagram', 'megagrams']},
        {'val': 1000, 'names': ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramm', 'kilogramms']},
        {'val': 100, 'names': ['hg', 'hectogram', 'hectograms', 'hectogramme', 'hectogrammes', 'hectogramm', 'hectogramms']},
        {'val': 10, 'names': ['dag', 'decagram', 'decagrams', 'decagramme', 'decagrammes', 'decagramm', 'decagramms']},
        {'val': 1, 'names': ['g', 'gram', 'grams', 'gramme', 'grammes', 'gramm', 'gramms']},
        {'val': 0.1, 'names': ['dg', 'decigram', 'decigrams', 'decigramme', 'decigrammes', 'decigramm', 'decigramms']},
        {'val': 0.01, 'names': ['cg', 'centigram', 'centigrams', 'centigramme', 'centigrammes', 'centigramm', 'centigramms']},
        {'val': 0.001, 'names': ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes', 'milligramm', 'milligramms']},
        {'val': 0.000001, 'names': ['mcg', 'microgram', 'micrograms', 'microgramme', 'microgrammes', 'microgramm', 'microgramms']},
        {'val': 453.59237, 'names': ['lb', 'lbs', 'pound', 'pounds', 'pound-mass', 'pfund']},
        {'val': 28.349523125, 'names': ['oz', 'ozs', 'ounce ', 'ounces', 'unze', 'unzen']},
        {'val': 1.7718452, 'names': ['dr', 'dram', 'drams']},
        {'val': 0.06479891, 'names': ['gr', 'grain', 'grains', 'Gran']}
      ]
    }
  },
  init() {
    const thousandsSeparator = utils.getLocalizedString('calculator-thousands-separator');
    const decimalSeparator = utils.getLocalizedString('calculator-decimal-separator');
    this.thousandsRegex = new RegExp(`(\\d)\\${thousandsSeparator}(\\d)`, 'g');
    this.decimalRegex = new RegExp(`(\\d)\\${decimalSeparator}(\\d)`, 'g');
  },
  shortenNumber: function(){
    // shorten numbers when needed
    try {
      var numRaw, num, num1, floatDec = 1, resultSign = "";

      num1 = this.CALCULATOR_RES;

      for (var i = 0; i < this.FLOAT_DEC_THRESHOLD.length; i++) {
        if (Math.abs(num1) < this.FLOAT_DEC_THRESHOLD[i]) {
          floatDec = this.FLOAT_DEC[i];
          break;
        }
      }
      numRaw = Math.round(num1 * floatDec) / floatDec;
      num = numRaw.toLocaleString(utils.getLocalizedString('locale_lang_code'));
      resultSign = getEqualOperator(num1, num);

      this.CALCULATOR_RES = this.IS_UNIT_CONVERTER ? [num, this.UNIT_RES].join(" ") : num.toString();
      return [resultSign, this.CALCULATOR_RES]
    } catch (err) {}
    return null
  },
  clean: function(q) {
    if (!isNaN(q)) {
      return ''; // Don't trigger calculator yet if the query is just a number
    }
    const operators = ['+', '-', '*', '/', '^', '='];
    q = q.replace(this.thousandsRegex, '$1$2'); // Remove all thousands separators
    q = q.replace(this.decimalRegex, '$1.$2'); // Replace all decimal separators by period
    q = q.replace(/ /g, ''); // Remove all spaces
    for (var i = 0; i < operators.length; i++) {
      if (q[q.length - 1] == operators[i]) {
        return q.substr(0, q.length-1); // Remove the last operator
      }
    }
    return q;
  },
  calculate: function(q) {
    if (this.CALCULATOR_RES === null || this.CALCULATOR_RES === q) {
      return null;
    }
    var expandedExpression = this.IS_UNIT_CONVERTER ? this.BASE_UNIT_CONVERTER : mathLib.parse(this.clean(q)).toString(),
      resultSign = this.shortenNumber()[0];

    return Result.cliqz(
      {
        url: "",
        q: q,
        type: "rh",
        subType: {type: 'calculator'},
        template: 'calculator',
        snippet: {
          title: this.CALCULATOR_RES,
          extra: {
            expression: expandedExpression,
            answer: this.CALCULATOR_RES,
            is_calculus: true,
            // TODO: support_copy_ans should be platform specific
            support_copy_ans: true
          }
        }
      }
    );
  },

  find_unit_in_data: function(unit_) {
    var self = this,
      unit = unit_.toLowerCase(),
      unitFound = null;

    self.UNIT_CONVERSION_DATA.types.some(function(type) {
      return self.UNIT_CONVERSION_DATA[type].units.some(function(item) {
        if (item['names'].indexOf(unit) > -1 || item['names'].indexOf(unit_) > -1) {
          unitFound = [type, true, item];
          return true;
        }
        return false;
      });
    });
    return unitFound || ["", false, null];
  },

  selectUnitTerms: function(unit_data, val) {

    /*
     *   + based on the value and the language preference, select unit name in suitable language and form (singular/plural)
     */
    var BROWSER_LANG = utils.getLocalizedString('locale_lang_code');
    var noun_type = val === 1 ? 's' : 'p',
      nameInfo = unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS[BROWSER_LANG]]
                  || unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS['default']]
                  || unit_data['names'],
      name = nameInfo[noun_type];

    return name || unit_data['names']['0'] || "";
  },

  isConverterSearch: function(q) {
    // --- Process query to recognize a unit-conversion query
    // ACCEPTED query types:
    //    1. a to b, e.g. cm to mm
    var tmp = q.trim(),
      paramList, unit1, unit2, idx, num, unit1Info;
    // Note: don't use regex match in replace function, e.g. tmp.replace(/ zu | in | im /g, ' to ')
    tmp = q.replace(' zu ', ' to ');
    tmp = tmp.replace(' im ', ' to ');
    tmp = tmp.replace(' in ', ' to ');
    tmp = tmp.replace(' into ', ' to ');  // this needs to be at the end
    paramList = tmp.trim().split(' to ');

    if (paramList.length !== 2)
      return false;
    unit2 = this.find_unit_in_data(paramList[1].trim());
    if (unit2[1]) {
      unit1 = paramList[0].replace(' ', '') + ' ';
      idx = 0;
      while (unit1[idx] === ',' || unit1[idx] === '.' || (unit1[idx] >= '0' && unit1[idx] <= '9'))
        idx++;
      if (idx === 0) {
        num = 1
      } else {
        num = Number(unit1.slice(0, idx));
        if (isNaN(num)) {
          return false
        }
      }

      unit1 = unit1.slice(idx, unit1.length).trim();
      unit1Info = this.find_unit_in_data(unit1);
      if (!unit1Info[1] || unit1Info[0] !== unit2[0]) {
        return false
      }  // if not unit of the same type, e.g. 1km to g should not return result

      this.IS_UNIT_CONVERTER = true;
      var cvRaw = unit1Info[2].val / unit2[2].val,
        cv = cvRaw.toLocaleString(utils.getLocalizedString('locale_lang_code'));
      this.CALCULATOR_RES = num * cvRaw;
      this.UNIT_RES = CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES);
      this.BASE_UNIT_CONVERTER = [
        '1',
        CliqzCalculator.selectUnitTerms(unit1Info[2], 1),
        getEqualOperator(cvRaw, cv),
        cv,
        CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES, cvRaw)
      ].join(" ");

      return true
    }
    else {
      return false
    }
  },

  isCalculatorSearch: function(q) {
    // filter out:
    // + too short query (avoid answering e, pi)
    // + automatically convert queries like '10cm
    var tmp = this.clean(q)
    if (tmp.length <= 2 || tmp.length > 150) {
      return false;
    }

    try {
      this.CALCULATOR_RES = mathLib.eval(tmp);

      if (typeof(this.CALCULATOR_RES) === 'number') {
        this.IS_UNIT_CONVERTER = false;
        return true
      }
    }
    catch (err) {
    }

    return this.isConverterSearch(q);
  }
};

export default CliqzCalculator;
