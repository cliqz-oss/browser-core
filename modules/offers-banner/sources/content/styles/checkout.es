export function wrapper({ fullscreen = false } = {}) {
  const fullscreenPart = { top: '0px', right: '0px', opacity: '1' };
  return {
    position: 'fixed',
    top: '60px',
    right: '346px',
    'z-index': '2147483647',
    opacity: '0',
    ...(fullscreen ? fullscreenPart : {})
  };
}

export function banner({ fullscreen = false } = {}) {
  const fullscreenPart = {
    top: '0px',
    bottom: '0px',
    right: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    border: 'none',
    margin: '0px',
    padding: '0px',
    overflow: 'hidden',
  };
  const normalPart = {
    top: 'unset',
    bottom: 'unset',
    right: 'unset',
    left: 'unset',
    margin: 'unset',
  };
  return {
    position: 'fixed',
    'z-index': '2147483647',
    transition: 'opacity 200ms ease-in',
    opacity: '0',
    ...(fullscreen ? fullscreenPart : normalPart)
  };
}

export function animate() { }
