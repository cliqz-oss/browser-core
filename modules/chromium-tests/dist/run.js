/* global Mocha */
/* global window */
/* global reset */
/* global clearIntervals */


window.onload = () => {
  let tabId;
  beforeEach(() => {
    return new Promise((resolve) => {
      chrome.tabs.query(
        {
          active: true,
          lastFocusedWindow: true
        },
        (tabs) => { tabId = tabs[0].id; resolve(); },
      );
    });
  });

  afterEach(() => {
    clearIntervals();
    return new Promise((resolve) => {
      chrome.tabs.query(
        {},
        (tabs) => {
          chrome.tabs.remove(
            tabs.map(tab => tab.id).filter(id => id !== tabId), resolve
          );
        }
      );
    }).then(() => reset());
  });

  const runner = mocha.run();

  // Output report on stdout
  runner.on('end', () => {
    // console.error(`RESULTS ${window.btoa(JSON.stringify({ report: XMLReport.join('') }))} RESULTS`);
  });
};
