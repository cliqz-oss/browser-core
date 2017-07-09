import templates from '../templates';

const openLink = (url) => {
  postMessage({
    target: 'cliqz',
    action: 'openLink',
    args: [url],
  }, '*');
};

const actions = {
  render({ results, currentUrl }) {
    const resultsHtml = templates.results({
      results,
    });
    document.querySelector('#container').innerHTML = resultsHtml;
    const currentAnchor = [...document.querySelectorAll('a')].find(a => a.getAttribute('href') === currentUrl);
    if (currentAnchor) {
      currentAnchor.classList.add('selected');
    }

    [...document.querySelectorAll('a')].forEach((a) => {
      a.addEventListener('click', (ev) => {
        const url = ev.target.getAttribute('href');
        [...document.querySelectorAll('a')].forEach((anchor) => {
          anchor.classList.remove('selected');
        });
        ev.target.classList.add('selected');
        ev.preventDefault();
        ev.stopPropagation();
        openLink(url);
        return false;
      });
    });
  }
};

document.body.innerHTML = templates.container();

window.addEventListener('message', (ev) => {
  if (ev.data.target !== 'cliqz') {
    actions[ev.data.action](...ev.data.args);
  }
});
