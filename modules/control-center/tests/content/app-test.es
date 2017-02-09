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
}

describe("Control Center App", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it("loads", function () {
    chai.expect(true).to.eql(true);
  })

  context("antitracking", function () {

    context("security off", function () {
      beforeEach(() => {
        return subject.pushData();
      });

      it("does not render antitracking box", function () {
        chai.expect(subject.query('#anti-tracking')).to.be.null;
      });
    });

    context("with security on", function () {
      context("with antitracking on", function() {
        beforeEach(() => {
          return subject.pushData({
            securityON: true,
            onboarding: false,
            generalState: "active",
            module: {
              antitracking: {
                visible: true,
                totalCount: 11,
                enabled: true,
                isWhitelisted: false,
                state: "active"
              }
            }
          })
        })

        it("renders antitracking box", function () {
          chai.expect(subject.query('#anti-tracking')).to.not.be.null;
        });

        describe("click on antitracking on", function () {
          it("sends message to update general state", function () {
            subject.query('.antitracking .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "updateState")
            ).then(
              message => chai.expect(message).to.have.deep.property("message.data", "inactive")
            );
          });

          it("sends message to deactivate antitracking", function () {
            subject.query('.antitracking .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "antitracking-activator")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.state", "inactive");
                chai.expect(message).to.have.deep.property("message.data.status", "inactive");
              }
            );
          });
        });
      });

      context("with antitracking off", function() {
        beforeEach(() => {
          return subject.pushData({
            securityON: true,
            onboarding: false,
            generalState: "active",
            module: {
              antitracking: {
                visible: true,
                totalCount: 11,
                enabled: true,
                isWhitelisted: false,
                state: "inactive"
              }
            }
          })
        })

        it("renders antitracking box", function () {
          chai.expect(subject.query('#anti-tracking')).to.not.be.null;
        });

        describe("click on antitracking off", function () {
          it("sends message to update general state", function () {
            subject.query('.antitracking .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "updateState")
            ).then(
              message => chai.expect(message).to.have.deep.property("message.data", "active")
            );
          });

          it("sends message to activate antitracking", function () {
            subject.query('.antitracking .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "antitracking-activator")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.state", "active");
                chai.expect(message).to.have.deep.property("message.data.status", "active");
              }
            );
          });
        });
      });

    });
  });

  context("adblocking", function() {
    context("security off", function () {
      beforeEach(() => {
        return subject.pushData();
      });

      it("does not render adblocking box", function () {
        chai.expect(subject.query('#ad-blocking')).to.be.null;
      });
    });

    context("with security on and antitracking off", function () {
      context("with adblocking", function() {
        beforeEach(() => {
          return subject.pushData({
            securityON: true,
            onboarding: false,
            generalState: "active",
            module: {
              antitracking: {
                state: 'active'
              },
              adblocker: {
                "visible": true,
                "enabled": true,
                "optimized": false,
                "disabledForUrl": false,
                "disabledForDomain": false,
                "disabledEverywhere": false,
                "totalCount": 2,
                "advertisersList": {
                    "companiesArray": [{
                        "name": "First Party",
                        "count": 1
                    }, {
                        "name": "Other",
                        "count": 1
                    }]
                },
                "state": "active",
                "off_state": "off_website"
              }
            }
          })
        });

        it("renders adblocking box", function () {
          chai.expect(subject.query('#ad-blocking')).to.not.be.null;
        });

        describe("click on adblocking on", function () {
          it("sends message to update general state", function () {
            subject.query('.adblocker .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "updateState")
            ).then(
              message => chai.expect(message).to.have.deep.property("message.data", "active")
            );
          });

          it("sends message to deactivate adblocking", function () {
            subject.query('.adblocker .cqz-switch-box').click();

            return waitFor(
              () => subject.messages.find(message => message.message.action === "adb-activator")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.state", "off");
                chai.expect(message).to.have.deep.property("message.data.status", "off");
              }
            );
          });
        });
      });

    });

  });
});
