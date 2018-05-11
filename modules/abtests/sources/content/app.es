/* eslint { "prefer-arrow-callback": "off" } */
/* global document */
import $ from 'jquery';
import Handlebars from 'handlebars';
import templates from '../templates';
import CLIQZ from './cliqz';

function showControls() {
  CLIQZ.abtests.isRunning().then((isRunning) => {
    document.getElementById('controls').innerHTML =
      templates.controls({ isRunning });

    $('#start').on('click', function start() {
      CLIQZ.abtests.start().then(() => showControls());
    });
    $('#stop').on('click', function stop() {
      CLIQZ.abtests.stop().then(() => showControls());
    });
  });
}

function showCoreVersion() {
  CLIQZ.abtests.getCoreVersion().then((version) => {
    document.getElementById('core-version').innerHTML =
      templates.version(version);
  });
}

function showDemographics() {
  CLIQZ.abtests.getDemographics().then((demographics) => {
    document.getElementById('demographics').innerHTML = templates.demographics(JSON.parse(demographics));
  });
}

function showCompletedTests() {
  CLIQZ.abtests.getCompletedTests().then(function show(tests) {
    const options = { showRemove: true };
    document.getElementById('completed-tests').innerHTML =
      templates.tests({ tests, options });

    $('.remove-test').each(function assignRemoveTest() {
      $(this).on('click', function removeTest() {
        const id = parseInt($(this).attr('data-test-id'), 10);
        const test = tests[id];
        CLIQZ.abtests.removeTest(test);
        showCompletedTests();
      });
    });
  });
}


function showActiveTests() {
  CLIQZ.abtests.getRunningTests().then(function show(tests) {
    const options = { showStop: true };
    document.getElementById('active-tests').innerHTML =
      templates.tests({ tests, options });

    $('.stop-test').each(function assignStopTest() {
      $(this).on('click', function stopTest() {
        const id = parseInt($(this).attr('data-test-id'), 10);
        const test = tests[id];
        CLIQZ.abtests.stopTest(test).then(() => {
          showActiveTests();
          showCompletedTests();
        });
      });
    });
  });
}

function showAvailableTests() {
  CLIQZ.abtests.getAvailableTests().then(function show(tests) {
    const options = { showStart: true };
    document.getElementById('available-tests').innerHTML =
      templates.tests({ tests, options });

    $('.start-test').each(function assignStartTest() {
      $(this).on('click', function startTest() {
        const id = parseInt($(this).attr('data-test-id'), 10);
        const test = tests.find(t => t.id === id);
        const group = $(this).siblings('.start-test-group').val();
        CLIQZ.abtests.startTest(test, group).then(() => {
          showActiveTests();
        });
      });
    });
  });
}

function showAll() {
  showDemographics();
  showCoreVersion();
  showActiveTests();
  showAvailableTests();
  showCompletedTests();
  showControls();
}

Handlebars.partials = templates;

document.getElementById('ab-tests').innerHTML = templates.main();
showAll();

$('#refresh').on('click', function refresh() {
  showAll();
});

$('#update-tests').on('click', function updateTests() {
  CLIQZ.abtests.updateTests().then(() => {
    showAll();
  });
});

$('#load-tests').on('click', function loadTests() {
  CLIQZ.abtests.loadTests().then(() => {
    showAll();
  });
});

$('#save-tests').on('click', function saveTest() {
  CLIQZ.abtests.saveTests().then(() => {
  });
});
