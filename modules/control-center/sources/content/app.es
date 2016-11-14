import helpers from 'control-center/content/helpers';
import { messageHandler, sendMessageToWindow } from 'control-center/content/data';
import $ from 'jquery';
import Handlebars from 'handlebars';

var slideUp = $.fn.slideUp;
var slideDown = $.fn.slideDown;
function resize() {
  var $controlCenter = $('#control-center');
  var width = $controlCenter.width();
  var height = $controlCenter.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width: width,
      height: height
    }
  });
}
$.fn.slideUp = function () {
  var ret = slideUp.call(this, 0);
  resize()
  return ret;
}
$.fn.slideDown = function () {
  var ret = slideDown.call(this, 0);
  resize();
  return ret;
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
        key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

function isNonClickable(section) {
  const nonClickableSections = ["https", "privacy-cc", "cliqz-tab"];
  return nonClickableSections.indexOf(section) > -1;
}

function isOnboarding() {
  return $('#control-center').hasClass('onboarding');
}


//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(document).ready(function(resolvedPromises) {

  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  draw({});
  resize();
  sendMessageToWindow({
    action: 'getData',
    data: {}
  });
});

// actions

$('body').on('click', function(ev) {
  if(isOnboarding()) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'sendTelemetry',
      args: [{
        type: 'onboarding',
        version: '2.0',
        action: 'click',
        view: 'privacy',
        target: 'dashboard',
      }]
    }), '*');

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'onboarding-v2',
      action: 'shakeIt'
    }), '*');

  }
})

// open URL
$('#control-center').on('click', '[openUrl]', function(ev){
  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: ev.currentTarget.getAttribute('openUrl'),
      target: ev.currentTarget.getAttribute('data-target'),
      closePopup: ev.currentTarget.dataset.closepopup || true
    }
  });
});

$('#control-center').on('click', '[data-function]', function(ev){
  if(isOnboarding()) {
    return;
  }
  sendMessageToWindow({
    action: ev.currentTarget.dataset.function,
    data: {
      status: $(this).prop('checked')
    }
  });
});

$('#control-center').on('click', '[complementarySearchChanger]', function(ev) {
  sendMessageToWindow({
    action: 'complementary-search',
    data: {
      defaultSearch: $(this).val()
    }
  });
});

$('#control-center').on('click', '[antiTrackingStatusChanger]', function(ev){
  var state,
      type = $(this).attr('data-type');
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('state');
  } else {
    state = $(this).attr('data-state');
  }

  if(isOnboarding()) {
    return;
  }

  sendMessageToWindow({
    action: 'antitracking-activator',
    data: {
      type: type,
      state: state,
      status: $(this).closest('.frame-container').attr('state'),
      hostname: $(this).closest('.frame-container').attr('hostname'),
    }
  });
});

$('#control-center').on('click', '[adBlockerStatusChanger]', function(ev){
  var state,
      type = $(this).attr('data-type'),
      frame = $(this).closest('.frame-container');

  if (type === 'switch') {
    state = frame.attr('state');
  } else {
    state = $(this).attr('data-state');
  }

  frame.attr('data-visible', $(this).attr('data-state'));
  if(isOnboarding()) {
    return;
  }
  sendMessageToWindow({
    action: 'adb-activator',
    data: {
      type: type,
      state: state,
      status: frame.attr('state'),
      url: frame.attr('url'),
      option: $(this).closest('.switches').find('.dropdown-scope').val()
    }
  });
});

// select box change
$('#control-center').on('change', 'select[updatePref]', function(ev){
  sendMessageToWindow({
    action: 'updatePref',
    data: {
      pref: ev.currentTarget.getAttribute('updatePref'),
      value: ev.currentTarget.value,
      target: ev.currentTarget.getAttribute('data-target')
    }
  });
});

function updateGeneralState() {
  var stateElements = document.querySelectorAll('.frame-container.anti-tracking, .frame-container.antiphishing');
  var states = [].map.call(stateElements, function(el) {
    return el.getAttribute('state');
  }), state = 'active';

  if(states.includes('critical')){
    state = 'critical';
  }
  else if(states.includes('inactive')){
    state = 'inactive';
  }

  $('#header').attr('state', state);
  if(isOnboarding()) {
    return;
  }
  sendMessageToWindow({
    action: 'updateState',
    data: state
  });
}

function compile(obj) {
  return Object.keys(obj.companies)
      .map(function (companyName) {
        var domains = obj.companies[companyName];
        var company = {
          name: companyName,
          watchDogName: companyName.replace(/ /g,"-"),
          domains: domains.map(function (domain) {
            var domainData = obj.trackers[domain];
            return {
              domain: domain,
              count: (domainData.cookie_blocked || 0) + (domainData.bad_qs || 0)
            }
          }).sort(function (a, b) {
            return a.count < b.count;
          }),
          count: 0
        };
        company.count = company.domains.reduce(function (prev, curr) { return prev + curr.count }, 0)
        return company;
      })
      .sort(function (a,b) {
        return a.count < b.count;
      });
}

function compileAdblockInfo(data) {
  var advertisers = data.module.adblocker.advertisersList;
  var firstParty = advertisers['First party'];
  var unknown = advertisers['_Unknown']
  delete advertisers['First party'];
  delete advertisers['_Unknown'];
  data.module.adblocker.advertisersList.companiesArray = Object.keys(advertisers).map(function (advertiser) {
    var resources = advertisers[advertiser];
    return {
      name: advertiser,
      count: resources.length
    }
  }).sort((a,b) => a.count < b.count);

  if (firstParty) {
    data.module.adblocker.advertisersList.companiesArray.unshift({
      name: 'First Party', // i18n
      count: firstParty.length
    });
  }
  if (unknown) {
    data.module.adblocker.advertisersList.companiesArray.push({
      name: 'Other', // i18n
      count: unknown.length
    });
  }
}

function draw(data){
  if(data.onboarding) {
    document.getElementById('control-center').classList.add('onboarding');

    if(data.module.antitracking.totalCount === 1) {
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'core',
        action: 'sendTelemetry',
        args: [{
          type: 'onboarding',
          version: '2.0',
          action: 'show',
          view: 'privacy',
          target: 'dashboard',
        }]
      }), '*');
    }
  }

  if (data.module) {
    // antitracking default data
    if (!data.module.antitracking.state) {
      data.module.antitracking.visible = true
      data.module.antitracking.state = "critical"
      data.module.antitracking.totalCount = 0
    }
    if (data.module.antitracking.trackersList) {
      data.module.antitracking.trackersList.companiesArray = compile(data.module.antitracking.trackersList)
    }


    if (data.module.adblocker) {
      compileAdblockInfo(data);
    }
  }

  if(data.debug){
    console.log('Drawing: ', data);
  }

  document.getElementById('control-center').innerHTML = CLIQZ.templates['template'](data)
  document.getElementById('anti-phising').innerHTML = CLIQZ.templates['anti-phising'](data);
  document.getElementById('anti-tracking').innerHTML = CLIQZ.templates['anti-tracking'](data);

  if(data.amo) {
    document.getElementById('amo-privacy-cc').innerHTML = CLIQZ.templates['amo-privacy-cc']();
    document.getElementById('cliqz-tab').innerHTML = CLIQZ.templates['amo-cliqz-tab'](data);
  } else {
    document.getElementById('ad-blocking').innerHTML = CLIQZ.templates['ad-blocking'](data);
    document.getElementById('https').innerHTML = CLIQZ.templates['https'](data);
  }

  function close_setting_accordion_section() {
    $('.setting-accordion .accordion-active-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.accordion-active-title').click(function(e) {
    //temporary disable accordion for attrack EX-2875
    if($(this).attr('data-target').indexOf('attrack') == 0) {
      return;
    }

    e.preventDefault();
    var currentAttrValue = $(this).attr('href'),
        state;

    if ($(e.target).is('.active') || ($(e.target)[0].parentElement.className == 'accordion-active-title active')) {
      close_setting_accordion_section();
      state = 'collapsed';
    } else {
      close_setting_accordion_section();
      $(this).addClass('active');
      $('.setting-accordion ' + currentAttrValue).slideDown(150).addClass('open');
      state = 'expanded';
    }

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $(this).attr('data-target'),
        state: state,
        action: 'click'
      }
    });
  });

  function close_accordion_section() {
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.accordion-section-title').click(function(e) {
    if($(this).attr('data-disabled') == 'true') {
      return;
    }

    e.preventDefault();
    var currentAttrValue = $(this).attr('href'),
        state;

    if ($(e.target).is('.active') || ($(e.target)[0].parentElement.className == 'accordion-section-title active')) {
      close_accordion_section();
      state = 'collapsed';
    } else {
      close_accordion_section();
      $(this).addClass('active');
      $('.accordion ' + currentAttrValue).slideDown(150).addClass('open');
      state = 'expanded';
    }

     sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $(this).attr('data-target'),
        state: state,
        action: 'click'
      }
    });
  });

  $('.enable-search').click(function(e) {
     sendMessageToWindow({
      action: 'enableSearch'
    });
  });

  //====== SETTING SECTION =========//
  $('.setting').click(function(e) {
    var $main = $(this).closest('#control-center'),
        $othersettings = $main.find('#othersettings'),
        $setting = $(this).closest('.setting'),
        $section = $setting.attr('data-section'),
        $target = $setting.attr('data-target');

    if (isNonClickable($section)) {
      return;
    } else if ($(e.target).hasClass('cqz-switch-box')) {
      return;
    } else if ($(e.target).hasClass('dropdown-scope')) {
      return;
    } else if (e.target.hasAttribute && e.target.hasAttribute('stop-navigation')) {
      return;
    } else if ($(e.target).hasClass('box')) {
      return;
    } else if ($(e.target)[0].nodeName == 'LABEL') {
      return;
    } else if ($(e.target)[0].nodeName == 'INPUT') {
      return;
    } else if ($(e.target).hasClass('cqz-switch-box')) {
      return;
    }

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $target,
        action: 'click'
      }
    });

    $('#settings').addClass('open');
    $(this).addClass('active');
    $othersettings.css('display', 'none');
  });

  $('.cross').click(function(e) {
    e.stopPropagation()
    $(this).closest('.setting').removeClass('active');
    $('#othersettings').css('display', 'block');
    $('#settings').removeClass('open');
    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $(this).attr('data-target'),
        action: 'click'
      }
    });
  });

  $('.cqz-switch-label, .cqz-switch-grey').click(function() {
    var target = $(this).closest('.bullet');
    target.attr('state', function(idx, attr) {
      return attr !== 'active' ? 'active' : target.attr('inactiveState');
    });

    if(this.hasAttribute('updatePref')){
      sendMessageToWindow({
        action: 'updatePref',
        data: {
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') == 'active' ? true : false,
          target: this.getAttribute('data-target')
         }
      });
    }
  });

  $('.cqz-switch').click(function() {

    var target = $(this).closest('.frame-container'),
        type = 'switch';

    target.attr('state', function(idx, attr){
        return attr !== 'active' ? 'active': target.attr('inactiveState');
    });

    if(this.hasAttribute('updatePref')){
      if(isOnboarding()) {
        return;
      }

      sendMessageToWindow({
        action: 'updatePref',
        data: {
          type: type,
          target: target.parent().attr('data-target') + '_' + type,
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') == 'active' ? true : false
        }
      });
    }

    updateGeneralState();
  });

  $('.dropdown-scope').change(function(ev) {
    var state = ev.currentTarget.value,
        target = $(this).closest('.frame-container');

    target.attr('state', state == 'all' ?
      'critical' : target.attr('inactiveState'));

    updateGeneralState();
  });

  $('.pause').click(function () {
    // TODO
    localizeDocument();
  });

  localizeDocument();
}

window.draw = draw;
