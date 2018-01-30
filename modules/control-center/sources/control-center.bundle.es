/* global window, document */
/* eslint-disable func-names, no-param-reassign */
import $ from 'jquery';
import Handlebars from 'handlebars';
import { sendMessageToWindow } from './content/data';
import helpers from './content/helpers';
import templates from './templates';

const isAction = location.search.replace('?pageAction=', '') === 'true';
const slideUp = $.fn.slideUp;
const slideDown = $.fn.slideDown;

Handlebars.partials = templates;
function resize() {
  const $controlCenter = $('#control-center');
  const width = $controlCenter.width();
  const height = $controlCenter.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width,
      height
    }
  });
}
$.fn.slideUp = function newSlideUp() {
  const ret = slideUp.call(this, 0);
  resize();
  return ret;
};
$.fn.slideDown = function newSlideDown() {
  const ret = slideDown.call(this, 0);
  resize();
  return ret;
};

function localizeDocument() {
  Array.from(document.querySelectorAll('[data-i18n]'))
    .forEach((el) => {
      const elArgs = el.dataset.i18n.split(',');
      const key = elArgs.shift();

      el.innerHTML = chrome.i18n.getMessage(key, elArgs);
    });
}

function isOnboarding() {
  return $('#control-center').hasClass('onboarding');
}

function closeAccordionSection() {
  $('.accordion .accordion-section-title').removeClass('active');
  $('.accordion .accordion-section-content').slideUp(150).removeClass('open');
}

// ====== GENERIC SETTING ACCORDION FUNCTIONALITY ========= //
$(document).ready(() => {
  Object.keys(helpers).forEach((helperName) => {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {}
  });
});

// open URL
$('#control-center').on('click', '[openUrl]', (ev) => {
  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: ev.currentTarget.getAttribute('openUrl'),
      target: ev.currentTarget.getAttribute('data-target'),
      closePopup: ev.currentTarget.dataset.closepopup || true
    }
  });
});

$('#control-center').on('click', '[data-function]', function (ev) {
  if (isOnboarding()) {
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

$('#control-center').on('click', () => {
  $('.new-dropdown-content').removeClass('visible');
});

$('#control-center').on('change', '[complementarySearchChanger]', function () {
  sendMessageToWindow({
    action: 'complementary-search',
    data: {
      defaultSearch: $(this).val()
    }
  });
});

$('#control-center').on('change', '[searchIndexCountryChanger]', function () {
  sendMessageToWindow({
    action: 'search-index-country',
    data: {
      defaultCountry: $(this).val()
    }
  });
});

$('#control-center').on('click', '[cliqzTabStatusChanger]', function () {
  sendMessageToWindow({
    action: 'cliqz-tab',
    data: {
      status: $(this).closest('.frame-container').attr('state') === 'active'
    }
  });
});


$('#control-center').on('click', '[antiTrackingStatusChanger]', function () {
  let state;
  const type = $(this).attr('data-type');
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('state');
    // make this website default
    const $switches = $(this).closest('.switches');
    const options = $switches.find('.dropdown-content-option');
    const defaultSelect = $switches.find('.dropdown-content-option[data-state="off_website"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
  }

  if (isOnboarding()) {
    return;
  }

  sendMessageToWindow({
    action: 'antitracking-activator',
    data: {
      type,
      state,
      status: $(this).closest('.frame-container').attr('state'),
      hostname: $(this).closest('.frame-container').attr('hostname'),
    }
  });
});

$('#control-center').on('click', '[antiPhishingStatusChanger]', function () {
  let state;
  const type = $(this).attr('data-type');
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('state');
    // make this website default
    const $switches = $(this).closest('.switches');
    const options = $switches.find('.dropdown-content-option');
    const defaultSelect = $switches.find('.dropdown-content-option[data-state="off_website"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
  }

  if (isOnboarding()) {
    return;
  }

  sendMessageToWindow({
    action: 'anti-phishing-activator',
    data: {
      type,
      state,
      status: $(this).closest('.frame-container').attr('state'),
      url: $(this).closest('.frame-container').attr('url'),
    }
  });
});

$('#control-center').on('click', '[adBlockerStatusChanger]', function () {
  let state;
  const type = $(this).attr('data-type');
  const frame = $(this).closest('.frame-container');
  let option;

  if (type === 'switch') {
    state = frame.attr('state');
    option = 'domain';
    // select first option "This domain" by default
    frame.attr('data-visible', 'off_domain');
    const $switches = $(this).closest('.switches');
    const options = $switches.find('.dropdown-content-option');
    const defaultSelect = $switches.find('.dropdown-content-option[data-state="off_domain"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
    option = $(this).attr('value');
  }

  frame.attr('data-visible', $(this).attr('data-state'));
  if (isOnboarding()) {
    return;
  }

  sendMessageToWindow({
    action: 'adb-activator',
    data: {
      type,
      state,
      status: frame.attr('state'),
      url: frame.attr('url'),
      // TODO instead of dropdown-scope selece the active button
      option
    }
  });
});

// select box change
$('#control-center').on('change', 'select[updatePref]', (ev) => {
  sendMessageToWindow({
    action: 'updatePref',
    data: {
      pref: ev.currentTarget.getAttribute('updatePref'),
      value: ev.currentTarget.value,
      target: ev.currentTarget.getAttribute('data-target'),
      prefType: ev.currentTarget.getAttribute('updatePrefType'),
    }
  });
});

function updateGeneralState() {
  const states = Array.from(document.querySelectorAll('.frame-container.anti-tracking'))
    .map(el => el.getAttribute('state'));
  let state = 'active';

  if (states.indexOf('critical') !== -1) {
    state = 'critical';
  } else if (states.indexOf('inactive') !== -1) {
    state = 'inactive';
  }

  $('#header').attr('state', state);
  if (isOnboarding()) {
    return;
  }
  sendMessageToWindow({
    action: 'updateState',
    data: state
  });
}

function compile(obj) {
  return Object.keys(obj.companies)
    .map((companyName) => {
      const domains = obj.companies[companyName];
      const trackerSlug = obj.companyInfo[companyName].wtm || '../tracker-not-found';
      const company = {
        name: companyName,
        watchDogUrl: `https://whotracks.me/trackers/${trackerSlug}.html`,
        domains: domains.map((domain) => {
          const domainData = obj.trackers[domain];
          return {
            domain,
            count: (domainData.cookie_blocked || 0) + (domainData.tokens_removed || 0)
          };
        }).sort((a, b) => b.count - a.count),
        count: 0
      };
      company.count = company.domains.reduce((prev, curr) => prev + curr.count, 0);
      company.isInactive = company.count === 0;
      return company;
    })
    .sort((a, b) => b.count - a.count);
}

function compileAdblockInfo(data) {
  const advertisersList = data.module.adblocker.advertisersList;
  const advertisers = data.module.adblocker.advertisersList;
  const firstParty = advertisers['First party'];
  const unknown = advertisers._Unknown;
  const firstPartyCount = firstParty && firstParty.length;
  const unknownCount = unknown && unknown.length;

  delete advertisers['First party'];
  delete advertisers._Unknown;
  advertisersList.companiesArray = Object.keys(advertisers)
    .map((advertiser) => {
      const count = advertisers[advertiser].length;
      return {
        count,
        name: advertiser,
        isInactive: count === 0
      };
    }).sort((a, b) => a.count < b.count);

  if (firstParty) {
    advertisersList.companiesArray.unshift({
      name: 'First Party', // i18n
      count: firstPartyCount,
      isInactive: firstPartyCount === 0
    });
  }
  if (unknown) {
    advertisersList.companiesArray.push({
      name: 'Other', // i18n
      count: unknownCount,
      isInactive: unknownCount === 0
    });
  }
}

function draw(data) {
  const emptyFrame = Object.keys(data.module || {}).length === 0;
  const module = data.module;

  if (data.onboarding) {
    document.getElementById('control-center').classList.add('onboarding');
    if (module.antitracking && module.antitracking.totalCount === 1) {
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

  if (module) {
    if (!module.antitracking) {
      module.antitracking = {
        visible: true,
        state: 'active',
        totalCount: 0
      };
    }
    if (module.antitracking && module.antitracking.trackersList) {
      module.antitracking.trackersList.companiesArray = compile(module.antitracking.trackersList);
    }

    if (module.adblocker) {
      compileAdblockInfo(data);
    }
  }

  if (data.debug) {
    /* eslint-disable no-console */
    console.log('Drawing: ', data, JSON.stringify(data));
    /* eslint-enable no-console */
  }

  // in the funnelCake build other settings are only visible in the browser-action popup
  data.showOtherSettings = data.funnelCake ? isAction : true;
  // in the funnelCake build security settings are only visible in the normal popup
  data.showSecuritySettings = data.funnelCake ? !isAction : true;
  // history settings are hidden in teh funnelCake build
  data.showHistorySettings = !data.funnelCake;
  // tipps button is hidden for funnelcake page-action popup
  data.showTipps = data.funnelCake ? isAction : true;

  const cc = document.getElementById('control-center');
  if (cc.unsafeSetInnerHTML) {
    cc.unsafeSetInnerHTML(templates.template(data));
  } else {
    cc.innerHTML = templates.template(data);
  }

  function closeSettingAccordionSection() {
    $('.setting-accordion .accordion-active-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.setting-accordion-section-title').on('click', function (e) {
    e.stopPropagation();
    const index = $(this).attr('data-index');
    const url = e.currentTarget.getAttribute('openUrl');
    const target = $(this).attr('data-target');
    const closePopup = e.currentTarget.dataset.closepopup || true;
    // openURL already sends telemetry data
    if ($(this).attr('openUrl')) {
      sendMessageToWindow({
        action: 'openURL',
        data: {
          url,
          target,
          closePopup,
          index
        }
      });
    } else {
      sendMessageToWindow({
        action: 'sendTelemetry',
        data: {
          target,
          action: 'click',
          index
        }
      });
    }
  });

  $('.accordion-active-title').click(function (e) {
    e.preventDefault();
    const currentAttrValue = $(this).attr('href');

    if ($(e.target).is('.active') || ($(e.target)[0].parentElement.className === 'accordion-active-title active')) {
      closeSettingAccordionSection();
    } else {
      closeSettingAccordionSection();
      $(this).addClass('active');
      $(`.setting-accordion ${currentAttrValue}`).slideDown(150).addClass('open');
    }
  });

  $('.accordion-section-title').click(function (e) {
    if ($(this).attr('data-disabled') === 'true') {
      return;
    }

    e.preventDefault();
    const currentAttrValue = $(this).attr('href');
    const sectionTitle = $(this).closest('.accordion-section-title');
    let state;

    if (sectionTitle.hasClass('active')) {
      closeAccordionSection();
      state = 'collapsed';
    } else {
      closeAccordionSection();
      $(this).addClass('active');
      $(`.accordion ${currentAttrValue}`).slideDown(150).addClass('open');
      state = 'expanded';
    }

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $(this).attr('data-target'),
        state,
        action: 'click'
      }
    });
  });

  $('[start-navigation]').on('click', function () {
    const $main = $(this).closest('#control-center');
    const $settings = $('#settings');
    const $othersettings = $main.find('#othersettings');
    const $setting = $(this).closest('.setting');
    const $target = $setting.attr('data-target');
    const $container = $(this).closest('.frame-container');

    if ($container.attr('state') !== 'active') {
      return; // Disable clicking on inactive module
    }

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: $target,
        action: 'click'
      }
    });
    closeAccordionSection();
    $settings.addClass('open');
    $setting.addClass('active');
    $othersettings.css('display', 'none');
    resize();
  });

  $('.cross').click(function (e) {
    e.stopPropagation();
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
    resize();
  });

  $('.cqz-switch-label, .cqz-switch-grey').click(function () {
    const target = $(this).closest('.bullet');
    target.attr('state',
      (idx, attr) => (attr !== 'active' ? 'active' : target.attr('inactiveState'))
    );

    if (this.hasAttribute('updatePref')) {
      sendMessageToWindow({
        action: 'updatePref',
        data: {
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') === 'active',
          target: this.getAttribute('data-target')
        }
      });
    }
  });

  $('.cqz-switch').click(function () {
    const target = $(this).closest('.frame-container');
    const type = 'switch';
    const dropdownContent = target.find('.new-dropdown-content');

    if (dropdownContent.hasClass('visible')) {
      dropdownContent.toggleClass('visible');
    }
    target.attr('state',
      (idx, attr) => (attr !== 'active' ? 'active' : target.attr('inactiveState'))
    );

    if (this.hasAttribute('updatePref')) {
      if (isOnboarding()) {
        return;
      }

      sendMessageToWindow({
        action: 'updatePref',
        data: {
          type,
          target: `${target.parent().attr('data-target')}_${type}`,
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') === 'active'
        }
      });
    }

    updateGeneralState();
  });

  $('.dropdown-btn').on('click', function (ev) {
    $('.new-dropdown-content').not($(this).next('.new-dropdown-content')).removeClass('visible');
    $(this).next('.new-dropdown-content').toggleClass('visible');
    ev.stopPropagation();
  });

  $('.dropdown-content-option').on('click', function () {
    const state = $(this).attr('value');
    const target = $(this).closest('.frame-container');
    const option = '.dropdown-content-option';
    const content = '.new-dropdown-content';
    const $this = $(this);

    target.attr('state', state === 'all' ?
      'critical' : target.attr('inactiveState'));

    $this.siblings(option).each((index, elem) => {
      $(elem).removeClass('selected');
    });
    $this.addClass('selected');
    $this.parent(content).toggleClass('visible');

    updateGeneralState();
  });

  $('.pause').click(() => {
    // TODO
    localizeDocument();
  });

  $('.clickableLabel').click(function () {
    $(this).siblings('input').click();
  });

  localizeDocument();

  if (!emptyFrame) {
    resize();
  }
}

window.draw = draw;
