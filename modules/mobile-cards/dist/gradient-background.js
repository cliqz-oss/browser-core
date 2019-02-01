function drawGradient() {
  const root = document.body;
  browser.tabs.query({ active: true, currentWindow: true }).then(([{ incognito } = {}]) => {
    const color = incognito ? '#0080b1' : '#00AEF0';
    const height = window.screen.availHeight;
    const width = window.screen.availWidth;
    // use max so gradient doesn't change in landscape
    // fixed across android phones: 56dp urlbar + 24dp status bar
    // +1 because of rounding of scale on some phones = 81dp
    const max = (height > width ? height - 81 : width);
    root.style.height = `${max}px`;
    root.style.width = `${max}px`;
    root.style.backgroundImage = `linear-gradient(${color}, #000000)`;
    root.style.overflow = 'hidden';
  });
}
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('resize', () => setTimeout(() => drawGradient(), 100));
  drawGradient();
});
