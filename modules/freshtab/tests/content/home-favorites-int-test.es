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
const favoritesDial = (i) => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: true,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

const amazonDial = {
  title: 'http://amazon.de/',
  id: 'amazon.de/',
  url: 'http://amazon.de/',
  displayTitle: 'amazon.de',
  custom: true,
  logo: {
    backgroundColor: 'ff951d',
    backgroundImage: `url(https://cdn.cliqz.com/brands-database/database/1502005705085/logos/amazon/$.svg)`,
    text: 'am',
    color: '#fff',
    buttonsClass: 'cliqz-brands-button-2',
    style: 'background-color: #ff951d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1502005705085/logos/amazon/$.svg); text-indent: -10em;'
  }
};

describe('Fresh tab interactions with favorites', function () {
  const favoritesDialSelector = '#section-favorites div.dial:not(.dial-plus)';
  const favoritesPlusSelector = '#section-favorites div.dial-plus';
  const favoritesPlusBtnSelector = 'button.plus-dial-icon';
  const favoritesDialTitleSelector = 'div.title';
  const favoritesDeleteBtnSelector = 'button.delete';
  const undoBoxSelector = 'div.undo-notification-box';
  const favoritesAreaSelector = '#section-favorites';

  let favoritesInitialDialItems;
  let favoritesDialToDelete;
  let favoritesDeletedTitle;
  let favoritesDeletedBtn;
  let favoritesAfterClickDialItems;

  const favoritesResponse = [
    {
      history: [],
      custom: [0].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3, 4, 5].map(favoritesDial)
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
          visible: false
        },
        customDials: {
          visible: true
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
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  context('when favorites have just one element', function () {
    const addFormSelector = 'form.addDialForm';

    describe('clicking on the "+" element', function () {
      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });

        return subject.load()
          .then(function () {
            subject.query(favoritesPlusBtnSelector).click();
            return waitFor(() => (subject.query(addFormSelector)));
          });
      });

      it('renders an "Add a favorite" form', function () {
        chai.expect(getComputedStyle(subject.query(addFormSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('renders an "Add a favorite" form in a correct position', function () {
        chai.expect(subject.queryAll('#section-favorites div.dial')[1]
          .contains(subject.query(addFormSelector))).to.be.true;
      });

      it('does not render the "+" button anymore', function () {
        chai.expect(getComputedStyle(subject.query(favoritesPlusBtnSelector).parentNode).display)
          .to.contain('none');
      });

      describe("then clicking on the form's close button", function () {
        beforeEach(function () {
          subject.query('button.hideAddForm').click();
          return waitFor(() => subject.query(addFormSelector).parentNode.style.display === 'none');
        });

        it('renders a "+" button', function () {
          chai.expect(getComputedStyle(subject.query(favoritesPlusBtnSelector).parentNode).display)
            .to.not.contain('none');
        });

        it('does not render the "Add a favorite" form anymore', function () {
          chai.expect(getComputedStyle(subject.query(addFormSelector).parentNode).display)
            .to.contain('none');
        });
      });
    });

    /* TODO: need to re-render react to update the value */
    describe.skip('simulating adding a new favorite element', function () {
      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });

        subject.respondsWith({
          module: 'freshtab',
          action: 'addSpeedDial',
          response: amazonDial,
        });

        return subject.load()
          .then(function () {
            subject.query(favoritesPlusBtnSelector).click();
            return waitFor(() => (subject.query(addFormSelector)))
              .then(function() {
                subject.query('form.addDialForm input.addUrl').value = 'aaaa';
                let event = new Event('change');
                subject.query('form.addDialForm input.addUrl').dispatchEvent(event);
                subject.query('form.addDialForm input.addUrl').onchange()
                subject.query('form.addDialForm button.submit').click();
              });

          });
      });

      it('renders a new favorite in the list', function () {

      });

      it('renders a new favorite as the last favorite', function () {

      });

      it('renders the "+" button the last element', function () {

      });
    });

    describe('clicking on a delete button of the element', function () {
      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
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
            favoritesInitialDialItems = subject.queryAll(favoritesDialSelector);
            favoritesDialToDelete = favoritesInitialDialItems[0];
            favoritesDeletedTitle = favoritesDialToDelete.querySelector(favoritesDialTitleSelector).textContent;
            favoritesDeletedBtn = favoritesDialToDelete.querySelector(favoritesDeleteBtnSelector);
            favoritesDeletedBtn.click();
            return waitFor(() => (subject.query(undoBoxSelector)));
          });
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
      });

      describe('of the first element', function () {
        it('removes the element', function () {
          chai.expect(favoritesDeletedTitle).to.equal(favoritesResponse[0].custom[0].displayTitle);
        });

        it('does not render any favorites elements', function () {
          chai.expect(subject.queryAll(favoritesDialSelector).length).to.equal(0);
        });

        it('renders only the "+" element', function () {
          chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
        });

        it('renders a popup with undo message', function () {
          chai.expect(subject.query(undoBoxSelector)).to.exist;
        });

        it('still renders the most visited area', function () {
          chai.expect(subject.query(favoritesAreaSelector)).to.exist;
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
                favoritesAfterClickDialItems = subject.queryAll(favoritesDialSelector);
              });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('still does not render any favorites elements', function () {
            chai.expect(favoritesAfterClickDialItems.length).to.equal(0);
          });

          it('still renders the "+" element', function () {
            chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
          });
        });

        describe('then clicking on an undo button of the undo popup', function () {
          const undoPopupUndoBtnSelector = 'div.undo-notification-box button.undo';

          beforeEach(function () {
            subject.query(undoPopupUndoBtnSelector).click();
            return waitFor(() => !(subject.query(undoBoxSelector)))
              .then(function () {
                favoritesAfterClickDialItems = subject.queryAll(favoritesDialSelector);
              });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('renders the previously deleted element', function () {
            let deletedDialExists = false;

            [...favoritesAfterClickDialItems].forEach(function(dial) {
              if (dial.querySelector(favoritesDialTitleSelector).textContent
                      === favoritesDeletedTitle) {
                deletedDialExists = true;
              };
            });
            chai.expect(deletedDialExists).to.equal(true);
          });

          it('still renders the "+" element', function () {
            chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
          });

          it('renders the previously deleted element on correct position', function () {
            chai.expect([...favoritesAfterClickDialItems][0].querySelector(favoritesDialTitleSelector).textContent)
              .to.equal(favoritesDeletedTitle);
          });

          it('sends a "addSpeedDial" message', function () {
            chai.expect(messages.has('addSpeedDial')).to.equal(true);
            chai.expect(messages.get('addSpeedDial').length).to.equal(1);
          });
        });
      });
    });
  });
});
