import $ from 'jquery';
import Handlebars from 'handlebars';
import { messageHandler, sendMessageToWindow } from './data';
import helpers from './helpers';
import templates from '../templates';

Handlebars.partials = templates;
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

    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function isOnboarding() {
  return $('#control-center').hasClass('onboarding');
}

function close_accordion_section() {
  $('.accordion .accordion-section-title').removeClass('active');
  $('.accordion .accordion-section-content').slideUp(150).removeClass('open');
}

//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(document).ready(function(resolvedPromises) {
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {}
  });
});

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
      status: $(this).prop('checked'),
      target: ev.currentTarget.getAttribute('data-target')
    }
  });
});

$('#control-center').on('change', '[complementarySearchChanger]', function(ev) {
  sendMessageToWindow({
    action: 'complementary-search',
    data: {
      defaultSearch: $(this).val()
    }
  });
});

$('#control-center').on('change', '[searchIndexCountryChanger]', function(ev) {
  sendMessageToWindow({
    action: 'search-index-country',
    data: {
      defaultCountry: $(this).val()
    }
  });
});

$('#control-center').on('click', '[antiTrackingStatusChanger]', function(ev){
  var state,
      type = $(this).attr('data-type'), status;
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('state');
    //make this website default
    var $switches = $(this).closest('.switches'),
        options = $switches.find('.dropdown-content-option'),
        defaultSelect = $switches.find('.dropdown-content-option[data-state="off_website"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
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
      frame = $(this).closest('.frame-container'),
      option;

  if (type === 'switch') {
    state = frame.attr('state');
    option = 'domain';
    //select first option "This domain" by default
    frame.attr('data-visible', 'off_domain');
    var $switches = $(this).closest('.switches'),
        options = $switches.find('.dropdown-content-option'),
        defaultSelect = $switches.find('.dropdown-content-option[data-state="off_domain"]');
    options.removeClass('selected')
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
    option = $(this).attr('value');
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
      //TODO instead of dropdown-scope selece the active button
      option: option
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

  if(states.indexOf('critical') != -1){
    state = 'critical';
  }
  else if(states.indexOf('inactive') != -1){
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
              count: (domainData.cookie_blocked || 0) + (domainData.tokens_removed || 0)
            }
          }).sort(function (a, b) {
            return a.count < b.count;
          }),
          count: 0
        };
        company.count = company.domains.reduce(function (prev, curr) { return prev + curr.count }, 0)
        company.isInactive = company.count === 0;
        return company;
      })
      .sort(function (a,b) {
        return a.count < b.count;
      });
}

function compileAdblockInfo(data) {
  var advertisers = data.module.adblocker.advertisersList,
      firstParty = advertisers['First party'],
      unknown = advertisers['_Unknown'],
      firstPartyCount = firstParty && firstParty.length,
      unknownCount = unknown && unknown.length;
  delete advertisers['First party'];
  delete advertisers['_Unknown'];
  data.module.adblocker.advertisersList.companiesArray = Object.keys(advertisers).map(function (advertiser) {
    var resources = advertisers[advertiser],
        count = resources.length;
    return {
      name: advertiser,
      count: count,
      isInactive: count === 0
    }
  }).sort((a,b) => a.count < b.count);

  if (firstParty) {
    data.module.adblocker.advertisersList.companiesArray.unshift({
      name: 'First Party', // i18n
      count: firstPartyCount,
      isInactive: firstPartyCount === 0
    });
  }
  if (unknown) {
    data.module.adblocker.advertisersList.companiesArray.push({
      name: 'Other', // i18n
      count: unknownCount,
      isInactive: unknownCount === 0
    });
  }
}

function draw(data){
  if(data.onboarding) {
    document.getElementById('control-center').classList.add('onboarding');
    if(data.module.antitracking && data.module.antitracking.totalCount === 1) {
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'core',
        action: 'sendTelemetry',
        args: [{
          type: 'onboarding',
          version: '2.1',
          action: 'show',
          view: 'privacy',
          target: 'dashboard',
        }]
      }), '*');
    }
  }

  if (data.module) {
    if ( !data.module.antitracking ) {
      data.module.antitracking = {};
      data.module.antitracking.visible = true
      data.module.antitracking.state = "critical"
      data.module.antitracking.totalCount = 0
    }
    if ( data.module.antitracking && data.module.antitracking.trackersList) {
      data.module.antitracking.trackersList.companiesArray = compile(data.module.antitracking.trackersList)
    }


    if (data.module.adblocker) {
      compileAdblockInfo(data);
    }
  }

  if(data.debug){
    console.log('Drawing: ', data);
  }

  document.getElementById('control-center').innerHTML = templates['template'](data)
  if(data.securityON){
    document.getElementById('anti-phising').innerHTML = templates['anti-phising'](data);
    document.getElementById('anti-tracking').innerHTML = templates['anti-tracking'](data);

    if(data.amo) {
      document.getElementById('amo-privacy-cc').innerHTML = templates['amo-privacy-cc']();
      document.getElementById('cliqz-tab').innerHTML = templates['cliqz-tab'](data.module.freshtab);
    } else {
      document.getElementById('ad-blocking').innerHTML = templates['ad-blocking'](data);
      document.getElementById('https').innerHTML = templates['https'](data);
    }
  }

  function close_setting_accordion_section() {
    $('.setting-accordion .accordion-active-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.setting-accordion-section-title').on('click', function(e) {
    e.stopPropagation();
    let index = $(this).attr('data-index'),
        url = e.currentTarget.getAttribute('openUrl'),
        target = $(this).attr('data-target'),
        closePopup = e.currentTarget.dataset.closepopup || true;
    //openURL already sends telemetry data
    if($(this).attr('openUrl')) {
      sendMessageToWindow({
        action: 'openURL',
        data: {
          url: url,
          target: target,
          closePopup: closePopup,
          index: index
        }
      });
    } else {
      sendMessageToWindow({
        action: 'sendTelemetry',
        data: {
          target: target,
          action: 'click',
          index: index
        }
      });
    }
  });

  $('.accordion-active-title').click(function(e) {
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
  });

  $('.accordion-section-title').click(function(e) {
    if($(this).attr('data-disabled') == 'true') {
      return;
    }

    e.preventDefault();
    var currentAttrValue = $(this).attr('href'),
        sectionTitle = $(this).closest('.accordion-section-title'),
        state;

    if (sectionTitle.hasClass('active')) {
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

  $('[start-navigation]').on('click', function() {
    var $main = $(this).closest('#control-center'),
        $settings = $('#settings'),
        $othersettings = $main.find('#othersettings'),
        $setting = $(this).closest('.setting'),
        $target = $setting.attr('data-target');

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $target,
        action: 'click'
      }
    });
    close_accordion_section();
    $settings.addClass('open');
    $setting.addClass('active');
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
        type = 'switch',
        dropdown = target.find('.dropdown-scope'),
        dropdownContent = target.find('.new-dropdown-content');

    if (dropdownContent.hasClass('visible')) {
      dropdownContent.toggleClass('visible');
    }
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

  $('.dropdown-btn').on('click', function() {
    $(this).next('.new-dropdown-content').toggleClass('visible');
  });

  $('.dropdown-content-option').on('click', function(ev) {
      var state = $(this).attr('value'),
          target = $(this).closest('.frame-container'),
          option = '.dropdown-content-option',
          content = '.new-dropdown-content',
          $this = $(this);

      target.attr('state', state === 'all' ?
        'critical' : target.attr('inactiveState'));

      $this.siblings(option).each(function(index, elem) {
        $(elem).removeClass('selected')
      });
      $this.addClass('selected')
      $this.parent(content).toggleClass('visible');

      updateGeneralState()
    });

  $('.pause').click(function () {
    // TODO
    localizeDocument();
  });

  $('.clickableLabel').click(function() {
    $(this).siblings('input').click();
  });

  localizeDocument();
  resize();
}

window.draw = draw;
