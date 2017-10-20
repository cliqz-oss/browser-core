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
              action,
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

describe('Fresh tab interactions with most visited', function () {
  const mostVisitedDialSelector = '#section-most-visited div.dial';
  const mostVisitedDialTitleSelector = 'div.title';
  const mostVisitedDeleteBtnSelector = 'button.delete';
  const undoBoxSelector = 'div.undo-notification-box';
  const mostVisitedAreaSelector = '#section-most-visited';

  let mostVisitedInitialDialItems;
  let mostVisitedDialToDelete;
  let mostVisitedDeletedTitle;
  let mostVisitedDeletedBtn;
  let mostVisitedAfterClickDialItems;

  const historyResponse = [
    {
      history: [0].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4, 5].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2].map(historyDial),
      custom: []
    },
  ];
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'chrome://cliqz/content/freshtab/home.html',
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
  let messages;
  let listener;

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

    subject.respondsWith(defaultConfig);
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  context('when first two tiles have been deleted from a list of 3 elements', function () {
    let mostVisited2ndDialToDelete;
    let mostVisited2ndDeletedBtn;

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[2],
      });

      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: true,
      });

      subject.respondsWith({
        module: 'freshtab',
        action: 'resetAllHistory',
        response: historyResponse[2],
      });


      return subject.load()
      .then(function () {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);
        mostVisitedInitialDialItems = subject.queryAll(mostVisitedDialSelector);
        mostVisitedDialToDelete = mostVisitedInitialDialItems[0];
        mostVisitedDeletedBtn = mostVisitedDialToDelete.querySelector(mostVisitedDeleteBtnSelector);
        mostVisitedDeletedBtn.click();
        return waitFor(() => (subject.query(undoBoxSelector)));
      })
      .then(function () {
        mostVisited2ndDialToDelete = mostVisitedInitialDialItems[1];
        mostVisited2ndDeletedBtn = mostVisitedDialToDelete.querySelector(mostVisitedDeleteBtnSelector);
        mostVisited2ndDeletedBtn.click();
        return waitFor(() => (subject.query(undoBoxSelector)));
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    describe('clicking on the "Restore all" button in settings panel', function () {
      const settingsButtonSelector = '#settings-btn';
      const settingsPanelSelector = '#settings-panel';
      const restoreBtnSelector = '#settings-panel button.link';

      beforeEach(function () {
        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'))
          .then(function () {
            subject.query(restoreBtnSelector).click();
            return waitFor(() => subject.queryAll(mostVisitedDialSelector).length == 3);
          });
      });

      it('renders 3 most visited elements', function () {
        chai.expect(subject.queryAll(mostVisitedDialSelector).length).to.equal(3);
      });

      it('changes the "Restore all" button state to inactive', function () {
        chai.expect(subject.query(restoreBtnSelector).disabled).to.be.true;
      });

      it('sends a "resetAllHistory" message', function () {
        chai.expect(messages.has('resetAllHistory')).to.equal(true);
        chai.expect(messages.get('resetAllHistory').length).to.equal(1);
      });

    });
  });

  context('when most visited has just one element', function () {
    describe('clicking on a delete button of the element', function () {

      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: historyResponse[0],
        });

        return subject.load()
          .then(function () {
            // Keep track of received messages
            messages = new Map();
            listener = function (msg) {
              if (!messages.has(msg.action)) {
                messages.set(msg.action, []);
              }

              messages.get(msg.action).push(msg);
            };
            subject.chrome.runtime.onMessage.addListener(listener);

            mostVisitedInitialDialItems = subject.queryAll(mostVisitedDialSelector);
            mostVisitedDialToDelete = mostVisitedInitialDialItems[0];
            mostVisitedDeletedTitle = mostVisitedDialToDelete.querySelector(mostVisitedDialTitleSelector).textContent;
            mostVisitedDeletedBtn = mostVisitedDialToDelete.querySelector(mostVisitedDeleteBtnSelector);
            mostVisitedDeletedBtn.click();
            return waitFor(() => (subject.query(undoBoxSelector)));
          });
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
      });

      describe('of the first element', function () {
        it('removes the element', function () {
          chai.expect(mostVisitedDeletedTitle).to.equal(historyResponse[0].history[0].displayTitle);
        });

        it('does not render any other elements', function () {
          chai.expect(subject.queryAll(mostVisitedDialSelector).length).to.equal(0);
        });

        it('renders a popup with undo message', function () {
          chai.expect(subject.query(undoBoxSelector)).to.exist;
        });

        it('still renders the most visited area', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        });

        it('sends a "removeSpeedDial" message', function () {
          chai.expect(messages.has('removeSpeedDial')).to.equal(true);
          chai.expect(messages.get('removeSpeedDial').length).to.equal(1);
        });

        describe('then clicking on a close button of the undo popup', function () {
          const undoPopupCloseBtnSelector = 'div.undo-notification-box button.close';

          beforeEach(function () {
            subject.query(undoPopupCloseBtnSelector).click();
            return waitFor(() => !(subject.query(undoBoxSelector)))
              .then(function () {
                mostVisitedAfterClickDialItems = subject.queryAll(mostVisitedDialSelector);
              });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('total amount of rendered elements equals to 0', function () {
            chai.expect(mostVisitedAfterClickDialItems.length).to.equal(0);
          });
        });

        describe('then clicking on an undo button of the undo popup', function () {
          const undoPopupUndoBtnSelector = 'div.undo-notification-box button.undo';

          beforeEach(function () {
            subject.query(undoPopupUndoBtnSelector).click();
            return waitFor(() => !(subject.query(undoBoxSelector)))
              .then(function () {
                mostVisitedAfterClickDialItems = subject.queryAll(mostVisitedDialSelector);
              });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('renders the previously deleted element', function () {
            let deletedDialExists = false;

            [...mostVisitedAfterClickDialItems].forEach(function(dial) {
              if (dial.querySelector(mostVisitedDialTitleSelector).textContent
                      === mostVisitedDeletedTitle) {
                deletedDialExists = true;
              };
            });
            chai.expect(deletedDialExists).to.equal(true);
          });

          it('total amount of rendered elements equals to 1', function () {
            chai.expect(mostVisitedAfterClickDialItems.length).to.equal(1);
          });

          it('renders the previously deleted element on correct position', function () {
            chai.expect([...mostVisitedAfterClickDialItems][0].querySelector(mostVisitedDialTitleSelector).textContent)
              .to.equal(mostVisitedDeletedTitle);
          });

          it('sends a "revertHistorySpeedDial" message', function () {
            chai.expect(messages.has('revertHistorySpeedDial')).to.equal(true);
            chai.expect(messages.get('revertHistorySpeedDial').length).to.equal(1);
          });

        });
      });
    });
  });

  context('when most visited has six elements', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[1],
      });
      return subject.load();
    });

      describe('clicking on a delete button of the first element', function () {
        beforeEach(function () {
          mostVisitedInitialDialItems = subject.queryAll(mostVisitedDialSelector);
          mostVisitedDialToDelete = mostVisitedInitialDialItems[0];
          mostVisitedDeletedTitle = mostVisitedDialToDelete.querySelector(mostVisitedDialTitleSelector).textContent;
          mostVisitedDeletedBtn = mostVisitedDialToDelete.querySelector(mostVisitedDeleteBtnSelector);
          mostVisitedDeletedBtn.click();
          return waitFor(() => (subject.queryAll(mostVisitedDialSelector).length === 5))
            .then(function () {
              mostVisitedAfterClickDialItems = subject.queryAll(mostVisitedDialSelector);
          });
        });

        it('removes the element', function () {
          chai.expect(mostVisitedDeletedTitle).to.equal(historyResponse[1].history[0].displayTitle);
        });

        it('keeps rendering a full list consisting of 5 elements', function () {
          chai.expect(subject.queryAll(mostVisitedDialSelector).length).to.equal(5);
        });
      });

      describe('clicking on a delete button of the fifth element', function () {
        beforeEach(function () {
          mostVisitedInitialDialItems = subject.queryAll(mostVisitedDialSelector);
          mostVisitedDialToDelete = mostVisitedInitialDialItems[4];
          mostVisitedDeletedTitle = mostVisitedDialToDelete.querySelector(mostVisitedDialTitleSelector).textContent;
          mostVisitedDeletedBtn = mostVisitedDialToDelete.querySelector(mostVisitedDeleteBtnSelector);
          mostVisitedDeletedBtn.click();
          return waitFor(() => (subject.queryAll(mostVisitedDialSelector).length === 5))
            .then(function () {
              mostVisitedAfterClickDialItems = subject.queryAll(mostVisitedDialSelector);
          });
        });

        it('removes the element', function () {
          chai.expect(mostVisitedDeletedTitle).to.equal(historyResponse[1].history[4].displayTitle);
        });

        it('keeps rendering a full list consisting of 5 elements', function () {
          chai.expect(subject.queryAll(mostVisitedDialSelector).length).to.equal(5);
        });
      });

    });
  });
