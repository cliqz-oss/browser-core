import {
  blurUrlBar,
  CliqzUtils,
  expect,
  testsEnabled,
  fillIn,
  mockSearch,
  press,
  waitFor,
  withHistory,
} from '../helpers';
import { results } from '../../../core/integration/fixtures/resultsTwoSimpleWithoutAutocomplete';

export default function () {
  if (!testsEnabled()) { return; }

  describe('generates correct telemetry signals a query without visible dropdown', function () {
    const win = CliqzUtils.getWindow();
    const enterSignalFields = [
      { name: 'current_position', type: 'number', expValue: 0 },
      { name: 'display_time', type: 'object' },
      { name: 'local_source', type: 'string', expValue: '' },
      { name: 'new_tab', type: 'boolean', expValue: true },
      { name: 'position_type', type: 'object', resultLength: 1 },
      { name: 'query_length', type: 'number', expValue: 3 },
      { name: 'reaction_time', type: 'object' },
      { name: 'result_order', type: 'object', resultLength: 0 },
      { name: 'search', type: 'boolean', expValue: false },
      { name: 'v', type: 'number' },
    ];
    let resultSignals;
    let resultSignalCount;
    let urlClicked;

    beforeEach(async function () {
      urlClicked = false;

      blurUrlBar();

      // clear telemetry
      win.allTelemetry = [];

      // mock function to open links in new tab to not do that
      // so we stay on the test page
      // because we hit Enter before dropdown is open,
      // this is not the openLink() function like in other tests
      win.CLIQZ.Core.urlbar._handleCommand = win.CLIQZ.Core.urlbar.handleCommand;
      win.CLIQZ.Core.urlbar.handleCommand = function () {
        urlClicked = true;
      };

      withHistory([]);
      await mockSearch({ results });
      fillIn('qws');
    });

    afterEach(function () {
      win.CLIQZ.Core.urlbar.handleCommand = win.CLIQZ.Core.urlbar._handleCommand;
      delete win.CLIQZ.Core.urlbar._handleCommand;
    });

    xcontext('after pressing Enter and Ctrl keys', function () {
      beforeEach(function () {
        press({ key: 'Enter', ctrlKey: true });
        // check the boolean to make sure the function opening new links
        // has executed and finished
        return waitFor(function () {
          return urlClicked;
        })
          .then(function () {
            resultSignals = win.allTelemetry.filter(function (s) {
              return ((s.type === 'activity') && (s.action === 'result_enter'));
            });
            resultSignalCount = resultSignals.length;
          });
      });

      describe('sends an "activity > result_enter" signal', function () {
        it('only once and with correct amount of fields', function () {
          expect(resultSignalCount).to.equal(1);
          resultSignals.forEach(function (signal) {
            // add 2 to length for 'activity' and 'result_enter'
            expect(Object.keys(signal).length).to.equal(enterSignalFields.length + 2);
          });
        });

        enterSignalFields.forEach(function (field) {
          it(`with an existing "${field.name}" field containing correct value(s)`, function () {
            resultSignals.forEach(function (signal) {
              expect(resultSignalCount).to.be.above(0);
              // the following assertion cannot properly assert null fields
              // expect(signal[field.name]).to.exist;
              // the workaround is to check properties of the object
              expect(Object.hasOwnProperty.call(signal, field.name)).to.be.true;
              expect(typeof signal[field.name]).to.equal(field.type);

              if (field.expValue !== undefined) {
                expect(signal[field.name]).to.equal(field.expValue);
              }

              if (field.resultLength !== undefined) {
                expect(signal[field.name].length).to.equal(field.resultLength);
              }
            });
          });
        });
      });
    });
  });
}
