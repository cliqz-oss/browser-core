import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import Tooltip from './Tooltip';
import TooltipExtra from './TooltipExtra';
import { resize } from './common/utils';

const ALLOWED_POPUPS_IMAGES = ['with-image', 'with-no-image'];
const ALLOWED_POPUPS_COPY_CODES = ['current', 'one-step', 'two-step'];

export default function draw(data) {
  const {
    showTooltip = false,
    isGeneric = false,
    popupsImage = 'with-image',
    popupsCopyCode = 'current',
  } = data;
  const allowedPopupsImage = ALLOWED_POPUPS_IMAGES
    .find(image => image === popupsImage) || 'with-image';
  const allowedPopupsCopyCode = ALLOWED_POPUPS_COPY_CODES
    .find(code => code === popupsCopyCode) || 'current';

  const newData = {
    ...data,
    abtestInfo: {
      popupsImage: allowedPopupsImage,
      popupsCopyCode: allowedPopupsCopyCode,
    },
  };
  const tooltip = isGeneric ? Tooltip : TooltipExtra;

  ReactDOM.render(
    React.createElement(showTooltip ? tooltip : Main, { data: newData }, null),
    document.getElementById('cliqz-offers-cc'),
    () => resize({ type: showTooltip ? 'tooltip' : 'card' })
  );
}
