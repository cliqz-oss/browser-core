window.postMessage(JSON.stringify({
  target: 'cliqz',
  module: 'core',
  action: 'setUrlbar',
  args: ['']
}), '*');
