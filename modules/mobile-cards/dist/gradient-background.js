function drawGradient() {
  const root = document.body;
  browser.tabs.query({ active: true, currentWindow: true }).then(([{ incognito } = {}]) => {
    setTimeout((color) => {
      const height = window.screen.availHeight;
      const width = window.screen.availWidth;
      // use max so gradient doesn't change in landscape
      // fixed across android phones: 56dp urlbar + 24dp status bar
      const max = (height > width ? height - 80 : width);
      root.style.height = `${max}px`;
      root.style.width = `${max}px`;
      root.style.backgroundImage = `linear-gradient(${color}, #000000)`;
      root.style.overflow = 'hidden';
      // root.style.position = 'fixed';
    }, 100, incognito ? '#0080b1' : '#00AEF0');
  });
}
window.addEventListener('load', () => {
  window.addEventListener('resize', drawGradient);
  drawGradient();
});
