/* global chai, describeModule */

const text = 'Vamp quäkt: Jody schön! Jörg bäckt quasi zwei Haxenfüße vom Wildpony.';
const testCases = [
  {
    title: 'Should not change text if query is not found',
    query: 'NOTFOUND',
    result: text
  },
  {
    title: 'Should use space and "/" as a token separator',
    query: 'vamp  zwei///wild',
    result: '<em>Vamp</em> quäkt: Jody schön! Jörg bäckt quasi <em>zwei</em> Haxenfüße vom <em>Wild</em>pony.'
  },
  {
    title: 'Should not treat "." asa token separator (EX-9230)',
    query: 'vamp.zwei',
    result: text
  },
  {
    title: 'Emphasis should be case insensitive',
    query: 'vamp wild',
    result: '<em>Vamp</em> quäkt: Jody schön! Jörg bäckt quasi zwei Haxenfüße vom <em>Wild</em>pony.'
  },
  {
    title: 'Should trim non-letter symbols from query',
    query: '"vamp wild!"',
    result: '<em>Vamp</em> quäkt: Jody schön! Jörg bäckt quasi zwei Haxenfüße vom <em>Wild</em>pony.'
  },
  {
    title: 'Correctly treats symbols ä, ö, ü, and ß in text',
    query: 'qua jorg backt fuse',
    result: 'Vamp <em>quä</em>kt: Jody schön! <em>Jörg</em> <em>bäckt</em> <em>qua</em>si zwei Haxen<em>füße</em> vom Wildpony.'
  },
  {
    title: 'Correctly treats symbols ä, ö, ü, and ß in text',
    query: 'quae joerg baeckt fuesse',
    result: 'Vamp <em>quä</em>kt: Jody schön! <em>Jörg</em> <em>bäckt</em> <em>qua</em>si zwei Haxen<em>füße</em> vom Wildpony.'
  },
  {
    title: 'Correctly treats symbols ä, ö, ü, and ß in query',
    query: 'vämp qü jö ßi haex fuse voem',
    result: '<em>Vamp</em> <em>qu</em>äkt: <em>Jo</em>dy schön! <em>Jö</em>rg bäckt <em>qu</em>a<em>si</em> zwei <em>Hax</em>en<em>füße</em> <em>vom</em> Wildpony.'
  },

];

export default describeModule('dropdown/helpers',
  function () {
    return {
      handlebars: {
        default: {
          SafeString: function (s) {
            this.s = s;
          },
        }
      },
      './templates': {
        default: {
          emphasis(out) {
            return out.map((s, i) => (i % 2 ? `<em>${s}</em>` : s)).join('');
          },
        },
      },
      '../core/content/i18n': {},
    };
  },
  function () {
    describe('#emphasis', () => {
      let emphasis;
      beforeEach(function () {
        emphasis = this.module().default.emphasis;
      });

      testCases.forEach((test) => {
        it(test.title, () => {
          const result = emphasis(
            text,
            test.query,
            0,
            !!test.cleanControlChars
          ).s;
          chai.expect(result).to.be.equal(test.result);
        });
      });
    });
  });
