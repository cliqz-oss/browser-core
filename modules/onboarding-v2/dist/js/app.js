var tlmTimer = 0;
const MIN_WIDTH = 1100;
const MIN_HEIGHT = 768;

var tlmTimerFn = function () {
  setTimeout(function () {
    tlmTimer += 50;
    tlmTimerFn();
  }, 50);
}

function getSearchBtn() {
  return document.getElementById("cqb-search-btn");
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
    key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);

  if(el.classList.contains('search-link')) {
      el.setAttribute('href',chrome.i18n.getMessage(key, elArgs));
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), el => {
    var elArgs = el.dataset.i18nTitle.split(','),
    key = elArgs.shift();

    el.setAttribute('title', chrome.i18n.getMessage(key, elArgs));
  });
}

function telemetrySig(msg) {
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'sendTelemetry',
    args: [{
      type: 'onboarding',
      version: '2.1',
      action: msg.action,
      view: msg.view,
      target: msg.target,
      show_duration: tlmTimer
    }]
  }), '*');
}



var CALLBACKS = {};
window.addEventListener("message", function (ev) {
  var msg;
  try {
    msg = JSON.parse(ev.data);
  } catch (e) {
    msg = {};
  }
  if (msg.action === 'shakeIt') {
    var btn = getSearchBtn();
    btn.style.opacity = 1;
    btn.classList.remove("cqz-shake-it");
    setTimeout(function() {
      btn.classList.add("cqz-shake-it")
    }, 200);
  }
  if (msg.type === "response") {
    var action = CALLBACKS[msg.action];
    if (action) {
      action.call(null, msg.response);
    }
  }
});

var openTooltip1, openTooltip2;
// =================
// ====== STEP 1 ===
// =================


function step1() {

  //=== Telemetry
  telemetrySig({
    action: 'show',
    view: 'intro',
    target: 'page',
    resumed: 'false'
  });

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step1'
  }), '*');

  //=== STEP 1 Tooltip Trigger
  openTooltip1 = setTimeout(function () {
    $('#cqb-atr-on').tooltipster('open');
    telemetrySig({
      action: 'show',
      view: 'intro',
      target: 'callout'
    });
  }, 1000);

  //==== Step 1 Click
  $("#cqb-atr-on").click(function (e) {
    e.stopPropagation();
    step2();
  });

  // Open Tooltip if user click
  $(".cqb-steps .cqb-step1").click(function(e) {

    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      action: 'click',
      view: 'intro',
      target: 'body',
      show_duration: tlmTimer
    });
    $('#cqb-atr-on').tooltipster('open');
  });
}

// =================
// ====== STEP 2 ===
// =================

function step2() {
  clearTimeout(openTooltip1);

  //=== Telemetry
  telemetrySig({
    action: 'hide',
    view: 'intro',
    target: 'page',
  });

  tlmTimer = 0;
  telemetrySig({
    action: 'show',
    view: 'privacy',
    target: 'page',
    resumed: 'false'
  });

  $("body").addClass("cqb-step2");
  $('#cqb-atr-on').tooltipster('close');

  // Show search btn
  setTimeout(function () {
      telemetrySig({
        action: 'show',
        view: 'privacy',
        target: 'next'
      });
     $('#cqb-search-btn').css('opacity', '1');
  }, 3000);

  // Open Tool Tip
  openTooltip2 = setTimeout(function () {
    $('#cqb-search-btn').tooltipster('open');
    telemetrySig({
      action: 'show',
      view: 'privacy',
      target: 'callout',
      show_duration: tlmTimer
    });
  }, 5000);

  //Open control center
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step2'
  }), '*');

  //=== STEP 2 Tooltip Trigger
  $(".cqb-steps .cqb-step2").click(function(e) {

    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      action: 'click',
      view: 'privacy',
      target: 'body',
      show_duration: tlmTimer
    });
    $('#cqb-search-btn').css('opacity', '1')
    $('#cqb-search-btn').tooltipster('open');
  });
}


// =================
// ====== STEP 3 ===
// =================

function step3() {
  clearTimeout(openTooltip2);

  //=== Telemetry
  telemetrySig({
    action: 'hide',
    view: 'privacy',
    target: 'page',
    resumed: 'false'
  });

  tlmTimer = 0;

  telemetrySig({
    action: 'show',
    view: 'search',
    target: 'page',
    resumed: 'false'
  });


  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step3',
  }), '*');

  // Show search btn
  var homeBtn = setTimeout(function () {
    if ($("#cqb-fresh-tab").is(":hidden")) {
      $('#cqb-fresh-tab').css('display', 'inline-block');
      telemetrySig({
          action: 'show',
          view: 'search',
          target: 'next',
        });
    }
  }, 7000);

  $("body").addClass("cqb-step3");
  $('#cqb-search-btn').tooltipster('close');

  setTimeout(function () {
    $('.cqb-search-tooltip').tooltipster('open');
  }, 600);

  //Click Search Suggestions
  $('.search-link').click(function (e) {
    clearTimeout(homeBtn);

    $(this).addClass('active');

    if($("#cqb-fresh-tab").is(":hidden")) {
      var homeBtn = setTimeout(function () {
        $('#cqb-fresh-tab').css('display', 'inline-block');
        telemetrySig({
          action: 'show',
          view: 'search',
          target: 'next',
        });
      }, 3000);
    }

    e.preventDefault();
    var val = $(this).attr('href');
    autoQuery('');
    autoQuery(val);
  });


  //=== STEP 3 Tooltip Trigger
  $(".cqb-steps .cqb-step3").click(function(e) {
    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      action: 'click',
      view: 'search',
      target: 'body',
      show_duration: tlmTimer
    });
    $('#cqb-search-btn').css('opacity', '1')
    $('#cqb-search-btn').tooltipster('open');
  });

  $("#cqb-fresh-tab").on("click", function(e) {
    e.preventDefault();
    finishOnboarding();
  });
}

function finishOnboarding() {
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'finishOnboarding'
  }), "*");
}

function autoQuery(val) {

  //Go to freshtab
  CALLBACKS['queryCliqz'] = function () {
    setTimeout(function() {
      $('body').css('background', '#f7f7f7');
      setTimeout(function() {
        window.postMessage(JSON.stringify({
            target: 'cliqz',
            module: 'core',
            action: 'closePopup',
            args: [val]
        }), "*");

        finishOnboarding();
      }, 600);
    }, 60000);
  };
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'queryCliqz',
    args: [val]
  }), "*");
}


var stepPromise = new Promise(function (resolve, reject) {
  CALLBACKS['initOnboarding'] = resolve;
}).then(function (step) {
  return step;
});
window.postMessage(JSON.stringify({
  target: 'cliqz',
  module: 'onboarding-v2',
  action: 'initOnboarding'
}), '*');

function setDimensions() {
  if($(window).width() < MIN_WIDTH || $(window).height() < MIN_HEIGHT) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'resizeWindow',
      args: [
        MIN_WIDTH, MIN_HEIGHT
      ]
    }), '*');
  }
}

// =================
// == Document Ready
// =================

Promise.all([
  $(document).ready().promise(),
  stepPromise
]).then(function (resolvedPromises) {
  var step = resolvedPromises[1];
  localizeDocument();
  setDimensions();

  // Blocks the right click on the onboarding
  $("*").on("contextmenu",function(){
     return false;
  });

  //Telemetry Trigger
  $('[data-cqb-tlmtr-target]').click(function (e) {
    e.stopPropagation();

    telemetrySig({
        action: 'click',
        view: $(this).data('cqb-tlmtr-view'),
        target: $(this).data('cqb-tlmtr-target')
    });
  });

  $('#cqb-atr-on').tooltipster({
    theme: 'tooltipster-light',
    side: "right",
    maxWidth: 250,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  $('.cqb-search-tooltip').tooltipster({
    theme: 'tooltipster-light',
    side: "bottom",
    maxWidth: 250,
    interactive: true,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  $('#cqb-search-btn').tooltipster({
    theme: 'tooltipster-light',
    side: "right",
    maxWidth: 250,
    interactive: true,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  switch(step) {
    case 1:
      step1();
      break;
    case 2:
      step2();
      break;
    case 3:
      step3();
      break;
  }

  //==== Step 2 Click
  $("#cqb-search-btn").click(function () {
    step3();
  });

  //Call Telemetry Timer
  tlmTimerFn();
});
