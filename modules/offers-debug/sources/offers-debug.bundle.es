/* global CLIQZ, document, SigWrapper, ChromeUtils,
          DataStorageHandler, EnvConfigHandler, ErrorReporter, clearInnerElement,
          SignalsTestCase, TEST_DATA, $ */

import OffersConfigs from '../offers-v2/offers_configs';
import ActionID from '../offers-v2/offers/actions-defs';
import prefs from '../core/prefs';
import console from '../core/console';
import Storage from '../core/storage';

ChromeUtils.import('chrome://cliqzmodules/content/CLIQZ.jsm');

const Offers = CLIQZ.app.modules['offers-v2'].background;
const localStorage = new Storage('chrome://cliqz/content/offers-debug/offers-debug.json');

// todo create a class for this where we will wrap some of the signals
// and we can register to get signals in here

const sigHandler = Offers.signalsHandler;
const sigWrapper = new SigWrapper(sigHandler);
const dsh = new DataStorageHandler(localStorage);
const envConfig = new EnvConfigHandler('config_values', OffersConfigs, prefs);
const errReporter = new ErrorReporter({
  txt_name: 'error_report_txt',
  status_name: 'err_status'
});

const globalObjects = {
  signalWrapper: sigWrapper,
  envConfig,
  errReporter
};

class TestManager {
  constructor(gObjs, testData) {
    this.gObjs = gObjs;
    this.testData = testData;
    this.currentTestGroup = null;
    this.currentTestCase = null;
    this.tgMap = {};
    this.tcMap = {};

    this._buildMaps();
  }

  getData() {
    if (this.currentTestCase) {
      this.tcMap[this.currentTestCase.id] = this.currentTestCase.getState();
    }
    return this.testData;
  }

  destroy() {
    if (this.currentTestCase) {
      this.currentTestCase = null;
    }
    if (this.currentTestGroup) {
      this.currentTestGroup = null;
    }
  }

  selectTestCase(id) {
    if (this.currentTestCase) {
      const tcbtn = document.getElementById(this.currentTestCase.id);
      if (tcbtn) {
        tcbtn.style = '';
      }
      // get the state and store it again
      // for now we are using the same state reference so it should work
      this.tcMap[this.currentTestCase.id] = this.currentTestCase.getState();
      this.currentTestCase.setTestActive(false);
      this.currentTestCase.destroy();
      this.currentTestCase = null;
    }

    const tcHtmlElement = document.getElementById('test_case');
    clearInnerElement(tcHtmlElement);
    const tcState = this.tcMap[id];
    if (!tcState) {
      console.log(`Error, no test case with id ${id}`);
      return;
    }

    // create a new test case handler and use it
    const self = this;
    const cbMap = {
      status_change(testCaseID, status) {
        self.loadAndRenderTestGroupsButtons();
        self.loadAndRenderCurrentTestGroupButtons();
        console.log('test case changed status: ', status);
        // TODO: implement color button changes here
      }
    };
    this.currentTestCase = new SignalsTestCase(tcState, cbMap, globalObjects, 'test_case', ActionID);
    this.currentTestCase.id = id;
    this.currentTestCase.setTestActive(true);
    this.currentTestCase.renderUI();
  }

  loadAndRenderCurrentTestGroupButtons() {
    if (!this.currentTestGroup) {
      return;
    }

    const buttons = document.getElementById('test_cases');
    clearInnerElement(buttons);
    this.currentTestGroup.cases.forEach((tc) => {
      console.log('tc: ', tc.name);
      const tcbtn = document.createElement('input');
      tcbtn.type = 'submit';
      tcbtn.value = tc.name;
      tcbtn.id = tc.id;
      // tcbtn.classList.add(tc.status);
      tcbtn.className += tc.status;
      buttons.appendChild(tcbtn);
      document.getElementById(tc.id).addEventListener('click', () => {
        this.onTestCaseButtonPressed(tc.id);
        tcbtn.style = 'background-color: yellow;';
      });
    });
  }

  loadAndRenderTestGroupsButtons() {
    function getTestCasesCommonStatus(tg) {
      const counters = { success: 0, pending: 0, failed: 0 };
      tg.cases.forEach((tc) => {
        if (counters.failed > 0) { return; }
        counters[tc.status] += 1;
      });
      if (counters.failed > 0) { return 'failed'; }
      if (counters.pending) { return 'pending'; }
      return 'success';
    }

    const buttons = document.getElementById('test_groups');
    clearInnerElement(buttons);
    this.testData.test_groups.forEach((tg) => {
      const status = getTestCasesCommonStatus(tg);
      // <input type='submit' value='gen sig' id='gen_sig_btn' style='background-color: red'>
      console.log('tg: ', tg.name);
      const tgbtn = document.createElement('input');
      tgbtn.type = 'submit';
      tgbtn.value = tg.name;
      tgbtn.id = tg.name;
      tgbtn.className += status;
      buttons.appendChild(tgbtn);

      document.getElementById(tg.name).addEventListener('click', () => {
        this.onTestGroupButtonPressed(tg.name);
        tgbtn.style = 'background-color: yellow;';
      });
    });
  }

  onTestCaseButtonPressed(id) {
    if (this.currentTestCase && (this.currentTestCase.id === id)) {
      return;
    }
    this.selectTestCase(id);
  }

  onTestGroupButtonPressed(id) {
    if (this.currentTestGroup && (this.currentTestGroup.name === id)) {
      return;
    }
    if (this.currentTestGroup) {
      const tgbtn = document.getElementById(this.currentTestGroup.name);
      if (tgbtn) {
        tgbtn.style = '';
      }
    }
    this.currentTestGroup = this.tgMap[id];
    if (!this.currentTestGroup) {
      console.log(`error: tg with id ${id} not found?`);
      return;
    }
    // we now select the group and render it
    this.loadAndRenderCurrentTestGroupButtons();
  }

  _buildMaps() {
    this.testData.test_groups.forEach((tg) => {
      this.tgMap[tg.name] = tg;
      tg.cases.forEach((tc) => {
        const id = [tg.name, tc.name].join('|');
        Object.assign(tc, { id });
        if (this.tcMap[id]) {
          console.log('error! 2 cases with the same name: ', id);
          return;
        }
        this.tcMap[id] = tc;
      });
    });
  }
}

let testManager = new TestManager(globalObjects, TEST_DATA);
testManager.loadAndRenderTestGroupsButtons();

// check proper configs
envConfig.performRequiredChecks();

// errReporter.reportError('mod', 'msg');
// errReporter.reportWarning('mod', 'msg');

document.getElementById('load_data_btn').addEventListener('click', () => {
  const data = dsh.loadData('offers-tests');
  if (!data) {
    console.log('no data available');
  } else {
    console.log('data available: ', data);
    const lastUpdate = new Date(data.l_updated);
    console.log('loading data from: ', lastUpdate.toString());
    testManager.destroy();
    testManager = new TestManager(globalObjects, data.data.test_manager);
    testManager.loadAndRenderTestGroupsButtons();

    errReporter.setState(data.data.err_reporter);
  }
});
document.getElementById('save_data_btn').addEventListener('click', () => {
  const d = {
    test_manager: testManager.getData(),
    err_reporter: errReporter.getState()
  };
  dsh.saveData('offers-tests', d);
  console.log('data saved');
});
document.getElementById('show_env_config_btn').addEventListener('click', () => {
  envConfig.refreshUITable();
});


$('.header').click(function click() {
  $(this).toggleClass('expand').nextUntil('tr.header').slideToggle(100);
});
