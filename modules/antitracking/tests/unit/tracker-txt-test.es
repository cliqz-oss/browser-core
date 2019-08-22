/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
const urlImports = require('../../core/unit/utils/url-parser');

export default describeModule('antitracking/tracker-txt',
  () => ({
    'core/http': {
      httpGet() {}
    },
    'core/prefs': {
      default: {
        get: () => null,
        set() {}
      }
    },
    ...urlImports,
  }), function () {
    let TT;
    let parser;
    let URL;

    beforeEach(async function () {
      TT = this.module();
      parser = TT.trackerRuleParser;
      URL = (await this.system.import('core/fast-url-parser')).default;
    });

    it('parse rules correctly', function () {
      const txt = 'R site1.com empty\nR   site2.com\tplaceholder\nnot a rule';
      const rules = [];
      parser(txt, rules);
      chai.expect(rules).to.deep.equal([
        {
          site: 'site1.com',
          rule: 'empty'
        }, {
          site: 'site2.com',
          rule: 'placeholder'
        }
      ]);
    });

    it('ignore comments', function () {
      const txt = '# comment\n! pass\nR site1.com empty\nR site2.com placeholder\nnot a rule';
      const rules = [];
      parser(txt, rules);
      chai.expect(rules).to.deep.equal([
        {
          site: 'site1.com',
          rule: 'empty'
        }, {
          site: 'site2.com',
          rule: 'placeholder'
        }
      ]);
    });

    it('apply correct rule to 3rd party', function () {
      const txt = '# comment\n! pass\nR aaa.site1.com empty\nR site1.com placeholder\nnot a rule';
      const r = TT.TrackerTXT.get(new URL('http://www.google.com/'));
      TT.trackerRuleParser(txt, r.rules);
      r.status = 'update';
      chai.expect(r.getRule('bbbaaa.site1.com')).to.equal('empty');
      chai.expect(r.getRule('aa.site1.com')).to.equal('placeholder');
      chai.expect(r.getRule('aa.site2.com')).to.equal(TT.getDefaultTrackerTxtRule());
    });
  });
