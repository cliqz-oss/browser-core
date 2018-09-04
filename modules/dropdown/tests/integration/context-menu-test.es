/* global sinon */

import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  getWindowModule,
  mockSearch,
  testsEnabled,
  press,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

function openContextMenu() {
  getWindowModule().ui.renderer.contextMenu.show(
    getWindowModule().ui.renderer.selectedResult,
    0,
    0
  );
}

function clickOn(option) {
  return waitFor(() => {
    openContextMenu();
    win.document.querySelector(`#dropdownContextMenu [label="${option}"]`).click();
    return true;
  });
}

export default function () {
  if (!testsEnabled()) { return; }
  context('dropdown context menu', function () {
    let sandbox;
    let spy;
    let spyCopyURL;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      spy = sandbox.spy();
      spyCopyURL = sandbox.spy();
      sandbox.stub(win.CliqzUtils, 'openLink').value(spy);
      sandbox.stub(getWindowModule().ui.renderer.contextMenu, 'copyURL').value(spyCopyURL);
    });

    afterEach(function () {
      // close context menu
      press({ key: 'Escape' });
      sandbox.restore();
    });

    context('for supplementary-search result', function () {
      const query = 'test';
      let expectedUrl;

      beforeEach(async function () {
        const engine = win.CLIQZ.TestHelpers.searchEngines.getDefaultSearchEngine();
        expectedUrl = engine.getSubmissionForQuery(query);
        blurUrlBar();
        withHistory([]);
        await mockSearch({});
        fillIn(query);
        await waitForPopup(1);
        await waitFor(() => $cliqzResults.querySelector('.result.search'));
      });

      context('click on "Open in a New Tab"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Tab');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            expectedUrl,
            true,
            false,
            false
          ))
        );
      });

      context('click on "Open in a New Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Window');
        });

        it('correct url was opened in a new window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            expectedUrl,
            false,
            true,
            false
          ))
        );
      });

      context('click on "Open in a New Private Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Private Window');
        });

        it('correct url was opened in a new private window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            expectedUrl,
            false,
            false,
            true
          ))
        );
      });

      context('click on "Copy link location"', function () {
        beforeEach(function () {
          return clickOn('Copy link location');
        });

        it('url was copied', () =>
          waitFor(() => expect(spyCopyURL).to.have.been.calledWith(expectedUrl))
        );
      });

      context('click on "Feedback for Cliqz"', function () {
        beforeEach(function () {
          return clickOn('Feedback for Cliqz');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            'https://cliqz.com/feedback/?kind=custom-search',
            true
          ))
        );
      });
    });

    context('for history result', function () {
      const historyUrl = 'https://history-test.com';

      beforeEach(async function () {
        blurUrlBar();
        withHistory([{ value: historyUrl }]);
        await mockSearch({});
        fillIn('test');
        await waitForPopup(3);
        press({ key: 'ArrowDown' });
        await waitFor(() => $cliqzResults.querySelector(`.history .result[data-url="${historyUrl}"]`)
          .classList.contains('selected'));
      });

      context('click on "Open in a New Tab"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Tab');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            historyUrl,
            true,
            false,
            false
          ))
        );
      });

      context('click on "Open in a New Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Window');
        });

        it('correct url was opened in a new window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            historyUrl,
            false,
            true,
            false
          ))
        );
      });

      context('click on "Open in a New Private Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Private Window');
        });

        it('correct url was opened in a new private window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            historyUrl,
            false,
            false,
            true
          ))
        );
      });

      context('click on "Copy link location"', function () {
        beforeEach(function () {
          return clickOn('Copy link location');
        });

        it('url was copied', () =>
          waitFor(() => expect(spyCopyURL).to.have.been.calledWith(historyUrl))
        );
      });

      context('click on "Feedback for Cliqz"', function () {
        beforeEach(function () {
          return clickOn('Feedback for Cliqz');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            'https://cliqz.com/feedback/?kind=H',
            true
          ))
        );
      });
    });

    context('for history cluster result', function () {
      const historyUrl1 = 'https://test.com/history1';
      const historyUrl2 = 'https://test.com/history2';
      const mainClusterUrl = 'https://test.com/';

      beforeEach(async function () {
        blurUrlBar();
        withHistory([
          { value: historyUrl1 },
          { value: historyUrl2 }
        ]);
        await mockSearch({});
        fillIn('test ');
        await waitForPopup(3);
        press({ key: 'ArrowDown' });
        await waitFor(() => $cliqzResults.querySelector(`.history .result[data-url="${mainClusterUrl}"]`)
          .classList.contains('selected'));
      });

      context('click on "Open in a New Tab"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Tab');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            mainClusterUrl,
            true,
            false,
            false
          ))
        );
      });

      context('click on "Open in a New Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Window');
        });

        it('correct url was opened in a new window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            mainClusterUrl,
            false,
            true,
            false
          ))
        );
      });

      context('click on "Open in a New Private Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Private Window');
        });

        it('correct url was opened in a new private window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            mainClusterUrl,
            false,
            false,
            true
          ))
        );
      });

      context('click on "Copy link location"', function () {
        beforeEach(function () {
          return clickOn('Copy link location');
        });

        it('url was copied', () =>
          waitFor(() => expect(spyCopyURL).to.have.been.calledWith(mainClusterUrl))
        );
      });

      context('click on "Feedback for Cliqz"', function () {
        beforeEach(function () {
          return clickOn('Feedback for Cliqz');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            'https://cliqz.com/feedback/?kind=C',
            true
          ))
        );
      });
    });

    context('for backend result', function () {
      const backendUrl = 'https://backend-test.com';
      beforeEach(async function () {
        blurUrlBar();
        withHistory([]);
        await mockSearch({ results: [{ url: backendUrl }] });
        fillIn('test');
        await waitForPopup(2);
        press({ key: 'ArrowDown' });
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${backendUrl}"]`)
          .classList.contains('selected'));
      });

      context('click on "Open in a New Tab"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Tab');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            backendUrl,
            true,
            false,
            false
          ))
        );
      });

      context('click on "Open in a New Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Window');
        });

        it('correct url was opened in a new window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            backendUrl,
            false,
            true,
            false
          ))
        );
      });

      context('click on "Open in a New Private Window"', function () {
        beforeEach(function () {
          return clickOn('Open Link in New Private Window');
        });

        it('correct url was opened in a new private window', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            backendUrl,
            false,
            false,
            true
          ))
        );
      });

      context('click on "Copy link location"', function () {
        beforeEach(function () {
          return clickOn('Copy link location');
        });

        it('url was copied', () =>
          waitFor(() => expect(spyCopyURL).to.have.been.calledWith(backendUrl))
        );
      });

      context('click on "Feedback for Cliqz"', function () {
        beforeEach(function () {
          return clickOn('Feedback for Cliqz');
        });

        it('correct url was opened in a new tab', () =>
          waitFor(() => expect(spy).to.have.been.calledWith(
            sinon.match.instanceOf(win.constructor),
            'https://cliqz.com/feedback/?kind=',
            true
          ))
        );
      });
    });
  });
}
