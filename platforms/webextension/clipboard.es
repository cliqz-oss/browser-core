import { window } from './globals';

export function copyToClipboard(val) {
  const input = window.document.createElement('input');
  input.value = val;
  window.document.body.appendChild(input);
  input.select();
  window.document.execCommand('copy');
  window.document.body.removeChild(input);
}

export default copyToClipboard;
