const params = location.search;
const start = params.indexOf('bg=') + 3;
let end = params.indexOf('&', start);
end = end >= 0 ? end : params.length;
let bg = params.substring(start, end);
function drawBackground() {
  const root = document.body;
  browser.tabs.query({ active: true, currentWindow: true }).then(([{ incognito } = {}]) => {
    if (bg === 'white') {
      root.style.backgroundImage = '';
      root.style.backgroundColor = incognito ? '#0D0F22' : 'white';
      return;
    }
    const color = incognito ? '#0080b1' : '#00AEF0';
    const height = window.screen.availHeight;
    const width = window.screen.availWidth;
    // use max so gradient doesn't change in landscape
    // fixed across android phones: 56dp urlbar + 24dp status bar
    // -1 because of rounding of scale on some phones = 79dp
    const max = (height > width ? height - 79 : width);
    root.style.height = `${max}px`;
    root.style.width = `${max}px`;
    root.style.backgroundImage = `linear-gradient(${color}, #000000)`;
    root.style.overflow = 'hidden';
  });
}
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('resize', () => setTimeout(() => drawBackground(), 100));
  chrome.runtime.onMessage.addListener((message) => {
    if (message.source === 'ANDROID_BROWSER' && message.action === 'changeBrowserTheme') {
      bg = message.args[0] || bg;
      drawBackground();
    }
  });
  drawBackground();
});
