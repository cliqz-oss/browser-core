/* eslint-disable import/prefer-default-export */
import { styles, PARANJA_STYLES, popupStyles } from './styles';
import subview from './subview';
import { createElement } from './utils';

const DEBUG = false;

function render({
  chrome,
  window,
  onApply,
  onCancel,
  onCopyCode,
  config = {},
}) {
  const modalId = 'cliqz-offer-modal';
  if (window.document.getElementById(modalId)) {
    window.console.warn('an attempt to render popup twice');
    return;
  }

  const paranja = createElement(window, { tag: 'div' });
  paranja.id = modalId;
  Object.assign(paranja.style, PARANJA_STYLES);

  const head = window.document.head;
  const isShadow = head.createShadowRoot || head.attachShadow;

  let popup = null;
  let shadow = null;
  if (isShadow) {
    shadow = paranja.attachShadow({ mode: DEBUG ? 'open' : 'closed' });
    popup = createElement(window, { tag: 'div' });
  } else {
    popup = createElement(window, { tag: 'iframe', id: 'cliqz-offers-iframe' });
    popup.frameBorder = 0;
  }
  Object.assign(popup.style, popupStyles(config));

  const container = subview({
    chrome,
    window,
    config,
    onCancel: (type) => {
      paranja.remove();
      popup.remove();
      onCancel(type);
    },
    onApply: () => {
      paranja.remove();
      popup.remove();
      onApply();
    },
    onCopyCode,
  });

  paranja.addEventListener('click', () => {
    onCancel('outside');
    paranja.remove();
    popup.remove();
  });

  const style = createElement(window, { tag: 'style', textContent: styles(config) });
  window.setTimeout(() => {
    paranja.style.opacity = 1;
    popup.style.opacity = 1;
    if (isShadow) {
      popup.appendChild(container);
      shadow.appendChild(style);
      shadow.appendChild(popup);
    } else {
      popup.contentDocument.body.appendChild(container);
      popup.contentDocument.head.append(style);
    }
  }, 1500);
  window.document.body.appendChild(paranja);
  window.document.body.appendChild(isShadow ? shadow : popup);
}

export { render };
