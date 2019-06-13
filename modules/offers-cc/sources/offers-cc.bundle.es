/* global window, document, $ */
import React from 'react';
import ReactDOM from 'react-dom';
import Main from './content/Main';
import Tooltip from './content/Tooltip';
import TooltipExtra from './content/TooltipExtra';
import { resize } from './content/common/utils';
import send from './content/transport';

function draw(data) {
  const { showTooltip = false, isGeneric = false } = data;
  const tooltip = isGeneric ? Tooltip : TooltipExtra;
  ReactDOM.render(
    React.createElement(showTooltip ? tooltip : Main, { data }, null),
    document.getElementById('cliqz-offers-cc')
  );
  resize({ tooltip: showTooltip });
}

// ====== ON LOAD ====== //
$(() => send('getEmptyFrameAndData'));

window.addEventListener('message', (ev) => {
  const { target = '', origin = '', message = {} } = JSON.parse(ev.data);
  if (target !== 'cliqz-offers-cc' || origin !== 'window') { return; }
  const { action = '', data = {} } = message;
  if (action === 'pushData') { draw(data); }
});
