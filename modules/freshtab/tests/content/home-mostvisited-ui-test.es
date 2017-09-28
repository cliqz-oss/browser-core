const clone = o => JSON.parse(JSON.stringify(o));

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
    this.modules = {};
    const listeners = new Set();
    this.chrome = {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.add(listener);
          },
          removeListener(listener) {
            listeners.delete(listener);
          }
        },
        sendMessage: ({ module, action, requestId }) => {
          const response = this.modules[module].actions[action];
          listeners.forEach(l => {
            l({
              response,
              type: 'response',
              requestId,
              source: 'cliqz-content-script'
            });
          })
        }
      },
      i18n: {
        getMessage: k => k,
      }
    }
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/freshtab/home.html';
    this.iframe.width = 900;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.chrome = this.chrome;
      this.iframe.contentWindow.addEventListener('load', () => resolve());
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

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  respondsWith({ module, action, response, requestId }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }
}
const historyDial = (i) => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: false,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

describe('Fresh tab most visited UI', function () {
  const mostVisitedAreaSelector = '#section-most-visited';
  const mostVisitedHeaderSelector = '#section-most-visited div.dial-header';
  const mostVisitedItemSelector = '#section-most-visited div.dial';
  const restoreOptionSelector = '#settings-panel button.link';
  const historyResponse = [
    {
      history: [0].map(historyDial),
      custom: []
    },

    {
      history: [0, 1].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4, 5].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4, 5, 6].map(historyDial),
      custom: []
    },
  ];
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'resource://cliqz/freshtab/home.html',
      isBrowser: false,
      showNewBrandAlert: false,
      messages: {},
      isHistoryEnabled: true,
      hasActiveNotifications: false,
      componentsState: {
        historyDials: {
          visible: true
        },
        customDials: {
          visible: false
        },
        search: {
          visible: false
        },
        news: {
          visible: false
        },
        background: {
          image: 'bg-default'
        }
      }
    },
  };
  let subject;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  describe('renders area', function () {
    context('when set to be visible', function () {
      beforeEach(function () {
        const configVisible = clone(defaultConfig);
        configVisible.response.componentsState.historyDials.visible = true;
        subject.respondsWith(configVisible);

        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: historyResponse[0],
        });
        return subject.load();
      });

      it('with the visibility switch turned on', function () {
        const settingsRowSelector = '#settings-panel div.settings-row';
        const settingsSwitchSelector = 'div.switch-container input.switch';
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows[1].querySelector(settingsSwitchSelector))
          .to.have.property('checked', true);
      });

      it('with visible dials', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
      });
    });

    context('when set to not be visible', function () {
      beforeEach(function () {
        const configNotVisible = clone(defaultConfig);
        configNotVisible.response.componentsState.historyDials.visible = false;
        subject.respondsWith(configNotVisible);

        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: historyResponse[0],
        });
        return subject.load();
      });

      it('with the visibility switch turned off', function () {
        const settingsRowSelector = '#settings-panel div.settings-row';
        const settingsSwitchSelector = 'div.switch-container input.switch';
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows[1].querySelector(settingsSwitchSelector))
          .to.have.property('checked', false);
      });

      it('with no visible dials', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
      });
    });
  });

  context('when has no deleted items', function () {

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: false,
      });
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
      subject.respondsWith(defaultConfig);
      return subject.load().then(() => {
        subject.query('#settings-btn').click();
        return waitFor(() => !subject.query('#settings-btn'))
      })
    });

    it('restore option is not active', function () {
      const restoreButton = subject.query(restoreOptionSelector);
      chai.expect(restoreButton.disabled).to.be.true;
    });
  });

  context('when has some deleted items', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: true,
      });
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
      subject.respondsWith(defaultConfig);
      return subject.load().then(() => {
        subject.query('#settings-btn').click();
        return waitFor(() => !subject.query('#settings-btn'))
      })
    });

    it('restore option is active', function () {
      const restoreButton = subject.query(restoreOptionSelector);
      chai.expect(restoreButton.disabled).to.be.false;
    });
  });

  context('when a tile has been deleted', function () {
    const mostVisitedDeleteSelector = '#section-most-visited div.dial button.delete';
    const undoBoxSelector = 'div.undo-notification-box';

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });

      subject.respondsWith(defaultConfig);

      return subject.load().then(() => {
        subject.query(mostVisitedDeleteSelector).click();
        return waitFor(() => subject.query(undoBoxSelector));
      });
    });

    describe('renders undo popup message', function () {
      it('successfully', function () {
        chai.expect(subject.query(undoBoxSelector)).to.exist;
      });

      it('with a delete button', function () {
        const undoBoxDeleteBtnSelector = 'div.undo-notification-box button.close';
        chai.expect(subject.query(undoBoxDeleteBtnSelector)).to.exist;
      });

      it('with an undo button', function () {
        const undoBoxUndoBtnSelector = 'div.undo-notification-box button.undo';
        chai.expect(subject.query(undoBoxUndoBtnSelector)).to.exist;
      });

      it('with existing and correct message text', function () {
        chai.expect(subject.query(undoBoxSelector))
          .to.contain.text(historyResponse[0].history[0].displayTitle);
        chai.expect(subject.query(undoBoxSelector))
          .to.contain.text('freshtab.app.speed-dial.removed');
      });
    });
  });

  describe('generated results', function () {
    for (let i = 0; i < historyResponse.length; i++) {
      context(`with ${i + 1} elements`, function () {

        beforeEach(function () {
          subject.respondsWith({
            module: 'freshtab',
            action: 'getSpeedDials',
            response: historyResponse[i],
          });

          subject.respondsWith(defaultConfig);

          return subject.load();
        })

        describe('renders area', function () {
          it('with an existing label', function () {
            chai.expect(subject.query(mostVisitedHeaderSelector)).to.exist;
          });

          it('with a correct amount of elements', function () {
            let amountOfTiles = Math.min(6, historyResponse[i].history.length);
            chai.expect(subject.queryAll(mostVisitedItemSelector).length)
              .to.equal(amountOfTiles);
          });
        });

        describe('renders each element', function () {
          const mostVisitedLogoSelector = '#section-most-visited div.dial div.logo';
          let mostVisitedItemsLogos;

          beforeEach(function () {
            mostVisitedItemsLogos = subject.queryAll(mostVisitedLogoSelector);
          });

          it('with existing square logos with correct background color', function () {
            [...mostVisitedItemsLogos].forEach(function (item) {
              chai.expect(item).to.exist;
              chai.expect(getComputedStyle(item).background)
                .to.contain('rgb(195, 4, 62)');
            });
          });

          it('with existing and correct two chars on logos', function () {
            [...mostVisitedItemsLogos].forEach(function (item, j) {
              chai.expect(item.textContent).to.exist;
              chai.expect(item.textContent.length).to.equal(2);
              chai.expect(item).to.have.text(historyResponse[i].history[j].logo.text);
            });
          });

          it('with existing and correct link titles', function () {
            const mostVisitedItemsDials = subject.queryAll(mostVisitedItemSelector);

            [...mostVisitedItemsDials].forEach(function (item, j) {
              chai.expect(item.title).to.exist;
              chai.expect(item.title).to.equal(historyResponse[i].history[j].url);
            });
          });

          it('with existing and correct links', function () {
            const mostVisitedLinkSelector = '#section-most-visited div.dial a';
            const mostVisitedItemsLinks = subject.queryAll(mostVisitedLinkSelector);

            [...mostVisitedItemsLinks].forEach(function (item, j) {
              chai.expect(item.href).to.exist;
              chai.expect(item.href).to.contain(historyResponse[i].history[j].url);
            });
          });

          it('with existing and correct descriptions', function () {
            const mostVisitedDescriptionSelector = '#section-most-visited div.dial div.title';
            const mostVisitedItemsDesc = subject.queryAll(mostVisitedDescriptionSelector);

            [...mostVisitedItemsDesc].forEach(function (item, j) {
              chai.expect(item).to.exist;
              chai.expect(item).to.have.text(historyResponse[i].history[j].displayTitle);
            });
          });

          it('with existing delete buttons', function () {
            const mostVisitedDeleteSeletor = '#section-most-visited div.dial button.delete';
            const mostVisitedItemsButton = subject.queryAll(mostVisitedDeleteSeletor);

            [...mostVisitedItemsButton].forEach(function (item) {
              chai.expect(item).to.exist;
            });
          });
        });


      });
    };
  });
});
