/* global window */

import React from 'react';
import ReactDOM from 'react-dom';
import App from '../core/app';
import Serp from './serp/components/index';


const CLIQZ = {};

CLIQZ.app = new App({});

window.CLIQZ = CLIQZ;
(async function start() {
  await CLIQZ.app.start();
  await CLIQZ.app.modules.core.getWindowLoadingPromise(window);

  ReactDOM.render(
    React.createElement(Serp, {}, null),
    document.getElementById('root')
  );
}());
