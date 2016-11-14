export default describeModule("core/templates",
  function () {
    return {
    	"handlebars": {
    		default: {
          helpers: {},
          registerHelper(name, fn) {
            this.helpers[name] = fn;
          }
        }
    	},
    	"core/utils": {
    		default: {
    			TEMPLATES: {},
    			PARTIALS: [],
    			MESSAGE_TEMPLATES: []
    		}
    	}
    }
  },
  function () {
  	describe("helpers", function () {
      let helpers;

      beforeEach(function () {
        helpers = this.deps("handlebars").default.helpers;
      });

      describe('emphasis', function () {

        const TEST_CASES = [
          { text: "Hello motto hello", q: "hello", expected: "<em>Hello</em> motto <em>hello</em>" },
          { text: "Hello motto hello", q: "he", expected: "<em>He</em>llo motto <em>he</em>llo" },
          { text: "Hello motto hello", q: "h", expected: "Hello motto hello" },
          { text: "Hello motto hello", q: "random stuff", expected: "Hello motto hello" },
          {
            text: "Hello motto hello", q: "Hello motto hello",
            expected: "<em>Hello</em> <em>motto</em> <em>hello</em>"
          },
          {
            text: "http://www.cliqz.com/cliqz_random_facts", q: "cliqz",
            expected: "http://www.<em>cliqz</em>.com/<em>cliqz</em>_random_facts"
          },
          {
            text: "http://www.cliqz.com/cliqz_random_facts", q: "www.cliqz.com",
            expected: "http://<em>www</em>.<em>cliqz</em>.<em>com</em>/<em>cliqz</em>_random_facts"
          },
          { text: "Süddeutsche.de", q: "süd", expected: "<em>Süd</em>deutsche.de" },
          { text: "Süddeutsche.de", q: "sud", expected: "<em>Süd</em>deutsche.de" },
          { text: "Suddeutsche.de", q: "süd", expected: "<em>Sud</em>deutsche.de" },
          { text: "Süddeutsche.de", q: "sued", expected: "<em>Süd</em>deutsche.de" },
          { text: "Süddeutsche.de", q: "sud", expected: "<em>Süd</em>deutsche.de" },
          { text: "Suddeutsche.de", q: "sud", expected: "<em>Sud</em>deutsche.de" },
          { text: "Sueddeutsche.de", q: "süd", expected: "<em>Sued</em>deutsche.de" },
          { text: "Sueddeutsche.de", q: "sud", expected: "<em>Sued</em>deutsche.de" },
          { text: "sueddeutsche.de", q: "sueddeutsche.de", expected: "<em>sueddeutsche</em>.<em>de</em>" },
          { text: "fuersie.de", q: "FÜRSIE", expected: "<em>fuersie</em>.de" },
          { text: "fuersie.de", q: "F R SIE de", expected: "fuer<em>sie</em>.<em>de</em>" }
        ];

        let emphasis;

        beforeEach(function () {
          emphasis = helpers["emphasis"];
          function SafeString(str) {
            this.str = str;
          }
          SafeString.prototype.toString = function () {
            return this.str;
          }
          this.deps("handlebars").default.SafeString = SafeString
          this.deps("handlebars").default.tplCache = {
            emphasis(arr) {
              var result = '';
              arr.forEach(function(element, index) {
                if (index % 2 !== 0)
                  result += '<em>' + element + '</em>';
                else
                  result += element;
              });
              return result;
            }
          }
        });

        TEST_CASES.forEach(function(testCase, idx) {
          it("Test " + idx + " - q: " + testCase.q + ", text: " + testCase.text, function () {
            chai.expect(emphasis(testCase.text, testCase.q, 2, true).toString()).to.equal(testCase.expected);
          });
        })
      })
  	});

  }
);
