export function wrapper() {
  return {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '115px',
    'z-index': '2147483647',
    opacity: '0',
    margin: '0',
    padding: '0',
  };
}

export function banner({ blueTheme = true }) {
  return {
    width: '100%',
    height: '100%',
    transition: 'all 200ms ease-in',
    opacity: '0',
    background: blueTheme ? '#00AEF0' : '#cccccc',
    'box-shadow': 'inset rgba(0, 0, 0, 0.19) 0px 2px 4px 2px',
  };
}
