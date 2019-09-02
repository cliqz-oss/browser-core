/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import math from '../../../platform/lib/math';
import { getMessage } from '../../../core/i18n';
import console from '../../../core/console';

// REF:
//      https://redhivesoftware.github.io/math-expression-evaluator/
//      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
//      http://jsbin.com/duduru/1/edit?html,output


function getEqualOperator(val, localizedStr) {
  const valStr = val.toString().replace(',', '').replace('.', '');
  const normLocalizedStr = localizedStr.replace(',', '').replace('.', '');
  return valStr === normLocalizedStr ? '=' : '\u2248';
}

function NumberException(number) {
  return {
    name: 'NumberException',
    message: `Invalid number: ${number}`,
  };
}

function replaceAll(string, search, replacement) {
  return string.split(search).join(replacement);
}

const CliqzCalculator = {
  CALCULATOR_RES: 0,
  MULTIPLIER: 1,
  UNIT_RES: '',
  IS_UNIT_CONVERTER: false,
  BASE_UNIT_CONVERTER: '',
  CLEANED_QUERY: '',
  FLOAT_DEC: [100000, 100, 1],
  FLOAT_DEC_THRESHOLD: [99, 99999],
  ACCEPT_ERROR: 1e-8,
  UNIT_CONVERSION_DATA: { // http://en.wikipedia.org/wiki/Conversion_of_units
    // http://www.convert-me.com/en/convert/length/
    LOCALIZE_KEYS: { 'de-DE': 'names_de', 'en-US': 'names_en', default: 'names_de' },
    types: ['length', 'mass'],
    length: {
      base: 'm',
      units: [
        { val: 4828, names: ['lea', 'leuge', 'league', 'leagues'] },
        { val: 0.3048006096012192, // this is US foot, there're IDIAN, CLA, BEN,...
          names: ['ft', 'foot', 'feet', 'fu\u00DF'],
          names_en: { s: 'foot', p: 'feet' },
          names_de: { s: 'fu\u00DF', p: 'fu\u00DF' } },
        { val: 0.0254, names: ['in', 'inch', 'inches', 'zoll'] },
        { val: 1000, names: ['km', 'kilometer', 'kilometre', 'kilometres', 'kilometers'] },
        { val: 1, names: ['m', 'meter', 'metre', 'metres', 'meters'] },
        { val: 0.1, names: ['dm', 'decimeter', 'decimetre', 'decimeters', 'decimetres', 'dezimeter'] },
        { val: 0.01, names: ['cm', 'centimeter', 'centimetre', 'centimetres', 'centimeters', 'zentimeter'] },
        { val: 0.001, names: ['mm', 'millimeter', 'millimetre', 'millimetres', 'millimeters'] },
        { val: 1e-6, names: ['micron', 'micrometer', 'micrometre', 'micrometres', 'micrometers', 'mikrometer'] },
        { val: 1e-9, names: ['nm', 'nanometre', 'nanometre', 'nanometer', 'nanometers'] },
        { val: 10000, names: ['mil'] }, // this is Sweden and Norway unit
        { val: 1609.344,
          names: ['mil.', 'mi.', 'mile', 'miles', 'meile', 'meilen'],
          names_en: { s: 'mile', p: 'miles' },
          names_de: { s: 'meile', p: 'meilen' } },
        { val: 201.168, names: ['furlong', 'furlongs'] },
        { val: 0.9144, names: ['yd', 'yard', 'yards'] },
        { val: 2.54 * 1e-5, names: ['thou'] },
        { val: 1.8288, names: ['fm', 'fathom', 'fathoms', 'faden', 'f\u00E4den'] },
        { val: 5.0292, names: ['rd', 'rod', 'rods', 'rute', 'ruten'] },
        { val: 0.1016, names: ['hand', 'hands', 'handbreit'] },
        { val: 0.2286, names: ['span', 'spans', 'spanne', 'spannen'] },
        { val: 5556, names: ['naut.leag', 'nautical league', 'naut.leags', 'nautical league'] },
        { val: 1852, names: ['naut.mil', 'naut.mils', 'nautical mile', 'nautical miles', 'naut.meile', 'naut.meilen', 'nautische meile', 'nautische meilen'] },
        { val: 1852.216, names: ['sm', 'Seemeile'] },
        { val: 185.2, names: ['cbl', 'cable length', "cable'slength", 'Kabel', 'Kabellänge'] }
      ]
    },
    mass: {
      base: 'g',
      units: [
        { val: 102, names: ['kN', 'kn', 'kilonewton', 'kilonewtons'] },
        { val: 1e9, names: ['kt', 'kilotonne', 'kilotonnes', 'kilotonnen'] },
        { val: 1e6, names: ['t', 'tonne', 'tonnes', 'tonnen', 'metric ton', 'metric tons'] },
        { val: 1e6, names: ['Mg', 'megagram', 'megagrams'] },
        { val: 1000, names: ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramm', 'kilogramms'] },
        { val: 100, names: ['hg', 'hectogram', 'hectograms', 'hectogramme', 'hectogrammes', 'hectogramm', 'hectogramms'] },
        { val: 10, names: ['dag', 'decagram', 'decagrams', 'decagramme', 'decagrammes', 'decagramm', 'decagramms'] },
        { val: 1, names: ['g', 'gram', 'grams', 'gramme', 'grammes', 'gramm', 'gramms'] },
        { val: 0.1, names: ['dg', 'decigram', 'decigrams', 'decigramme', 'decigrammes', 'decigramm', 'decigramms'] },
        { val: 0.01, names: ['cg', 'centigram', 'centigrams', 'centigramme', 'centigrammes', 'centigramm', 'centigramms'] },
        { val: 0.001, names: ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes', 'milligramm', 'milligramms'] },
        { val: 0.000001, names: ['mcg', 'microgram', 'micrograms', 'microgramme', 'microgrammes', 'microgramm', 'microgramms'] },
        { val: 453.59237, names: ['lb', 'lbs', 'pound', 'pounds', 'pound-mass', 'pfund'] },
        { val: 28.349523125, names: ['oz', 'ozs', 'ounce', 'ounces', 'unze', 'unzen'] },
        { val: 1.7718452, names: ['dr', 'dram', 'drams'] },
        { val: 0.06479891, names: ['gr', 'grain', 'grains', 'Gran'] }
      ]
    }
  },
  init() {
    this.thousandsSeparator = getMessage('calculator_thousands_separator');
    this.decimalSeparator = getMessage('calculator_decimal_separator');
  },
  // shorten numbers when needed
  shortenNumber() {
    const fractionLimit = 6;
    const THRESHOLD = 1e-7; // 0.0000001
    const calculatorResult = parseFloat(this.CALCULATOR_RES, 10).toFixed(6);

    const difference = this.CALCULATOR_RES - calculatorResult;
    const isRounded = Math.abs(difference) > THRESHOLD * this.MULTIPLIER;

    try {
      let num;
      num = this.CALCULATOR_RES.toLocaleString(getMessage('locale_lang_code'), { maximumFractionDigits: fractionLimit });
      num = replaceAll(num, this.thousandsSeparator, ' '); // Use spaces as thousands separators

      const res = this.IS_UNIT_CONVERTER ? [num, this.UNIT_RES].join(' ') : num.toString();
      return [res, isRounded];
    } catch (err) { console.error(err); }

    return [this.CALCULATOR_RES, isRounded];
  },
  isValidThousandsSeparator(number, separator) {
    // More than one thousands separator, it should be thousands separator
    const parts = number.split(separator);
    if (parts.length === 1) {
      return true; // There is no thousands separator
    }
    // Invalid thousands separator
    if (parts[0].length > 3) {
      return false; // Invalid thousands separator
    }
    // Invalid thousands separator
    for (let i = 1; i < parts.length; i += 1) {
      if (parts[i].length !== 3) { // Invalid thousands separator
        return false;
      }
    }

    if (parts[0] === '0') {
      return false;
    }
    return true;
  },
  standardize(number) {
    let firstPart = ''; // Part before the first decimal separator
    let secondPart = ''; // Part after the first decimal separator
    // If there is (one or more) decimal separator
    if (number.indexOf(this.decimalSeparator) > -1) {
      secondPart = number.substring(number.indexOf(this.decimalSeparator) + 1);
      // If there are more than two decimal separators, there should be no thousands separator
      if (secondPart.indexOf(this.decimalSeparator) > -1
        && number.indexOf(this.thousandsSeparator) > -1) {
        throw NumberException(number);
      }
      // Thousands separator should come before decimal separator
      if (secondPart.indexOf(this.thousandsSeparator) > -1) {
        throw NumberException(number);
      }
      firstPart = number.substring(0, number.indexOf(this.decimalSeparator));
      // Only one decimal separator => it's decimal separator
      if (secondPart.indexOf(this.decimalSeparator) === -1) {
        // First part contains thousands separator
        if (firstPart.indexOf(this.thousandsSeparator) > -1) {
          if (!this.isValidThousandsSeparator(firstPart, this.thousandsSeparator)) {
            throw NumberException(number);
          }
          firstPart = replaceAll(firstPart, this.thousandsSeparator, '');
        }
        // Always use '.' as decimal separator for math-expression-evaluator
        return `${firstPart}.${secondPart}`;
      }
      // There are more than one decimal separators => could be thousands separator
      if (!this.isValidThousandsSeparator(number, this.decimalSeparator)) {
        throw NumberException(number);
      }
      // *** Decimal separator becomes thousands separator
      return replaceAll(number, this.decimalSeparator, '');
    }
    // If there is no decimal separator
    const parts = number.split(this.thousandsSeparator);
    // There is only one thousands separator => could be decimal separator
    if (parts.length === 2) {
      if (parts[0].length > 3 || parts[1].length !== 3 || parts[0] === '0') {
        // *** Thousands separator becomes decimal separator
        return replaceAll(number, this.thousandsSeparator, '.');
      }
    }
    if (!this.isValidThousandsSeparator(number, this.thousandsSeparator)) {
      throw NumberException(number);
    }
    // All tests passed
    return replaceAll(number, this.thousandsSeparator, '');
  },
  clean(query) {
    let q = query;
    // Don't trigger calculator yet if the query is just a number
    if (!isNaN(q)) {
      return '';
    }
    try {
      // Replace all ' x ' with '*' for multiply triggering
      q = q.replace(/ x /g, '*');
      // Remove all spaces
      q = q.replace(/ /g, '');
      const operators = ['+', '-', '*', '/', '^', '='];
      // Remove the last operator
      while (operators.indexOf(q[q.length - 1]) > -1) {
        q = q.substr(0, q.length - 1);
      }
      let finalQuery = '';
      let lastPosition = 0;
      // Construct a query with cleaned numbers and operators
      // And standardize them independently
      for (let i = 0; i < q.length; i += 1) {
        if (operators.indexOf(q[i]) > -1) {
          const element = q.slice(lastPosition, i);
          if (element) {
            finalQuery += this.standardize(element);
          }
          lastPosition = i + 1;
          finalQuery += q[i];
        }
        // Last number
        if (i === q.length - 1 && lastPosition < i + 1) {
          const element = q.slice(lastPosition, i + 1);
          finalQuery += this.standardize(element);
        }
      }

      // Check if the query is just a number again
      if (!isNaN(finalQuery)) {
        return '';
      }

      return finalQuery;
    } catch (e) {
      return '';
    }
  },

  calculate(q) {
    if (this.CALCULATOR_RES === null || this.CALCULATOR_RES === q) {
      return null;
    }
    // TODO: @mai @remi implement the pretty-print for math expressions
    const expandedExpression = this.IS_UNIT_CONVERTER ? this.CLEANED_QUERY
      : replaceAll(this.clean(q), '.', this.decimalSeparator);

    const results = this.shortenNumber();
    this.CALCULATOR_RES = results[0];
    const isRounded = results[1];

    return {
      data: {
        url: '',
        q,
        type: 'rh',
        subType: { type: 'calculator' },
        template: 'calculator',
        snippet: {
          title: this.CALCULATOR_RES,
        },
        extra: {
          expression: expandedExpression,
          isRounded,
          answer: this.CALCULATOR_RES,
          is_calculus: true,
          // TODO: support_copy_ans should be platform specific
          support_copy_ans: true
        },
      },
    };
  },

  find_unit_in_data(unit_) {
    const self = this;
    const unit = unit_.toLowerCase();
    let unitFound = null;

    self.UNIT_CONVERSION_DATA.types.some(type =>
      self.UNIT_CONVERSION_DATA[type].units.some((item) => {
        if (item.names.indexOf(unit) > -1 || item.names.indexOf(unit_) > -1) {
          unitFound = [type, true, item];
          return true;
        }
        return false;
      }));
    return unitFound || ['', false, null];
  },

  selectUnitTerms(unitData, val) {
    /*
     *   + based on the value and the language preference,
     *     select unit name in suitable language and form (singular/plural)
     */
    const BROWSER_LANG = getMessage('locale_lang_code');
    const nounType = val === 1 ? 's' : 'p';
    const nameInfo = unitData[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS[BROWSER_LANG]]
                  || unitData[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS.default]
                  || unitData.names;
    const name = nameInfo[nounType];

    return name || unitData.names['0'] || '';
  },

  isConverterSearch(q) {
    // --- Process query to recognize a unit-conversion query
    // ACCEPTED query types:
    //    1. a to b, e.g. cm to mm
    let tmp = q.trim();
    let unit1;
    let idx;
    let num;
    let unit1Info;
    // Note: don't use regex match in replace function, e.g. tmp.replace(/ zu | in | im /g, ' to ')
    tmp = q.replace(' zu ', ' to ');
    tmp = tmp.replace(' im ', ' to ');
    tmp = tmp.replace(' in ', ' to ');
    tmp = tmp.replace(' into ', ' to '); // this needs to be at the end
    const paramList = tmp.trim().split(' to ');

    if (paramList.length !== 2) {
      return false;
    }
    const unit2 = this.find_unit_in_data(paramList[1].trim());
    if (unit2[1]) {
      unit1 = `${paramList[0].replace(' ', '')} `;
      idx = 0;
      while (unit1[idx] === ',' || unit1[idx] === '.' || (unit1[idx] >= '0' && unit1[idx] <= '9')) {
        idx += 1;
      }
      if (idx === 0) {
        num = 1;
      } else {
        let numRaw = unit1.slice(0, idx);
        try {
          numRaw = this.standardize(numRaw);
        } catch (e) {
          return false;
        }
        num = Number(numRaw);
        if (isNaN(num)) {
          return false;
        }
      }

      unit1 = unit1.slice(idx, unit1.length).trim();
      unit1Info = this.find_unit_in_data(unit1);
      if (!unit1Info[1] || unit1Info[0] !== unit2[0]) {
        return false;
      } // if not unit of the same type, e.g. 1km to g should not return result

      this.IS_UNIT_CONVERTER = true;
      const cvRaw = unit1Info[2].val / unit2[2].val;
      const cv = cvRaw.toLocaleString(getMessage('locale_lang_code'));
      this.CALCULATOR_RES = num * cvRaw;
      this.UNIT_RES = CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES);
      this.BASE_UNIT_CONVERTER = [
        '1',
        CliqzCalculator.selectUnitTerms(unit1Info[2], 1),
        getEqualOperator(cvRaw, cv),
        cv,
        CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES, cvRaw)
      ].join(' ');

      this.MULTIPLIER = num;
      num = num.toLocaleString(getMessage('locale_lang_code'));
      num = replaceAll(num, this.thousandsSeparator, ' '); // Use spaces as thousands separators
      this.CLEANED_QUERY = [
        num,
        unit1,
      ].join(' ');

      return true;
    }
    return false;
  },

  isCalculatorSearch(q) {
    // filter out:
    // + too short query (avoid answering e, pi)
    // + automatically convert queries like '10cm
    if (this.isConverterSearch(q)) {
      return true;
    }
    const tmp = this.clean(q);
    // Don't trigger if query contains no operator
    if (tmp.length <= 2 || tmp.length > 150 || !/\+|-|\*|\/|\^/.test(tmp)) {
      return false;
    }

    try {
      this.CALCULATOR_RES = math.eval(tmp);

      if (typeof (this.CALCULATOR_RES) === 'number') {
        this.IS_UNIT_CONVERTER = false;
        this.MULTIPLIER = 1;
        return true;
      }
    } catch (err) {
      return false;
    }
    return false;
  }
};

export default CliqzCalculator;
