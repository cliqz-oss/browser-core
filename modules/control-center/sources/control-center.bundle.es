/* global window, document, $, Handlebars */
/* eslint-disable func-names, no-param-reassign */
/* eslint import/no-extraneous-dependencies: 'off' */
import helpers from './content/helpers';
import templates from './templates';
import createSpananForModule from '../core/helpers/spanan-module-wrapper';

const controlCenterModule = createSpananForModule('control-center');
const controlCenter = controlCenterModule.createProxy();
const isPrivateMode = !!(chrome && chrome.extension && chrome.extension.inIncognitoContext);

Handlebars.partials = templates;

function localizeDocument() {
  Array.from(document.querySelectorAll('[data-i18n]'))
    .forEach((el) => {
      const elArgs = el.dataset.i18n.split(',');
      const key = elArgs.shift();

      el.innerHTML = chrome.i18n.getMessage(key, elArgs);
    });
}

function closeAccordionSection() {
  $('.accordion .accordion-section-title').removeClass('active');
  $('.accordion .accordion-section-content').slideUp(150, () => {
    document.body.classList.remove('j-vscroll-on-demand');
  }).removeClass('open');
}

// open URL
$('#control-center').on('click', '[data-open-url]', (ev) => {
  controlCenter.openURL({
    isPrivateMode,
    url: ev.currentTarget.getAttribute('data-open-url'),
    target: ev.currentTarget.getAttribute('data-target'),
    closePopup: ev.currentTarget.dataset.closepopup || true
  });
});

$('#control-center').on('click', '[data-function]', function (ev) {
  const fn = ev.currentTarget.dataset.function;
  controlCenter[fn]({
    isPrivateMode,
    status: $(this).prop('checked'),
    target: ev.currentTarget.getAttribute('data-target')
  });
});

$('#control-center').on('click', () => {
  $('.new-dropdown-content').removeClass('visible');
});

$('#control-center').on('change', '[role="complementarySearchChanger"]', function () {
  controlCenter['complementary-search']({
    isPrivateMode,
    defaultSearch: $(this).val()
  });
});

$('#control-center').on('change', '[role="searchIndexCountryChanger"]', function () {
  controlCenter['search-index-country']({
    isPrivateMode,
    defaultCountry: $(this).val()
  });
});

$('#control-center').on('change', '[role="quickSearchStateChanger"]', function () {
  // $(this).closest('.bullet').addClass('disabled'); // For debugging
  controlCenter['quick-search-state']({
    isPrivateMode,
    enabled: $(this).val() === 'true'
  }).then(draw); // eslint-disable-line
});

$('#control-center').on('click', '[role="cliqzTabStatusChanger"]', function () {
  controlCenter['cliqz-tab']({
    isPrivateMode,
    status: $(this).closest('.frame-container').attr('data-status') === 'active'
  });
});

$('#control-center').on('click', '[role="antiTrackingStatusChanger"]', function () {
  let state;
  const type = $(this).attr('data-type');
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('data-status');
    // make this website default
    const $switches = $(this).closest('.switches');
    const options = $switches.find('.dropdown-content-option');
    const defaultSelect = $switches.find('.dropdown-content-option[data-state="off_website"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
  }

  controlCenter['antitracking-activator']({
    isPrivateMode,
    type,
    state,
    status: $(this).closest('.frame-container').attr('data-status'),
    hostname: $(this).closest('.frame-container').attr('data-hostname'),
  });
});

$('#control-center').on('click', '[role="antiPhishingStatusChanger"]', function () {
  let state;
  const type = $(this).attr('data-type');
  if (type === 'switch') {
    state = $(this).closest('.frame-container').attr('data-status');
    // make this website default
    const $switches = $(this).closest('.switches');
    const options = $switches.find('.dropdown-content-option');
    const defaultSelect = $switches.find('.dropdown-content-option[data-state="off_website"]');
    options.removeClass('selected');
    defaultSelect.addClass('selected');
  } else {
    state = $(this).attr('data-state');
  }

  controlCenter['anti-phishing-activator']({
    isPrivateMode,
    type,
    state,
    status: $(this).closest('.frame-container').attr('data-status'),
    url: $(this).closest('.frame-container').attr('data-url'),
  });
});

$('#control-center').on('click', '[role="adBlockerStatusChanger"]', function () {
  let state;
  const type = $(this).attr('data-type');
  const frame = $(this).closest('.frame-container');
  let option;

  if (type === 'switch') {
    state = frame.attr('data-status');
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

  controlCenter['adb-activator']({
    isPrivateMode,
    type,
    state,
    status: frame.attr('data-status'),
    url: frame.attr('data-url'),
    // TODO instead of dropdown-scope select the active button
    option
  });
});

// select box change
$('#control-center').on('change', 'select[data-update-pref]', (ev) => {
  controlCenter.updatePref({
    isPrivateMode,
    pref: ev.currentTarget.getAttribute('data-update-pref'),
    value: ev.currentTarget.value,
    target: ev.currentTarget.getAttribute('data-target'),
    prefType: ev.currentTarget.getAttribute('data-update-pref-type'),
  });
});

function updateGeneralState() {
  const states = Array.from(document.querySelectorAll('.frame-container.anti-tracking'))
    .map(el => el.getAttribute('data-status'));
  let state = 'active';

  if (states.indexOf('critical') !== -1) {
    state = 'critical';
  } else if (states.indexOf('inactive') !== -1) {
    state = 'inactive';
  }

  $('#header').attr('data-status', state);

  controlCenter.updateState(state);
}

function _getWatchDogUrl(company = {}) {
  const slug = company.wtm || '../tracker-not-found';
  return `https://whotracks.me/trackers/${slug}.html`;
}

function compile(obj) {
  return Object.keys(obj.companies)
    .map((companyName) => {
      const domains = obj.companies[companyName];
      const company = {
        name: companyName,
        watchDogUrl: _getWatchDogUrl(obj.companyInfo[companyName]),
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
  const advertisersList = data.module.adblocker.advertisersList || {};
  const advertisersInfo = data.module.adblocker.advertisersInfo;
  const advertisers = data.module.adblocker.advertisersList || {};
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
        isInactive: count === 0,
        watchDogUrl: _getWatchDogUrl(advertisersInfo[advertiser]),

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
  const module = data.module;

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

  data.showSecuritySettings = !data.compactView;
  // tipps button is hidden for compactView
  data.showTipps = !data.compactView;

  const cc = document.getElementById('control-center');
  cc.innerHTML = templates.template(data);

  if (data.compactView) {
    $('#control-center').addClass('isCompact');
  }

  function closeSettingAccordionSection() {
    $('.setting-accordion .accordion-active-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150, () => {
      document.body.classList.remove('j-vscroll-on-demand');
    }).removeClass('open');
  }

  $('.setting-accordion-section-title').on('click', function (e) {
    e.stopPropagation();
    const index = $(this).attr('data-index');
    const url = e.currentTarget.getAttribute('data-open-url');
    const target = $(this).attr('data-target');
    const closePopup = e.currentTarget.dataset.closepopup || true;
    // openURL already sends telemetry data
    if ($(this).attr('data-open-url')) {
      controlCenter.openURL({
        isPrivateMode,
        url,
        target,
        closePopup,
        index
      });
    } else if (!isPrivateMode) {
      controlCenter.sendTelemetry({
        target,
        action: 'click',
        index
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
      const $slideDownItem = $(`.setting-accordion ${currentAttrValue}`);
      $slideDownItem.slideDown(150, () => {
        // #FF_resize_issue
        // FF has an issue regarding to resize of WebExtension window depending on its' content.
        // It is never greater than 800 pixels in height.
        // So we assign a value of 'auto' to overflowY for cases if document.body.scrollHeight is
        // greather than document.body.clientHeight.
        // A user could then decide whether to scroll down to see other options or not.
        document.body.classList.add('j-vscroll-on-demand');
      });
      $slideDownItem.addClass('open');
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
      const $slideDownItem = $(`.accordion ${currentAttrValue}`);
      $slideDownItem.slideDown(150, () => {
        // #FF_resize_issue
        document.body.classList.add('j-vscroll-on-demand');
      });
      $slideDownItem.addClass('open');
      state = 'expanded';
    }
    if (!isPrivateMode) {
      controlCenter.sendTelemetry({
        target: $(this).attr('data-target'),
        state,
        action: 'click'
      });
    }
  });

  $('[data-start-navigation]').on('click', function () {
    const $main = $(this).closest('#control-center');
    const $settings = $('#settings');
    const $othersettings = $main.find('#othersettings');
    const $setting = $(this).closest('.setting');
    const $target = $setting.attr('data-target');
    const $container = $(this).closest('.frame-container');

    if ($container.attr('data-status') !== 'active') {
      return; // Disable clicking on inactive module
    }

    if (!isPrivateMode) {
      controlCenter.sendTelemetry({
        target: $target,
        action: 'click'
      });
    }

    closeAccordionSection();
    $settings.addClass('open');
    $setting.addClass('active');
    $othersettings.css('display', 'none');
  });

  $('.cross').click(function (e) {
    e.stopPropagation();
    $(this).closest('.setting').removeClass('active');
    $('#othersettings').css('display', 'block');
    $('#settings').removeClass('open');
    if (!isPrivateMode) {
      controlCenter.sendTelemetry({
        target: $(this).attr('data-target'),
        action: 'click'
      });
    }
  });

  $('.cqz-switch-label, .cqz-switch-grey').click(function () {
    const target = $(this).closest('.bullet');
    target.attr('data-status',
      (idx, attr) => (attr !== 'active' ? 'active' : target.attr('data-inactiveState')));

    if (this.hasAttribute('data-update-pref')) {
      controlCenter.updatePref({
        isPrivateMode,
        pref: this.getAttribute('data-update-pref'),
        value: target.attr('data-status') === 'active',
        target: this.getAttribute('data-target')
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
    target.attr('data-status',
      (idx, attr) => (attr !== 'active' ? 'active' : target.attr('data-inactiveState')));

    if (this.hasAttribute('data-update-pref')) {
      controlCenter.updatePref({
        isPrivateMode,
        type,
        target: `${target.parent().attr('data-target')}_${type}`,
        pref: this.getAttribute('data-update-pref'),
        value: target.attr('data-status') === 'active'
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

    target.attr('data-status', state === 'all'
      ? 'critical'
      : target.attr('data-inactiveState'));

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

  $('.cc-tooltip').tooltipster({
    theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
    animationDuration: 150,
  });
}

function getSearchParam(param) {
  const URLSearchParams = window.URLSearchParams;
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(param);
}

// ====== GENERIC SETTING ACCORDION FUNCTIONALITY ========= //
$(document).ready(() => {
  Object.keys(helpers).forEach((helperName) => {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  controlCenter.getFrameData().then(() => {
    controlCenter.getData().then((data) => {
      const isCompactView = getSearchParam('compactView');
      if (isCompactView) {
        data.compactView = true;
      }
      // remove the loader div once the content is populated
      document.getElementById('loader').remove();
      draw(data);
      window.postMessage('{ "ready": true }', '*');
    });
  });
});
