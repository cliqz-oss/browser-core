/* global document */

import chai from 'chai';
import chaiDom from 'chai-dom';

chai.use(chaiDom);

export const expect = chai.expect;
export const clone = o => JSON.parse(JSON.stringify(o));

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
  let resolver;
  let interval;
  const promise = new Promise(function (res) {
    resolver = res;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

export class Subject {
  constructor() {
    this.messages = [];
  }

  load(buildUrl) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = 270;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);

    return new Promise((resolve) => {
      this.iframe.contentWindow.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data);
        this.messages.push(data);
      });
      return waitFor(() => this.messages.length === 1).then(resolve);
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

  pushData(target, data = {}, action = 'pushData') {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: target,
      origin: 'window',
      message: {
        action,
        data,
      }
    }), '*');
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  getComputedStyleOfElement(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }
}
