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
    .filter(file => !file.startsWith('__'));
}


function readLocaleFile(localesPath) {
  return fs.readFileSync(localesPath, 'utf8');
}


export default describeModule('static/main',
  () => ({}),
  () => {
    describe('Validate locale structure', () => {
      const localesPath = 'modules/static/dist/locale';

      it('All locales should have the same structure', () => {
        // Load all available locales
        const langs = listLocales(localesPath);
        const locales = langs.map(lang =>
          readLocaleFile(`${localesPath}/${lang}/cliqz.json`)
            .split('\n')
            .slice(1, -2)
        );

        // Check that they have same length
        for (let i = 0; i < locales.length - 1; i += 1) {
          chai.expect(locales[i].length).to.equal(locales[i + 1].length);
        }

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
