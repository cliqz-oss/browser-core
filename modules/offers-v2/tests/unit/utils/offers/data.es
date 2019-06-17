const VALID_CATEGORY = {
  name: 'cat1',
  timeRangeSecs: 900,
  patterns: [
    'http://www.domain1.de/',
    'http://www.google.co.uk/',
  ],
  revHash: 'f91dd7bd96',
  activationData: {
    activationTimeSecs: 86400,
    args: { totNumHits: 1 },
    func: 'simpleCount'
  },
  user_group: 0
};

const VALID_OFFER_LANDING_URL = 'https://github.com/cliqz/aws-infrastructure-data';
const VALID_OFFER_SUCCESS_URL = 'https://github.com/cliqz/socorro';

const VALID_OFFER_OBJ = {
  action_info: {
    on_click: 'https://www.cliqz.com'
  },
  campaign_id: 'cid_1',
  client_id: 'client-1',
  display_id: 'x-d',
  filterRules: {
    eval_expression: "generic_comparator('offer_closed','l_u_ts','>=',30) "
      + "&& generic_comparator('offer_shown','counter','<=',5)",
  },
  offer_id: 'x',
  rule_info: {
    display_time_secs: 999999,
    type: 'exact_match',
    url: []
  },
  ui_info: {
    template_data: {
      call_to_action: {
        target: '',
        text: 'Jetzt Anfordern',
        url: 'http://newurl'
      },
      conditions: 'Some conditions',
      desc: 'Some description',
      title: 'This is the title',
      headline: 'Ihr 10% Rabatt wurde erfolgreich gesichert.',
      labels: [
        'exclusive'
      ],
      logo_class: 'long',
      logo_url: 'https://cdn.cliqz.com/extension/offers/test/resources/some-folder/some-logo.png',
      picture_url: 'https://cdn.cliqz.com/extension/offers/test/resources/some-folder/some-picture.png',
      voucher_classes: '',
      validity: Date.now() / 1000 + 60 * 60 * 24 * 30,
    },
    template_name: 'ticket_template'
  },
  monitorData: [
    {
      params: {
        filter_last_secs: 5,
        referrer_cat: true,
        store: false
      },
      patterns: [`||${VALID_OFFER_LANDING_URL.replace('https://', '')}$script`],
      signalID: 'landing',
      type: 'urlchange',
    },
    {
      params: {
        filter_last_secs: 5,
        referrer_cat: true,
        store: false
      },
      patterns: [`||${VALID_OFFER_SUCCESS_URL.replace('https://', '')}$script`],
      signalID: 'success',
      type: 'urlchange',
    },
  ],
  rs_dest: ['offers-cc'],
  types: ['type1', 'type2'],
  displayPriority: 0.0,
  version: '',
  categories: [VALID_CATEGORY.name],
  targeted: true,
};

// Offer of the week
const VALID_OOTW_OFFER_OBJ = {
  offer_id: 'Blackfriday_OOTW_Cliqz_TG1_O1_V1',
  campaign_id: 'Blackfriday_OOTW_Cliqz',
  display_id: 'Blackfriday_OOTW_Cliqz_TG1_O1_V1_D',
  types: [
    'Blackfriday_OOTW_Cliqz'
  ],
  rs_dest: [
    'offers-cc'
  ],
  version: '3e863926384ff274b52beb3288a1015402e05f9b',
  monitorData: [],
  ui_info: {
    notif_type: 'pop-up',
    styles: {
      'call-to-action-bg-color': '#e741',
      'call-to-action-color': '#fff'
    },
    template_data: {
      benefit: 'Bis zu 60%',
      call_to_action: {
        target: '',
        text: 'JETZT ANGEBOTE ENTDECKEN',
        url: 'https://blackfriday.cliqz.com/'
      },
      conditions: 'Verf\u00fcgbar bis einschlie\u00dflich 26.11.2018',
      desc: 'Hol das Beste f\u00fcr dich raus!',
      headline: 'sparen mit den Black-Friday-Angeboten deiner Lieblingsmarken',
      labels: [
        'offer_of_the_week'
      ],
      logo_class: 'square',
      logo_url: 'https://cdn.cliqz.com/extension/offers/test/resources/blackfriday-ootw-cliqz/blackfriday-ootw-cliqz-logo-square-1542724033.png',
      picture_url: 'https://cdn.cliqz.com/extension/offers/test/resources/blackfriday-ootw-cliqz/blackfriday-ootw-cliqz-picture-1542723902.png',
      title: 'sparen mit den Black-Friday-Angeboten deiner Lieblingsmarken',
      validity: Date.now() / 1000 + 60 * 60 * 24 * 30,
    },
    template_name: 'ticket_template'
  },
  displayPriority: 1,
  rule_info: {
    display_time_secs: 1200,
    type: 'exact_match',
    url: []
  },
  filterRules: {
    eval_expression: 'generic_comparator(\'offer_pushed\',\'counter\',\'<=\',0)'
  },
  expirationMs: 305993000,
  user_group: 0,
  targeted: false
};

module.exports = {
  VALID_CATEGORY,
  VALID_OFFER_LANDING_URL,
  VALID_OFFER_SUCCESS_URL,
  VALID_OFFER_OBJ: Object.freeze(VALID_OFFER_OBJ),
  VALID_OOTW_OFFER_OBJ: Object.freeze(VALID_OOTW_OFFER_OBJ),
};
