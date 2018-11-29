export function createElement(window, { tag, className, textContent, id }) {
  const element = window.document.createElement(tag);
  if (className) { element.classList.add(className); }
  if (textContent) { element.textContent = textContent; }
  if (id) { element.id = id; }
  return element;
}

export function once(f) {
  let done = false;
  return function wrapper(...rest) {
    if (!done) {
      done = true;
      f.apply(this, rest);
    }
  };
}
