import draw from './content/control-center';

window.__globals_draw = draw;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.location.hash) { return; }
  const product = document.location.hash.slice(1);
  document.body.classList.add(product);
}, { once: true });
