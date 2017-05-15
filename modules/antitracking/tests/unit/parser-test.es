
const testCases = {
  '{a:1}': {a: '1'},
  '{a:-3,b:4}': {a: '-3', b: '4'},
  '{fesv:34, dgfg: 4}': {fesv: '34', dgfg: '4'},
  '{arrayVal: [1,3,4], a: 4}': {arrayVal: ['1', '3', '4'], a: '4'}
}

const complexCases = {
  'adsafeprotected': {
    data: '{c:783epK,pingTime:-2,time:754,type:a,sca:{dfp:{df:4,sz:300.250,dom:body}},env:{sf:0,pom:1},rt:1,cb:0,th:0,es:0,sa:1,sc:0,ha:1,gm:0,fif:0,slTimes:{i:755,o:0,n:0,pp:0,pm:0},slEvents:[{sl:i,t:77,wc:35.72.1349.1098,ac:1040.596.300.250,am:i,cc:35.72.300.250,piv:100,obst:0,th:0,reas:,cmps:1,bkn:{piv:[747~100],as:[747~300.250]}}],slEventCount:1,em:true,fr:true,uf:0,e:,tt:jload,dtt:0,fm:qe8t0Om+11|12|13|14|15.10249|151|16*.10188|1611,idMap:16*,pd:iAJH.Flash Player,slid:[google_ads_iframe_/59666047/theguardian.com/politics/article/ng_1,google_ads_iframe_/59666047/theguardian.com/politics/article/ng_1__container__,dfp-ad--right,article],sinceFw:670,readyFired:true}',
    expected: {
      c: '783epK',
      pingTime: '-2',
      time: '754',
      type: 'a',
      sca: {
        dfp: {
          df: '4',
          sz: '300.250',
          dom: 'body',
        }
      },
      env: {
        sf: '0',
        pom: '1',
      },
      rt: '1',
      cb: '0',
      th: '0',
      es: '0',
      sa: '1',
      sc: '0',
      ha: '1',
      gm: '0',
      fif: '0',
      slTimes: {
        i: '755',
        o: '0',
        n: '0',
        pp: '0',
        pm: '0',
      },
      slEvents: [{
        sl: 'i',
        t: '77',
        wc: '35.72.1349.1098',
        ac: '1040.596.300.250',
        am: 'i',
        cc: '35.72.300.250',
        piv: '100',
        obst: '0',
        reas: '',
        th: '0',
        cmps: '1',
        bkn: {
          piv: ['747~100'],
          as: ['747~300.250'],
        }
      }],
      slEventCount: '1',
      em: 'true',
      fr: 'true',
      uf: '0',
      e: '',
      tt: 'jload',
      dtt: '0',
      fm: 'qe8t0Om+11|12|13|14|15.10249|151|16*.10188|1611',
      idMap: '16*',
      pd: 'iAJH.Flash Player',
      slid: [
        'google_ads_iframe_/59666047/theguardian.com/politics/article/ng_1',
        'google_ads_iframe_/59666047/theguardian.com/politics/article/ng_1__container__',
        'dfp-ad--right',
        'article'],
      sinceFw: '670',
      readyFired: 'true',
    }
  }
}

export default describeModule('antitracking/parsers/unquoted-json-parser',
  function () {
    return {};
  },
  () => {
    describe('parse', function() {
      let parse;

      beforeEach(function() {
        parse = this.module().default;
      });

      Object.keys(testCases).forEach((testInput) => {
        it(testInput, function() {
          chai.expect(parse(testInput)).to.eql(testCases[testInput]);
        })
      });

      Object.keys(complexCases).forEach((cCase) => {
        it(cCase, function() {
          const expected = complexCases[cCase].expected
          const actual = parse(complexCases[cCase].data);
          chai.expect(actual).to.deep.eql(expected);
        })
      });
    });
  }
);
