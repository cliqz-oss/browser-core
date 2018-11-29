import { createElement } from './utils';
import Handler from './handler';
import * as styles from './styles/index';
import { beforeIframeShown } from './sites-specific';

const AUTO_HIDE_TIMEOUT = 20 * 60 * 1000;
const DEBUG = false;
const WAIT_BEFORE_SHOWING = 500;

/*
  payload -- can be object or pair of objects [payload.isPair = true]
  Payload will be pair when data for realEstate are strongly connected
  e.g `tooltip` and `popup` -> user clicks on `tooltip` and gets `popup`
*/
export default function render(chrome, window, payload, onAction, config) {
  const bannerId = 'cliqz-offers-banner';
  const isRewardBox = config.type === 'offers-cc';
  if (window.document.getElementById(bannerId)) {
    window.console.warn('an attempt to render banner twice');
    return;
  }
  const wrapper = createElement(window, { tag: 'div' });
  const iframe = createElement(window, { tag: 'iframe' });
  Object.assign(wrapper.style, styles.wrapper(isRewardBox));
  Object.assign(iframe.style, styles.banner(isRewardBox, config));

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
    onAction,
    isRewardBox,
    onHideTooltipData: isRewardBox && payload.isPair ? payload.popup : null,
    config,
    initialPayload: isRewardBox && payload.isPair ? payload.tooltip : payload,
    onIframeLoad: () => {
      setTimeout(() => {
        if (!isRewardBox) { beforeIframeShown(window); }
        wrapper.style.opacity = 1;
        iframe.style.opacity = 1;
        if (!isRewardBox) {
          onAction({ handler: 'offerShown', data: {} });
          onAction({ handler: 'offersFirstAppearance', data: {} });
        }
      }, config.waitBeforeShowing || WAIT_BEFORE_SHOWING);
    },
  });
  handler.init();
  iframe.src = config.url;

  window.document.addEventListener('visibilitychange', () => {
    const node = window.document.getElementById(bannerId);
    const isVisible = window.document.visibilityState === 'visible';
    if (node && isVisible && !isRewardBox) {
      onAction({ handler: 'offerShown', data: {} });
    }
  });
  window.document.addEventListener('scroll', () => {
    const node = window.document.getElementById(bannerId);
    const scrollY = window.pageYOffset;
    const partOfBannersHeight = 100; // 70 percent of banner's height
    if (node && !isRewardBox && scrollY > partOfBannersHeight) {
      handler.removeFromWindow();
    }
  });

  window.setTimeout(() => {
    if (window.document.getElementById(bannerId)) {
      handler.removeFromWindow();
    }
  }, AUTO_HIDE_TIMEOUT);
}
