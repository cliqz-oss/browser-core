import { getTemplate } from './template';
import { createElement, copySelectedText } from './utils';

export default function subview({ chrome, window, config, onCancel, onApply, onCopyCode }) {
  const container = createElement(window, { tag: 'div', className: 'container' });
  container.innerHTML = getTemplate(chrome, {
    ...config,
    logoText: config.ghostery ? '&nbsp;' : 'MyOffrz',
  });

  ['btn-close', 'btn-cancel'].forEach((cls) => {
    container
      .getElementsByClassName(cls)[0]
      .addEventListener('click', () => {
        onCancel(cls === 'btn-cancel' ? 'cancel' : 'x');
      });
  });

  container
    .getElementsByClassName('btn-apply')[0]
    .addEventListener('click', () => {
      onApply();
    });

  container
    .getElementsByClassName('content')[0]
    .addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

  const codeCopied = chrome.i18n.getMessage('offers_code_copied');
  container
    .getElementsByClassName('copy-code')[0]
    .addEventListener('click', function onClick() {
      const promo = container.getElementsByClassName('promo-code')[0];
      promo.select();
      const success = copySelectedText(window);
      if (success) {
        this.textContent = codeCopied;
        onCopyCode();
      }
    });

  return container;
}
