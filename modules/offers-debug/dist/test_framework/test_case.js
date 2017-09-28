var EXPORTED_SYMBOLS = ['TestCase', 'SignalsTestCase'];

class TestCase {
  constructor() {}
  isTestActive() {
    throw new Error('Not implemented');
  }
  setTestActive(active) {
    throw new Error('Not implemented');
  }
}

class SignalsCheckHandler {
  // expected_signals:
  // [
  //  {
  //      cid: '',
  //      oid: '',
  //      origID: '',
  //      sid: '',
  //      min_expected_count: 1
  //  }
  // ]
  constructor(signalsInfo, actionInfo) {
      this.sigInfo = signalsInfo
      this.actionInfo = actionInfo;
      this.sigCellMap = {};
      this.actionCellMap = {};
      this.expSigs = {};
      this.expActions = {};
      this.expectedSignals = signalsInfo.expected_signals;
      this.expectedActions = actionInfo.expected_actions;
      this.currentSignalsMap = {};
      this.currentActionsMap = {};
      const self = this;
      if (this.expectedSignals) {
        this.expectedSignals.forEach((s) => {
          if (!s) {
            return;
          }
          const key = self._getKey(s.cid, s.oid, s.origID, s.sid);
          self.expSigs[key] = {
            min_expected_count: s.min_expected_count,
            max_expected_count: s.max_expected_count,
            current_val: 0
          };
          const si = { cid: s.cid, oid: s.oid, origID: s.origID, sid: s.sid, count: 0 };
          this.currentSignalsMap[key] = si;
        });
      }
      if (this.expectedActions) {
        this.expectedActions.forEach((s) => {
          if (!s) {
            return;
          }
          const key = self._getActionKey(s.aid, s.origID);
          self.expActions[key] = {
            min_expected_count: s.min_expected_count,
            max_expected_count: s.max_expected_count,
            current_val: 0
          };
          const si = { aid: s.aid, origID: s.origID, count: 0 };
          this.currentActionsMap[key] = si;
        });
      }

      // create the currentSignalsMap
      if (this.sigInfo && this.sigInfo.current_signals) {
        this.sigInfo.current_signals.forEach((s) => {
          if (!s) {return;}
          const key = self._getKey(s.cid, s.oid, s.origID, s.sid);
          this.currentSignalsMap[key] = s;
        });
      }
      if (this.actionInfo && this.actionInfo.current_signals) {
        this.actionInfo.current_signals.forEach((s) => {
          if (!s) {return;}
          const key = self._getActionKey(s.aid, s.origID);
          this.currentActionsMap[key] = s;
        });
      }
  }

  currentSignals() {
    const result = [];
    Object.keys(this.currentSignalsMap).forEach((skey) => {
      const s = this.currentSignalsMap[skey];
      result.push(s);
      console.log('currentSignal: : ', skey);
    });
    return result;
  }

  currentActions() {
    const result = [];
    Object.keys(this.currentActionsMap).forEach((skey) => {
      const s = this.currentActionsMap[skey];
      result.push(s);
      console.log('currentSignal: : ', skey);
    });
    return result;
  }

  incCampaignCount(cid, oid, origID, sid, incVal = 1, doesNotExist = false) {
    let sigRow = this._getRow(cid, oid, origID, sid);
    let totalCount = Number(sigRow.cells[4].innerHTML);
    this.setCampaignVal(cid, oid, origID, sid, totalCount + incVal, doesNotExist)
  }

  incActionCount(aid, origID, incVal = 1, doesNotExist = false) {
    let sigRow = this._getActionRow(aid, origID);
    let totalCount = Number(sigRow.cells[2].innerHTML);
    this.setActionVal(aid, origID, totalCount + incVal, doesNotExist)
  }

  clearTables() {
    const htmlTable = document.getElementById(this.sigInfo.ui_name);
    htmlTable.innerHTML = '<tr>' +
                            '<th>Origin</th>' +
                            '<th>Campaign ID</th>' +
                            '<th>Offer ID</th>' +
                            '<th>Signal name</th>' +
                            '<th>Count</th>' +
                          '</tr>';
    delete this.sigCellMap;
    this.sigCellMap = {};

    if (this.actionInfo && this.actionInfo.ui_name) {
      const html = document.getElementById(this.actionInfo.ui_name);
      if (html) {
        html.innerHTML = '<tr>' +
                         '<th>Origin</th>' +
                         '<th>Signal name</th>' +
                         '<th>Count</th>' +
                         '</tr>';
      }
    }
    delete this.actionCellMap;
    this.actionCellMap = {};
  }

  resetTableWithCurrentState() {
    // clear?
    this.clearTables();
    const self = this;
    Object.keys(this.currentSignalsMap).forEach((skey) => {
      console.log('key: ', skey);
      const s = this.currentSignalsMap[skey];
      self.setCampaignVal(s.cid, s.oid, s.origID, s.sid, s.count);
    });
    Object.keys(this.currentActionsMap).forEach((skey) => {
      console.log('key: ', skey);
      const s = this.currentActionsMap[skey];
      self.setActionVal(s.aid, s.origID, s.count);
    });
  }

  setCampaignVal(cid, oid, origID, sid, val, doesNotExist = false) {
    let sigRow = this._getRow(cid, oid, origID, sid);
    sigRow.cells[0].innerHTML = origID;
    sigRow.cells[1].innerHTML = cid;
    sigRow.cells[2].innerHTML = oid;
    sigRow.cells[3].innerHTML = sid;
    sigRow.cells[4].innerHTML = val;
    // check if the counter is fine or not
    const skey = this._getKey(cid, oid, origID, sid);
    const sigInfo = this.expSigs[skey];
    if (doesNotExist) {
      sigRow.style = "background-color: red; font-weight: bold;"
    } else {
      if (sigInfo) {
        sigInfo.current_val = val;
        if (!this._isSigValid(sigInfo)) {
          sigRow.style = "background-color: red;";
        } else {
          sigRow.style = "background-color: green;";
        }
      }
    }
    // add the current signal to the list
    const sig = this.currentSignalsMap[skey];
    console.log('setCampaignVal: ', skey);
    if (!sig) {
      this.currentSignalsMap[skey] = { cid, oid, origID, sid, count: val };
    } else{
      sig.count = val;
    }
  }

  setActionVal(aid, origID, val, doesNotExist = false) {
    let sigRow = this._getActionRow(aid, origID);
    sigRow.cells[0].innerHTML = origID;
    sigRow.cells[1].innerHTML = aid;
    sigRow.cells[2].innerHTML = val;
    // check if the counter is fine or not
    const skey = this._getActionKey(aid, origID);
    const sigInfo = this.expActions[skey];
    if (doesNotExist) {
      sigRow.style = "background-color: red; font-weight: bold;"
    } else {
      if (sigInfo) {
        sigInfo.current_val = val;
        if (!this._isSigValid(sigInfo)) {
          sigRow.style = "background-color: red;";
        } else {
          sigRow.style = "background-color: green;";
        }
      }
    }
    // add the current signal to the list
    const sig = this.currentActionsMap[skey];
    console.log('setCampaignVal: ', skey);
    if (!sig) {
      this.currentActionsMap[skey] = { aid, origID, count: val };
    } else{
      sig.count = val;
    }
  }

  areAllSignalsPassed() {
    const self = this;
      let allPassed = true;
      Object.keys(this.expSigs).forEach((k) => {
          if (!allPassed) {
              return;
          }
          const currSig = self.expSigs[k];
          allPassed = allPassed && self._isSigValid(currSig);;
      });
      // console.log('signalsPassed: ', allPassed, this.expSigs);
      return allPassed;
  }

  areAllActionsPassed() {
    const self = this;
      let allPassed = true;
      Object.keys(this.expActions).forEach((k) => {
          if (!allPassed) {
              return;
          }
          const currSig = self.expActions[k];
          allPassed = allPassed && self._isSigValid(currSig);
      });
      // console.log('signalsPassed: ', allPassed, this.expActions);
      return allPassed;
  }

  areAllChecksPassed() {
      return this.areAllSignalsPassed() && this.areAllActionsPassed();
  }

  _isSigValid(sigInfo) {
    if (sigInfo.min_expected_count !== undefined) {
      if (sigInfo.current_val < sigInfo.min_expected_count) {
        return false;
      }
    }
    if (sigInfo.max_expected_count !== undefined) {
      if (sigInfo.current_val > sigInfo.max_expected_count) {
        return false;
      }
    }
    return true;
  }

  _getRow(cid, oid, origID, sid) {
      const htmlTable = document.getElementById(this.sigInfo.ui_name);
      if (!htmlTable) {
        return;
      }
      const key = this._getKey(cid, oid, origID, sid);
      let sigRow = this.sigCellMap[key];
      if (!sigRow) {
          // create a new one
          sigRow = this.sigCellMap[key] = htmlTable.insertRow(-1);
          // console.log('inserting new row! for key: ', key, ' and data: ', this.sigCellMap);
          for (let i = 0; i < 5; i+=1) {
              sigRow.insertCell(0);
          }
      }
      return sigRow;
  }
  _getActionRow(aid, origID) {
    const htmlTable = document.getElementById(this.actionInfo.ui_name);
    if (!htmlTable) {
      return;
    }
    const key = this._getActionKey(aid, origID);
    let sigRow = this.actionCellMap[key];
    if (!sigRow) {
        // create a new one
        sigRow = this.actionCellMap[key] = htmlTable.insertRow(-1);
        // console.log('inserting new row! for key: ', key, ' and data: ', this.sigCellMap);
        for (let i = 0; i < 3; i+=1) {
            sigRow.insertCell(0);
        }
    }
    return sigRow;
  }

  _getKey(cid, oid, origID, sid) {
      return [cid, oid, origID, sid].join('|');
  }
  _getActionKey(actionID, origID) {
    return [actionID, origID].join('|');
  }

};


class SignalsTestCase extends TestCase {
  constructor(state, cbMap, globalObjects, testCaseElemName, allSignalsMap) {
    super();
    this.errReporter = globalObjects.errReporter;
    this.state = state;
    this.isActive = false;
    this.globalObjects = globalObjects;
    this.testCaseElemName = testCaseElemName;
    this.allSignalsMap = allSignalsMap;
    this.allSignalsSet = new Set();
    Object.keys(allSignalsMap).forEach((k) => {
      this.allSignalsSet.add(allSignalsMap[k]);
    });
    // callbacks:
    // {
    //    status_change: (testCase, state),
    //
    // }
    this.cbMap = cbMap;

    // register the global objects callbacks
    this._onSetCampaignSignal = this._onSetCampaignSignal.bind(this);
    this._onSetActionSignal = this._onSetActionSignal.bind(this);
    this.globalObjects.signalWrapper.registerSetCampaignSignal(this._onSetCampaignSignal);
    this.globalObjects.signalWrapper.registerSetActionSignal(this._onSetActionSignal);
    const signalsInfo = {
      ui_name: 'expected_signals',
      expected_signals: this.state.expected_signals,
      current_signals: this.state.current_signals
    };
    const actionsInfo = {
      ui_name: 'expected_actions',
      expected_actions: this.state.expected_actions,
      current_actions: this.state.current_actions
    };
    this.signalHandler = new SignalsCheckHandler(signalsInfo, actionsInfo);
  }

  destroy() {
    this.globalObjects.signalWrapper.unregisterSetCampaignSignal(this._onSetCampaignSignal);
  }

  getState() {
    this.state.current_signals = this.signalHandler.currentSignals();
    this.state.current_actions = this.signalHandler.currentActions();

    return this.state;
  }

  isTestActive() {
    return this.isActive;
  }
  setTestActive(active) {
    this.isActive = active;
  }

  // can be: 'pending', 'failed', success
  getStatus() {
    return this.state.status;
  }

  reset() {
    this.state.status = 'pending';
    this.renderUI();
  }

  // will clean all the ui and render everything from scratch so we avoid inconsistences
  renderUI() {
    var testElem = document.getElementById(this.testCaseElemName);
    if (!testElem) {
      console.log('error test case elem not exists');
      return;
    }
    // delete all the elements
    function clearInner(node) {
      while (node.hasChildNodes()) {
        clear(node.firstChild);
      }
    }

    function clear(node) {
      while (node.hasChildNodes()) {
        clear(node.firstChild);
      }
      node.parentNode.removeChild(node);
    }

    clearInner(testElem);

    // create description
    var testDesc = document.createElement('div');
    testDesc.class = "testcase_desc";
    testDesc.textContent = this.state.desc;
    testElem.appendChild(document.createElement('br'));
    testElem.appendChild(testDesc);

    // create status
    var testStatus = document.createElement('div');
    testStatus.id = 'test_status';
    testStatus.className += this.state.status;
    testStatus.textContent = this.state.status;
    testElem.appendChild(document.createElement('br'));
    testElem.appendChild(testStatus);

    // create table
    var testTable = document.createElement('table');
    testTable.id="expected_signals";
    testTable.border="1";
    testTable.style="width:50%";
    testTable.innerHTML = '<tr>' +
                            '<th>Origin</th>' +
                            '<th>Campaign ID</th>' +
                            '<th>Offer ID</th>' +
                            '<th>Signal name</th>' +
                            '<th>Count</th>' +
                          '</tr>';
    testElem.appendChild(document.createElement('br'));
    testElem.appendChild(testTable);

    var actionTable = document.createElement('table');
    actionTable.id="expected_actions";
    actionTable.border="1";
    actionTable.style="width:50%";
    actionTable.innerHTML = '<tr>' +
                            '<th>Origin</th>' +
                            '<th>Signal name</th>' +
                            '<th>Count</th>' +
                          '</tr>';
    testElem.appendChild(document.createElement('br'));
    testElem.appendChild(actionTable);

    this.signalHandler.resetTableWithCurrentState();
    this._styleCurrentStatus();
  }

  _changeCurrentStatus(status) {
    let statusElem = document.getElementById('test_status');
    this.state.status = status;
    if (statusElem) {
      statusElem.className == this.state.status;
      statusElem.textContent = 'Status: ' + status;
      this._styleCurrentStatus();
    }
    if (this.cbMap && this.cbMap.status_change) {
      this.cbMap.status_change(this.id, status);
    }
  }

  _styleCurrentStatus() {
    let statusElem = document.getElementById('test_status');
    if (statusElem) {
      // TODO: this is not working for some reason with the styles
      if (this.state.status === 'success') {
        statusElem.style = "background-color: green;";
      } else if (this.state.status === 'pending') {
        statusElem.style = "background-color: grey;";
      } else if (this.state.status === 'failed') {
        statusElem.style = "background-color: red;";
      }
    }
  }

  _onSetCampaignSignal(cid, oid, origID, sid, counter) {
    if (!this.isActive) {
      // skip this
      return;
    }
    // check if the action id exists on the list
    // // check if the origin is trigger, which can happen since triggers can send
    // whatever
    const exists = this.allSignalsSet.has(sid)  || origID === 'trigger';
    this.signalHandler.incCampaignCount(cid, oid, origID, sid, counter, !exists);
    if (!exists) {
      this.errReporter.reportError('test_case', `The campaign signal ${sid} doesnt exists??? this is bad! Please report the error`);
    }
    // check if it is ready
    if (this.signalHandler.areAllChecksPassed()) {
      this._changeCurrentStatus('success');
    }
  }

  _onSetActionSignal(actionID, origID, counter) {
    if (!this.isActive) {
      // skip this
      return;
    }
    // check if the action id exists on the list
    // check if the origin is trigger, which can happen since triggers can send
    // whatever
    const exists = this.allSignalsSet.has(actionID) || origID === 'trigger';

    this.signalHandler.incActionCount(actionID, origID, counter, !exists);
    if (!exists) {
      this.errReporter.reportError('test_case', `The action signal ${actionID} doesnt exists??? this is bad! Please report the error`);
    }
    // check if it is ready
    if (this.signalHandler.areAllChecksPassed()) {
      this._changeCurrentStatus('success');
    }
  }
}
