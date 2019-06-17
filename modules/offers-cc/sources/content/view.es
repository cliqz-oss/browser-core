import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import Lodge from './Lodge';
import Tooltip from './Tooltip';
import TooltipExtra from './TooltipExtra';
import { resize } from './common/utils';

const ALLOWED_POPUPS_TYPES = ['card', 'lodgev1', 'lodgev2'];

export default function draw(data) {
  const {
    showTooltip = false,
    isGeneric = false,
    popupsType = 'card',
  } = data;
  const allowedPopupsType = ALLOWED_POPUPS_TYPES.find(t => t === popupsType) || 'card';
  const newData = { ...data, popupsType: allowedPopupsType };
  const tooltip = isGeneric ? Tooltip : TooltipExtra;
  const element = {
    card: Main,
    lodgev1: Lodge,
    lodgev2: Lodge,
  }[allowedPopupsType];

  ReactDOM.render(
    React.createElement(showTooltip ? tooltip : element, { data: newData }, null),
    document.getElementById('cliqz-offers-cc')
  );
  resize({ type: showTooltip ? 'tooltip' : allowedPopupsType });
}
