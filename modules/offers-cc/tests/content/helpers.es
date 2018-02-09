export function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let intervals = [];
export function registerInterval(interval) {
  intervals.push(interval);
}

export function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
}

export function waitFor(fn) {
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

export function offersHubFrameTests(subject) {
  context('renders offers hub header and footer elements', function () {
    it('renders hub title', function () {
      const titleSelector = 'header [data-i18n="offers-hub-title"';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('offers-hub-title');
    });

    it('renders close button', function () {
      const buttonSelector = 'header .cqz-close-hub';
      chai.expect(subject.query(buttonSelector)).to.exist;
    });

    it('renders "more information"', function () {
      const moreInfoSelector = 'footer .cqz-power-by';
      chai.expect(subject.query(moreInfoSelector)).to.exist;
      chai.expect(subject.query(moreInfoSelector).textContent.trim()).to.equal('offers-hub-about-cliqz-offers');
    });

    it('link is correct', function () {
      const moreInfoSelector = 'footer .cqz-power-by';
      chai.expect(subject.query(moreInfoSelector).hasAttribute('data-open-url')).to.be.true;
      chai.expect(subject.query(moreInfoSelector).getAttribute('data-open-url')).to.equal('https://cliqz.com/myoffrz');
    });

    it('renders "powered by Cliqz"', function () {
      const poweredBySelector = 'footer .powered-by [data-i18n="offers-hub-powered-by"]';
      chai.expect(subject.query(poweredBySelector)).to.exist;
      chai.expect(subject.query(poweredBySelector).textContent.trim()).to.equal('offers-hub-powered-by');
    });
  });
};

export class Subject {
  constructor() {
    this.messages = [];
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/offers-cc/index.html';
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
      target: 'cliqz-offers-cc',
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
