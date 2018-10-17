/* global chai, describeModule */

const fastUrlParser = require('fast-url-parser');
const tldts = require('tldts');

export default describeModule('antitracking/tracker-txt',
  () => ({
    'core/http': {
      httpGet() {}
    },
    'core/utils': {
      default: {}
    },
    'core/prefs': {
      default: {
        get: () => null,
        set() {}
      }
    },
    'core/fast-url-parser': {
      default: fastUrlParser,
    },
    'platform/lib/tldts': tldts
  }), function () {
    let TT;
    let parser;
    let parseURL;

    beforeEach(async function () {
      TT = this.module();
      parser = TT.trackerRuleParser;
      parseURL = (await this.system.import('core/url-info')).parseURL;
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
      const r = TT.TrackerTXT.get(parseURL('http://www.google.com/'));
      TT.trackerRuleParser(txt, r.rules);
      r.status = 'update';
      chai.expect(r.getRule('bbbaaa.site1.com')).to.equal('empty');
      chai.expect(r.getRule('aa.site1.com')).to.equal('placeholder');
      chai.expect(r.getRule('aa.site2.com')).to.equal(TT.getDefaultTrackerTxtRule());
    });
  });
