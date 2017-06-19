/* global chai */
/* global describeModule */


// TLD list extracted from http://www.iana.org/domains/root/db,
// cc stands fro country code, the other are generic
const TLDs = {gw: 'cc', gu: 'cc', gt: 'cc', gs: 'cc', gr: 'cc', gq: 'cc', gp: 'cc', dance: 'na', tienda: 'na', gy: 'cc', gg: 'cc', gf: 'cc', ge: 'cc', gd: 'cc', gb: 'cc', ga: 'cc', edu: 'na', gn: 'cc', gm: 'cc', gl: 'cc', '\u516c\u53f8': 'na', gi: 'cc', gh: 'cc', tz: 'cc', zone: 'na', tv: 'cc', tw: 'cc', tt: 'cc', immobilien: 'na', tr: 'cc', tp: 'cc', tn: 'cc', to: 'cc', tl: 'cc', bike: 'na', tj: 'cc', tk: 'cc', th: 'cc', tf: 'cc', tg: 'cc', td: 'cc', tc: 'cc', coop: 'na', '\u043e\u043d\u043b\u0430\u0439\u043d': 'na', cool: 'na', ro: 'cc', vu: 'cc', democrat: 'na', guitars: 'na', qpon: 'na', '\u0441\u0440\u0431': 'cc', zm: 'cc', tel: 'na', futbol: 'na', za: 'cc', '\u0628\u0627\u0632\u0627\u0631': 'na', '\u0440\u0444': 'cc', zw: 'cc', blue: 'na', mu: 'cc', '\u0e44\u0e17\u0e22': 'cc', asia: 'na', marketing: 'na', '\u6d4b\u8bd5': 'na', international: 'na', net: 'na', '\u65b0\u52a0\u5761': 'cc', okinawa: 'na', '\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8': 'na', '\u05d8\u05e2\u05e1\u05d8': 'na', '\uc0bc\uc131': 'na', sexy: 'na', institute: 'na', '\u53f0\u7063': 'cc', pics: 'na', '\u516c\u76ca': 'na', '\u673a\u6784': 'na', social: 'na', domains: 'na', '\u9999\u6e2f': 'cc', '\u96c6\u56e2': 'na', limo: 'na', '\u043c\u043e\u043d': 'cc', tools: 'na', nagoya: 'na', properties: 'na', camera: 'na', today: 'na', club: 'na', company: 'na', glass: 'na', berlin: 'na', me: 'cc', md: 'cc', mg: 'cc', mf: 'cc', ma: 'cc', mc: 'cc', tokyo: 'na', mm: 'cc', ml: 'cc', mo: 'cc', mn: 'cc', mh: 'cc', mk: 'cc', cat: 'na', reviews: 'na', mt: 'cc', mw: 'cc', mv: 'cc', mq: 'cc', mp: 'cc', ms: 'cc', mr: 'cc', cab: 'na', my: 'cc', mx: 'cc', mz: 'cc', '\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8': 'cc', wang: 'na', estate: 'na', clothing: 'na', monash: 'na', guru: 'na', technology: 'na', travel: 'na', '\u30c6\u30b9\u30c8': 'na', pink: 'na', fr: 'cc', '\ud14c\uc2a4\ud2b8': 'na', farm: 'na', lighting: 'na', fi: 'cc', fj: 'cc', fk: 'cc', fm: 'cc', fo: 'cc', sz: 'cc', kaufen: 'na', sx: 'cc', ss: 'cc', sr: 'cc', sv: 'cc', su: 'cc', st: 'cc', sk: 'cc', sj: 'cc', si: 'cc', sh: 'cc', so: 'cc', sn: 'cc', sm: 'cc', sl: 'cc', sc: 'cc', sb: 'cc', rentals: 'na', sg: 'cc', se: 'cc', sd: 'cc', '\u7ec4\u7ec7\u673a\u6784': 'na', shoes: 'na', '\u4e2d\u570b': 'cc', industries: 'na', lb: 'cc', lc: 'cc', la: 'cc', lk: 'cc', li: 'cc', lv: 'cc', lt: 'cc', lu: 'cc', lr: 'cc', ls: 'cc', holiday: 'na', ly: 'cc', coffee: 'na', ceo: 'na', '\u5728\u7ebf': 'na', ye: 'cc', '\u0625\u062e\u062a\u0628\u0627\u0631': 'na', ninja: 'na', yt: 'cc', name: 'na', moda: 'na', eh: 'cc', '\u0628\u06be\u0627\u0631\u062a': 'cc', ee: 'cc', house: 'na', eg: 'cc', ec: 'cc', vote: 'na', eu: 'cc', et: 'cc', es: 'cc', er: 'cc', ru: 'cc', rw: 'cc', '\u0aad\u0abe\u0ab0\u0aa4': 'cc', rs: 'cc', boutique: 'na', re: 'cc', '\u0633\u0648\u0631\u064a\u0629': 'cc', gov: 'na', '\u043e\u0440\u0433': 'na', red: 'na', foundation: 'na', pub: 'na', vacations: 'na', org: 'na', training: 'na', recipes: 'na', '\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435': 'na', '\u4e2d\u6587\u7f51': 'na', support: 'na', onl: 'na', '\u4e2d\u4fe1': 'na', voto: 'na', florist: 'na', '\u0dbd\u0d82\u0d9a\u0dcf': 'cc', '\u049b\u0430\u0437': 'cc', management: 'na', '\u0645\u0635\u0631': 'cc', '\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc': 'na', kiwi: 'na', academy: 'na', sy: 'cc', cards: 'na', '\u0938\u0902\u0917\u0920\u0928': 'na', pro: 'na', kred: 'na', sa: 'cc', mil: 'na', '\u6211\u7231\u4f60': 'na', agency: 'na', '\u307f\u3093\u306a': 'na', equipment: 'na', mango: 'na', luxury: 'na', villas: 'na', '\u653f\u52a1': 'na', singles: 'na', systems: 'na', plumbing: 'na', '\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae': 'na', '\u062a\u0648\u0646\u0633': 'cc', '\u067e\u0627\u06a9\u0633\u062a\u0627\u0646': 'cc', gallery: 'na', kg: 'cc', ke: 'cc', '\u09ac\u09be\u0982\u09b2\u09be': 'cc', ki: 'cc', kh: 'cc', kn: 'cc', km: 'cc', kr: 'cc', kp: 'cc', kw: 'cc', link: 'na', ky: 'cc', voting: 'na', cruises: 'na', '\u0639\u0645\u0627\u0646': 'cc', cheap: 'na', solutions: 'na', '\u6e2c\u8a66': 'na', neustar: 'na', partners: 'na', '\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe': 'cc', menu: 'na', arpa: 'na', flights: 'na', rich: 'na', do: 'cc', dm: 'cc', dj: 'cc', dk: 'cc', photography: 'na', de: 'cc', watch: 'na', dz: 'cc', supplies: 'na', report: 'na', tips: 'na', '\u10d2\u10d4': 'cc', bar: 'na', qa: 'cc', shiksha: 'na', '\u0443\u043a\u0440': 'cc', vision: 'na', wiki: 'na', '\u0642\u0637\u0631': 'cc', '\ud55c\uad6d': 'cc', computer: 'na', best: 'na', voyage: 'na', expert: 'na', diamonds: 'na', email: 'na', wf: 'cc', jobs: 'na', bargains: 'na', '\u79fb\u52a8': 'na', jp: 'cc', jm: 'cc', jo: 'cc', ws: 'cc', je: 'cc', kitchen: 'na', '\u0a2d\u0a3e\u0a30\u0a24': 'cc', '\u0627\u06cc\u0631\u0627\u0646': 'cc', ua: 'cc', buzz: 'na', com: 'na', uno: 'na', ck: 'cc', ci: 'cc', ch: 'cc', co: 'cc', cn: 'cc', cm: 'cc', cl: 'cc', cc: 'cc', ca: 'cc', cg: 'cc', cf: 'cc', community: 'na', cd: 'cc', cz: 'cc', cy: 'cc', cx: 'cc', cr: 'cc', cw: 'cc', cv: 'cc', cu: 'cc', pr: 'cc', ps: 'cc', pw: 'cc', pt: 'cc', holdings: 'na', wien: 'na', py: 'cc', ai: 'cc', pa: 'cc', pf: 'cc', pg: 'cc', pe: 'cc', pk: 'cc', ph: 'cc', pn: 'cc', pl: 'cc', pm: 'cc', '\u53f0\u6e7e': 'cc', aero: 'na', catering: 'na', photos: 'na', '\u092a\u0930\u0940\u0915\u094d\u0937\u093e': 'na', graphics: 'na', '\u0641\u0644\u0633\u0637\u064a\u0646': 'cc', '\u09ad\u09be\u09b0\u09a4': 'cc', ventures: 'na', va: 'cc', vc: 'cc', ve: 'cc', vg: 'cc', iq: 'cc', vi: 'cc', is: 'cc', ir: 'cc', it: 'cc', vn: 'cc', im: 'cc', il: 'cc', io: 'cc', in: 'cc', ie: 'cc', id: 'cc', tattoo: 'na', education: 'na', parts: 'na', events: 'na', '\u0c2d\u0c3e\u0c30\u0c24\u0c4d': 'cc', cleaning: 'na', kim: 'na', contractors: 'na', mobi: 'na', center: 'na', photo: 'na', nf: 'cc', '\u0645\u0644\u064a\u0633\u064a\u0627': 'cc', wed: 'na', supply: 'na', '\u7f51\u7edc': 'na', '\u0441\u0430\u0439\u0442': 'na', careers: 'na', build: 'na', '\u0627\u0644\u0627\u0631\u062f\u0646': 'cc', bid: 'na', biz: 'na', '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629': 'cc', gift: 'na', '\u0434\u0435\u0442\u0438': 'na', works: 'na', '\u6e38\u620f': 'na', tm: 'cc', exposed: 'na', productions: 'na', koeln: 'na', dating: 'na', christmas: 'na', bd: 'cc', be: 'cc', bf: 'cc', bg: 'cc', ba: 'cc', bb: 'cc', bl: 'cc', bm: 'cc', bn: 'cc', bo: 'cc', bh: 'cc', bi: 'cc', bj: 'cc', bt: 'cc', bv: 'cc', bw: 'cc', bq: 'cc', br: 'cc', bs: 'cc', post: 'na', by: 'cc', bz: 'cc', om: 'cc', ruhr: 'na', '\u0627\u0645\u0627\u0631\u0627\u062a': 'cc', repair: 'na', xyz: 'na', '\u0634\u0628\u0643\u0629': 'na', viajes: 'na', museum: 'na', fish: 'na', '\u0627\u0644\u062c\u0632\u0627\u0626\u0631': 'cc', hr: 'cc', ht: 'cc', hu: 'cc', hk: 'cc', construction: 'na', hn: 'cc', solar: 'na', hm: 'cc', info: 'na', '\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd': 'cc', uy: 'cc', uz: 'cc', us: 'cc', um: 'cc', uk: 'cc', ug: 'cc', builders: 'na', ac: 'cc', camp: 'na', ae: 'cc', ad: 'cc', ag: 'cc', af: 'cc', int: 'na', am: 'cc', al: 'cc', ao: 'cc', an: 'cc', aq: 'cc', as: 'cc', ar: 'cc', au: 'cc', at: 'cc', aw: 'cc', ax: 'cc', az: 'cc', ni: 'cc', codes: 'na', nl: 'cc', no: 'cc', na: 'cc', nc: 'cc', ne: 'cc', actor: 'na', ng: 'cc', '\u092d\u093e\u0930\u0924': 'cc', nz: 'cc', '\u0633\u0648\u062f\u0627\u0646': 'cc', np: 'cc', nr: 'cc', nu: 'cc', xxx: 'na', '\u4e16\u754c': 'na', kz: 'cc', enterprises: 'na', land: 'na', '\u0627\u0644\u0645\u063a\u0631\u0628': 'cc', '\u4e2d\u56fd': 'cc', directory: 'na'};

const fs = System._nodeRequire('fs');


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


function loadLinesFromFile(path) {
  return readFile(path).split(/\n/);
}


function loadCosmeticsTestCases(path) {
  return JSON.parse(readFile(path));
}


function loadTestCases(path) {
  const testCases = [];

  // Parse test cases
  loadLinesFromFile(path).forEach((line) => {
    try {
      const testCase = JSON.parse(line);
      testCases.push(testCase);
    } catch (ex) {
      /* Ignore exception */
    }
  });

  return testCases;
}


function getGeneralDomain(dom) {
  const v1 = dom.split('.').reverse();
  let pos = 0;
  for (let i = 0; i < v1.length; i++) {
    if (TLDs[v1[i]]) pos = i+1;
    else {
      if (i>0) break;
      else if(v1.length == 4) {
        // check for ip
        let isIP = v1.map(function(s) {
          return parseInt(s);
        }).every(function(d) {
          return d >= 0 && d < 256;
        });
        if (isIP) {
          return dom;
        }
        continue;
      }
    }
  }
  return v1.slice(0, pos+1).reverse().join('.');
}


export default describeModule('adblocker/filters-engine',
  () => ({
    'adblocker/utils': {
      default: () => {
        // const message = `[adblock] ${msg}`;
        // console.log(message);
      },
    },
    'core/utils': {
      default: {
      },
    },
    'core/platform': {
      platformName: 'firefox',
    },
    'platform/public-suffix-list': {
      getGeneralDomain,
    },
  }),
  () => {
    describe('Test cosmetic engine', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const cosmeticsPath = 'modules/adblocker/tests/unit/data/cosmetics.txt';
      const cosmeticMatches = 'modules/adblocker/tests/unit/data/cosmetics_matching.txt';
      const domainMatches = 'modules/adblocker/tests/unit/data/domain_matching.txt';

      beforeEach(function initializeCosmeticEngine() {
        this.timeout(30000);
        FilterEngine = this.module().default;
        serializeEngine = this.module().serializeFiltersEngine;
        deserializeEngine = this.module().deserializeFiltersEngine;

        if (engine === null) {
          engine = new FilterEngine();
          const filters = loadLinesFromFile(cosmeticsPath);

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], true);
          engine.onUpdateFilters([{ filters: [], asset: 'list2', checksum: 2 }], true);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);

          // Try to update after deserialization
          engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }], true);
          engine.onUpdateFilters([{ filters: [], asset: 'list3', checksum: 2 }], true);
        }
      });

      loadCosmeticsTestCases(cosmeticMatches).forEach((testCase) => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.getCosmeticsFilters(testCase.url, [testCase.node]);
              chai.expect(shouldMatch.size).to.equal(rules.length);
              rules.forEach((rule) => {
                if (!shouldMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` to match ${rule.rawLine}`);
                }
                if (shouldNotMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` not to match ${rule.rawLine}`);
                }
              });
              resolve();
            })
        );
      });

      loadCosmeticsTestCases(domainMatches).forEach((testCase) => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.getDomainFilters(testCase.url);
              chai.expect(shouldMatch.size).to.equal(rules.length);
              rules.forEach((rule) => {
                if (!shouldMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} ` +
                         ` to match ${rule.rawLine}`);
                }
                if (shouldNotMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} ` +
                         ` not to match ${rule.rawLine}`);
                }
              });
              resolve();
            })
        );
      });
    });

    describe('Test filter engine one filter at a time', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';

      beforeEach(function importFilterEngine() {
        FilterEngine = this.module().default;
        serializeEngine = this.module().serializeFiltersEngine;
        deserializeEngine = this.module().deserializeFiltersEngine;
      });

      loadTestCases(matchingPath).forEach((testCase) => {
        it(`matches ${testCase.filter} correctly`,
           () => new Promise((resolve, reject) => {
             // Create filter engine with only one filter
             engine = new FilterEngine();
             engine.onUpdateFilters([{
               filters: [testCase.filter],
             }]);

             // Serialize and deserialize engine
             const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
             engine = new FilterEngine();
             deserializeEngine(engine, JSON.parse(serialized), undefined, true);

             // Check should match
             try {
               if (!engine.match(testCase).match) {
                 reject(`Expected ${testCase.filter} to match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               console.log(`STACK TRACE ${ex.stack}`);
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine all filters', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;

      // Load test cases
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';
      const testCases = loadTestCases(matchingPath);

      // Load filters
      const filters = [];
      testCases.forEach((testCase) => {
        filters.push(testCase.filter);
      });

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;
          engine = new FilterEngine();

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }]);
          engine.onUpdateFilters([{ filters: [], asset: 'list2', checksum: 2 }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized, undefined, true));

          // Try to update after deserialization
          engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }]);
          engine.onUpdateFilters([{ filters: [], asset: 'list3', checksum: 2 }]);
        }
      });

      loadTestCases(matchingPath).forEach((testCase) => {
        it(`${testCase.filter} matches correctly against full engine`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               if (!engine.match(testCase).match) {
                 reject(`Expected ${testCase.filter} to match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine should not match', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_not_matching.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);
        }
      });

      loadTestCases(notMatchingPath).forEach((testCase) => {
        it(`${testCase.url} does not match`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               if (engine.match(testCase).match) {
                 reject(`Expected to *not* match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
         );
      });
    });

    describe('Test filter engine should redirect', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_redirect.txt';
      const resourcesPath = 'modules/adblocker/tests/unit/data/resources.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);
          engine.onUpdateResource([{ filters: loadLinesFromFile(resourcesPath) }]);
        }
      });

      loadTestCases(notMatchingPath).forEach((testCase) => {
        it(`${testCase.url} redirected`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               const result = engine.match(testCase);
               if (result.redirect !== testCase.redirect) {
                 reject(`Expected to redirect to ${testCase.redirect} instead` +
                        ` of ${result.redirect} for ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               console.log(ex.stack);
               reject(`Encountered exception ${ex} while checking redirect ` +
                 `${testCase.redirect} against ${testCase.url}`);
             }
           }),
         );
      });
    });
  },
);
