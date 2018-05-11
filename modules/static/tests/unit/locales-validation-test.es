/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');


// extracts only the key from a line of text
function key(line) {
  return /"(.*?)"/.exec(line)[0];
}


function listLocales(localesPath) {
  return fs.readdirSync(localesPath)
    .filter(file => !file.startsWith('__') && !file.startsWith('.'));
}


function readLocaleFile(localesPath) {
  return fs.readFileSync(localesPath, 'utf8');
}


export default describeModule('static/main',
  () => ({}),
  () => {
    describe('Validate locale structure', () => {
      const localesPath = 'modules/static/dist/locale';
      // Load all available locales
      const langs = listLocales(localesPath);
      let locales;

      beforeEach(function () {
        locales = langs.map(lang =>
          readLocaleFile(`${localesPath}/${lang}/cliqz.json`)
            .split('\n')
            .slice(1, -2)
        );

      });

      it('All locales keys have the mandatory "message" key', () => {
        langs.map(lang => {
          var locale = JSON.parse(readLocaleFile(`${localesPath}/${lang}/cliqz.json`));
          Object.keys(locale).forEach(key => {
            chai.expect(locale[key].message,
              "message does not exist for key <"+ key + "> in the locale file for " + lang).to.exist;
          })
        });
      });

      it('All locales are valid JSON', () => {
        langs.map(lang => {
          JSON.parse(readLocaleFile(`${localesPath}/${lang}/cliqz.json`))
        });
      });

      it('All locales have the same length', () => {
        for (let i = 0; i < locales.length - 1; i += 1) {
          chai.expect(locales[i].length).to.equal(locales[i + 1].length);
        }
      });

      it('All locales have the same structure', () => {
        // Zip values of each languages
        const zipped = (rows => rows[0].map((_, c) => rows.map(row => row[c])))(locales);

        // Check that the order of keys is the same
        for (let i = 0; i < zipped.length; i += 3) {
          const row = zipped[i];
          for (let j = 0; j < row.length - 1; j += 1) {
            chai.expect(key(row[j])).to.equal(key(row[j + 1]));
          }
        }
      });
    });
  },
);
