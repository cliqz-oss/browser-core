/* global document, localStorage */
// eslint-disable-next-line
'use strict';

const KEY_EVENTS_RECORDER = {
  text: '',
  start() {
    document.addEventListener('keydown', this.onKeydown, { passive: true });
    document.addEventListener('paste', this.onPaste, { passive: true });
  },
  stop() {
    document.removeEventListener('keydown', this.onKeydown, { passive: true });
    document.removeEventListener('paste', this.onPaste, { passive: true });
  },
  onKeydown(ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.key.length > 1) {
      return;
    }
    KEY_EVENTS_RECORDER.text += ev.key;
  },
  onPaste(ev) {
    KEY_EVENTS_RECORDER.text += ev.clipboardData.getData('text');
  }
};

(function setup() {
  KEY_EVENTS_RECORDER.start();

  const theme = localStorage.theme;
  if (theme) {
    document.body.classList.add(['theme-', theme].join(''));
  }
}());
