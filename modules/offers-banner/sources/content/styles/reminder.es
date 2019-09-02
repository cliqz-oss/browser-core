const HIDE_POSITION = 16;
const OPEN_POSITION = 346;

export function wrapper({ isHidden = true }) {
  const right = isHidden ? HIDE_POSITION : OPEN_POSITION;
  return {
    position: 'fixed',
    top: '60px',
    right: `${right}px`,
    'z-index': '2147483647',
    opacity: '0',
    width: '10px',
    height: '10px',
  };
}

export function banner() {
  return {
    position: 'relative',
    'z-index': '2147483647',
    transition: 'opacity 200ms ease-in',
    opacity: '0',
  };
}

export function animate(node, {
  animation = false,
  first = HIDE_POSITION,
  last = OPEN_POSITION,
  duration = 450,
} = {}) {
  if (!animation) { return; }
  if (!node.animate) { // e.g. ms-edge
    /* eslint-disable-next-line no-param-reassign */
    node.style.right = `${last}px`;
    return;
  }
  const nodeAnimation = node.animate([
    { right: `${first}px` },
    { right: `${last}px` },
  ], {
    duration,
    easing: 'ease-out',
  });
  nodeAnimation.onfinish = () => {
    /* eslint-disable-next-line no-param-reassign */
    node.style.right = `${last}px`;
  };
}
