import { createElement } from './utils';
import Handler from './handler';
import * as styles from './styles';
import { beforeIframeShown } from './sites-specific';

const AUTO_HIDE_TIMEOUT = 20 * 60 * 1000;
const DEBUG = false;

export default function render(chrome, window, payload, onAction, config) {
  const bannerId = 'cliqz-offers-banner';
  if (window.document.getElementById(bannerId)) {
    window.console.warn('an attempt to render panel twice');
    return;
  }
  const wrapper = createElement(window, { tag: 'div', id: bannerId });
  const iframe = createElement(window, { tag: 'iframe' });
  Object.assign(wrapper.style, styles.wrapper());
  Object.assign(iframe.style, styles.panel(config));

  iframe.src = config.url;
  iframe.frameBorder = 0;
  wrapper.appendChild(iframe);

  const head = window.document.head;
  const isShadow = head.createShadowRoot || head.attachShadow;
  let shadowRoot = null;
  if (isShadow) {
    shadowRoot = createElement(window, { tag: 'span', id: bannerId });
    const shadow = shadowRoot.attachShadow({ mode: DEBUG ? 'open' : 'closed' });
    shadow.appendChild(wrapper);
    window.document.body.appendChild(shadowRoot);
  } else {
    wrapper.setAttribute('id', bannerId);
    window.document.body.appendChild(wrapper);
  }

  const handler = new Handler({
    window,
    wrapper: isShadow ? shadowRoot : wrapper,
    iframe,
    onAction
  });
  handler.init();
  window.document.addEventListener('visibilitychange', () => {
    const node = window.document.getElementById(bannerId);
    const isVisible = window.document.visibilityState === 'visible';
    if (node && isVisible) {
      onAction({ handler: 'offerShown', data: {} });
    }
  });

  window.setTimeout(() => {
    beforeIframeShown(window);
    wrapper.style.opacity = 1;
    iframe.style.opacity = 1;
    handler.sendToIframe(payload);
    onAction({ handler: 'offerShown', data: {} });
    onAction({ handler: 'offersFirstAppearance', data: {} });
  }, 2000);

  window.setTimeout(() => {
    if (window.document.getElementById(bannerId)) {
      handler.removeFromWindow();
    }
  }, AUTO_HIDE_TIMEOUT);
}
