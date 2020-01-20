import draw from './content/view';

window.__globals_draw = draw;

function addBodyClassFromHash() {
  if (document.location.hash) {
    // hash is defined in manifest.json
    // expect format `#${PRODUCT_PREFIX}`
    const brand = document.location.hash.slice(1);
    document.body.classList.add(brand);
  }
}

document.addEventListener('DOMContentLoaded', addBodyClassFromHash, { once: true });
