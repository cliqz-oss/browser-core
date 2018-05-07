/* global document, Handlebars */
import Spanan from 'spanan';

import templates from '../../templates';
import { CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../../../core/content/helpers';
import checkIfChromeReady from '../../../core/content/ready-promise';


function createSpananForModule(moduleName) {
  const spanan = new Spanan(({ uuid, action, args }) => {
    const message = {
      source: CHROME_MSG_SOURCE,
      target: 'cliqz',
      module: moduleName,
      action,
      requestId: uuid,
      args
    };

    chrome.runtime.sendMessage(message, response =>
      spanan.handleMessage({
        uuid,
        response: response.response
      })
    );
  });
  return spanan;
}

const anolysisBridge = createSpananForModule('anolysis');
const anolysis = anolysisBridge.createProxy();


function demographicsAndGID() {
  Promise.all([
    anolysis.getGID(),
    anolysis.getDemographics(),
    anolysis.getLastGIDUpdateDate(),
  ]).then(([GID, demographics, lastUpdate]) => {
    // if GID is ''
    let parsedGID = { status: 'not retrieved yet' };
    try {
      parsedGID = JSON.parse(GID);
    } catch (ex) {
      // parsedGID has already been assigned to a valid Object
    }

    // Update browser_attributes section
    document.getElementById('browser-attributes').innerHTML =
      templates.browser_attributes(demographics);

    // Update group-id section
    const gidUpdate = {};
    if (lastUpdate !== undefined) {
      gidUpdate.message =
        `The GID was anonymously received on date: ${lastUpdate}`;
    } else {
      gidUpdate.message =
        'The GID will be anonymously retrieved within the next 24 hours';
    }
    document.getElementById('group-id').innerHTML =
      templates.group_id({ demographics, parsedGID, gidUpdate });
  });
}


function showSignalDefinitions() {
  anolysis.getSignalDefinitions().then((definitions) => {
    const analyses = [];
    const metrics = [];
    definitions.forEach((v) => {
      const entity = {};
      entity.name = v.name;
      entity.schema = JSON.stringify(v.schema, null, 2);

      if (v.generate !== undefined || v.sendToBackend === true) {
        analyses.push(entity);
      } else {
        metrics.push(entity);
      }
    });
    document.getElementById('analyses').innerHTML =
      templates.analyses(analyses);
    document.getElementById('metrics').innerHTML = templates.metrics(metrics);
  });
}


function showAbout() {
  document.getElementById('about').innerHTML = templates.about();
}


// Register and plug in the templates
Handlebars.partials = templates;
document.getElementById('main').innerHTML = templates.main();


checkIfChromeReady().then(() => {
  chrome.runtime.onMessage.addListener((message) => {
    if (!isCliqzContentScriptMsg(message)) {
      return;
    }
    anolysisBridge.handleMessage({
      uuid: message.requestId,
      response: message.response
    });
  });

  demographicsAndGID();
  showSignalDefinitions();
  showAbout();
});
