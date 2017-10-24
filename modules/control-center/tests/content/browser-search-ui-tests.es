function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let intervals = [];
function registerInterval(interval) {
  intervals.push(interval);
}

function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
}

function waitFor(fn) {
  var resolver, rejecter, promise = new Promise(function (res, rej) {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  var interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

class Subject {
  constructor() {
    this.messages = [];
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/control-center/index.html';
    this.iframe.width = 455;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.addEventListener('load', () => resolve());
    }).then(() => {

      this.iframe.contentWindow.addEventListener('message', ev => {
        var data = JSON.parse(ev.data);
        this.messages.push(data);
      });

      return waitFor(() => {
        return this.messages.length === 1
      })
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(data = {}) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-control-center',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), "*");
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }
}

describe("Search options UI browser", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('Search options section', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: false,
        },
        autocomplete: {
          visible: true,
          state: [
            {
              name: "Google",
              "alias": "#go",
              "default": true,
              "code": 3
            },
            {
              "name": "Yahoo",
              "alias": "#ya",
              "default": false,
              "code": 4
            },
            {
              "name": "Bing",
              "alias": "#bi",
              "default": false,
              "code": 5
            },
            {
              "name": "Amazon.com",
              "alias": "#am",
              "default": false,
              "code": 7
            },
            {
              "name": "DuckDuckGo",
              "alias": "#du",
              "default": false,
              "code": 0
            },
            {
              "name": "Twitter",
              "alias": "#tw",
              "default": false,
              "code": 0
            },
            {
              "name": "Wikipedia (en)",
              "alias": "#wi",
              "default": false,
              "code": 6
            },
            {
              "name": "Google Images",
              "alias": "#gi",
              "default": false,
              "code": 1
            },
            {
              "name": "Google Maps",
              "alias": "#gm",
              "default": false,
              "code": 2
            },
            {
              "name": "YouTube",
              "alias": "#yt",
              "default": false,
              "code": 10
            },
            {
              "name": "Ecosia",
              "alias": "#ec",
              "default": false,
              "code": 11
            },
            {
              "name": "Start Page",
              "alias": "#st",
              "default": false,
              "code": 0
            }
          ],
          "supportedIndexCountries": {
            "de": {
              "selected": true,
              "name": "Germany"
            },
            "fr": {
              "selected": false,
              "name": "France"
            },
            "us": {
              "selected": false,
              "name": "United States"
            }
          }
        },
        geolocation: {
          visible: true,
          state: {
            yes: {
              name: "Always",
              selected: true
            },
            ask: {
              name: "Always ask",
              selected: false
            },
            no: {
              name: "Never",
              selected: false
            }
          }
        },
        'human-web': {
          visible: true,
          state: true
        },
        hpn: {
          visible: true,
          state: false
        },
        'privacy-dashboard': {
          visible: true
        },
        adult: {
          visible: true,
          state: {
            conservative: {
              name: 'Always',
              selected: false
            },
            moderate: {
              name: 'Always ask',
              selected: true
            },
            liberal: {
              name: 'Never',
              selected: false
            }
          }
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('search options section exists', function () {
      const sectionSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"]';
      chai.expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on the search section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-2"]').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-2"]').classList.contains('active'));
      });

      it('renders "Search options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] [data-i18n="control-center-searchoptions"]';
        chai.expect(subject.query(titleSelector)).to.exist;
        chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-searchoptions');
      });

      it('renders arrow for search options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] #arrow';
        chai.expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 7 options', function () {
        chai.expect(subject.queryAll('.accordion #accordion-2 .bullet')).to.not.be.null;
        chai.expect(subject.queryAll('.accordion #accordion-2 .bullet').length).to.equal(7);
      });

      context('"Supplementary Search Engine" block', function () {
        it('renders "Supplementary Search Engine"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-search-engine"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-search-engine');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="complementary_search"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        function supplementaryEngines(currentValue) {
          it(`changed to engine ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="complementary_search"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="Google"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "complementary-search")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.defaultSearch", currentValue);
              }
            );
          });
        };

        var i;
        for (i = 0; i < data.module.autocomplete.state.length; i++ ) {
          var value = data.module.autocomplete.state[i].name;
          supplementaryEngines(value);
        };
      });

      context('"Block adult websites" block', function () {
        it('renders "Block adult websites"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-explicit"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-explicit');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="search_adult"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[1];
          chai.expect(explicitObject.querySelector('.infobutton')).to.exist;
        });

        function explicitContent(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_adult"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="moderate"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.adultContentFilter");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "search_adult");
              }
            );
          });

          it(`renders "${data.module.adult.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_adult"] option[value="${currentValue}"]`;
            chai.expect(subject.query(optionSelector).textContent.trim()).to.equal(data.module.adult.state[currentValue].name);
          });
        };

        explicitContent('conservative');
        explicitContent('moderate');
        explicitContent('liberal');
      });

      context('"Share location" block', function () {
        it('renders "Share location"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-location"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-location');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="search_location"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[2];
          chai.expect(locationObject.querySelector('.infobutton')).to.exist;
        });

        it('renders "Learn more"', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[2];
          chai.expect(locationObject.querySelector('.location-more')).to.exist;
        });

        it('url is correct', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[2];
          chai.expect(locationObject.querySelector('.location-more').getAttribute('openurl')).to.equal('https://cliqz.com/support/local-results');
        });

        function shareLocation(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_location"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="yes"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.share_location");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "search_location");
              }
            );
          });

          it(`renders "${data.module.geolocation.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_location"] option[value="${currentValue}"]`;
            chai.expect(subject.query(optionSelector).textContent.trim()).to.equal(data.module.geolocation.state[currentValue].name);
          });
        };

        shareLocation('yes');
        shareLocation('ask');
        shareLocation('no');
      });

      context('"Search Results for" block', function () {
        it('renders "Search Results for"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-backend-country"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-backend-country');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="search-index-country"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        it('does not render info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[3];
          chai.expect(explicitObject.querySelector('.infobutton')).to.be.null;
        });

        function countryBackend(currentValue) {
          it(`changed to country ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search-index-country"]';
            const select = subject.query(dropdownSelector);
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "search-index-country")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.defaultCountry", currentValue);
              }
            );
          });

          it(`renders "${data.module.autocomplete.supportedIndexCountries[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet .custom-dropdown[data-target="search-index-country"] option[value="${currentValue}"]`;
            chai.expect(subject.query(optionSelector).textContent.trim()).to.equal(data.module.autocomplete.supportedIndexCountries[currentValue].name);
          });
        };

        countryBackend('de');
        countryBackend('fr');
        countryBackend('us');
      });

      context('"Search via proxy" block', function () {
        it('renders "Search via proxy"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-proxy"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-proxy');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="search_proxy"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          chai.expect(locationObject.querySelector('.infobutton')).to.exist;
        });

        function proxy(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_proxy"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="false"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.hpn-query");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "search_proxy");
              }
            );
          });
        };
        proxy('true');
        proxy('false');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_proxy"] [data-i18n="control-center-enabled"]';
          const disabledSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_proxy"] [data-i18n="control-center-disabled"]';
          chai.expect(subject.query(enabledSelector)).to.exist;
          chai.expect(subject.query(enabledSelector).textContent.trim()).to.equal('control-center-enabled');
          chai.expect(subject.query(disabledSelector)).to.exist;
          chai.expect(subject.query(disabledSelector).textContent.trim()).to.equal('control-center-disabled');
        });
      });

      context('"Human Web" block', function () {
        it('renders "Human Web"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-humanweb"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-humanweb');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet .custom-dropdown[data-target="search_humanweb"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[5];
          chai.expect(locationObject.querySelector('.infobutton')).to.exist;
        });

        function humanWeb(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_humanweb"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="enabled"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.humanWebOptOut");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "search_humanweb");
              }
            );
          });
        };
        humanWeb('enabled');
        humanWeb('disabled');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_humanweb"] [data-i18n="control-center-enabled"]';
          const disabledSelector = '.accordion #accordion-2 .bullet .custom-dropdown[data-target="search_humanweb"] [data-i18n="control-center-disabled"]';
          chai.expect(subject.query(enabledSelector)).to.exist;
          chai.expect(subject.query(enabledSelector).textContent.trim()).to.equal('control-center-enabled');
          chai.expect(subject.query(disabledSelector)).to.exist;
          chai.expect(subject.query(disabledSelector).textContent.trim()).to.equal('control-center-disabled');
        });
      });

      context('"Transparency monitor" block', function () {
        it('renders "Transparency monitor"', function () {
          const titleSelector = '#accordion-2 .bullet [data-i18n="control-center-transparency"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-transparency');
        });

        it('renders button', function () {
          const buttonSelector = '#accordion-2 .bullet button[data-target="search_transparency"]';
          chai.expect(subject.query(buttonSelector)).to.exist;
        });

        it('url is correct', function () {
          const buttonSelector = '#accordion-2 .bullet button[data-target="search_transparency"]';
          chai.expect(subject.query(buttonSelector).getAttribute('openurl')).to.equal('about:transparency');
        });

        it('does not render info button', function () {
          const monitorObject = subject.queryAll('#accordion-2 .bullet')[6];
          chai.expect(monitorObject.querySelector('.infobutton')).to.be.null;
        });
      });
    });
  });
})
