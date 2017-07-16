import templates from '../templates';

const close = () => {
  postMessage({
    target: 'cliqz',
    action: 'close',
    args: [],
  }, '*');
};

const openLink = (url) => {
  postMessage({
    target: 'cliqz',
    action: 'openLink',
    args: [url],
  }, '*');
};

const seletctCurrentUrl = (url) => {
  const currentAnchor = [...document.querySelectorAll('a')].find(a => a.getAttribute('href') === url);
  if (currentAnchor) {
    currentAnchor.classList.add('selected');
  }
};

const handleUrlClick = (ev) => {
  const url = ev.target.getAttribute('href');
  ev.preventDefault();
  ev.stopPropagation();
  openLink(url);
};

const actions = {
  render({ results, currentUrl, serpUrl }) {
    const resultsHtml = templates.results({
      serpUrl,
      results,
    });

    document.querySelector('#container').innerHTML = resultsHtml;

    document.querySelector('#close').addEventListener('click', close);

    document.querySelector('#back').addEventListener('click', (ev) => {
      handleUrlClick(ev);
      close();
    });

    seletctCurrentUrl(currentUrl);

    [...document.querySelectorAll('ul a')].forEach((a) => {
      a.addEventListener('click', (ev) => {
        [...document.querySelectorAll('ul a')].forEach((anchor) => {
          anchor.classList.remove('selected');
        });
        ev.target.classList.add('selected');
        handleUrlClick(ev);
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
