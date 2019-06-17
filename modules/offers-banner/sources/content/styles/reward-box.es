export function wrapper() {
  return {
    position: 'fixed',
    top: '20px',
    right: '311px',
    'z-index': '2147483647',
    opacity: '0',
  };
}

export function banner() {
  return {
    position: 'fixed',
    'z-index': '2147483647',
    transition: 'opacity 200ms ease-in',
    opacity: '0',
    'box-shadow': 'rgba(0, 0, 0, 0.19) 3px 2px 13px 2px',
    'border-radius': '8px',
    background: '#f2f2f2'
  };
}
