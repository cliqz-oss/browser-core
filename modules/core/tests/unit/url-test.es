/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const URLS = [
  'http://cliqz.com',
  'http://www.cliqz.com',
  'http://userid:password@example.com:8080',
  'http://foo.com/blah_blah_(wikipedia)_(again)#cite-1',
  'http://www.example.com/foo/?bar=baz&inga=42&quux',
  'http://✪df.ws/123',
  'http://userid@example.com',
  'http://userid@example.com:8080/',
  'http://userid:password@example.com',
  'http://➡.ws/䨹',
  'http://⌘.ws',
  'http://⌘.ws/',
  'http://foo.com/unicode_(✪)_in_parens',
  'http://foo.com/(something)?after=parens',
  'http://☺.damowmow.com/',
  'http://code.google.com/events/#&product=browser',
  'http://foo.bar/baz',
  'http://foo.bar/?q=Test%20URL-encoded%20stuff',
  'http://مثال.إختبار',
  'http://例子.测试',
  'http://उदाहरण.परीक्षा',
  "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com",

  // short url
  'http://j.mp',
  'https://t.co/2Y2tPh0TuJ/',

  // ip
  'http://142.42.1.1',
  'http://142.42.1.1:8080',
  'http://223.255.255.254',
  'http://[2001:4860:0:2001::68]/',
  'https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/',

  // url with known protocol
  'ftp://ftp.mozilla.org/pub/firefox/',
  'file:///etc/passwd',
  'chrome://cliqz/content/adblocker/index.html',
  'moz-extension://f4091876df6a5d39e6690b7395a95399/index.html',
  'about:blank',
  'mailto:Cliqz <info@cliqz.com>',
  'view-source:https://cliqz.com',
  'data:text/plain,hello',
  'data:text,hello',
  'resource://devtools-client-jsonview/',

  // urls without protocols
  'cliqz.com',
  'www.cliqz.com',
  'userid:password@example.com:8080',
  'foo.com/blah_blah_(wikipedia)_(again)#cite-1',
  'www.example.com/foo/?bar=baz&inga=42&quux',
  '✪df.ws/123',
  'userid@example.com',
  'userid@example.com:8080/',
  'userid:password@example.com',
  '➡.ws/䨹',
  '⌘.ws',
  '⌘.ws/',
  'foo.com/unicode_(✪)_in_parens',
  'foo.com/(something)?after=parens',
  '☺.damowmow.com/',
  'code.google.com/events/#&product=browser',
  'foo.bar/baz',
  'foo.bar/?q=Test%20URL-encoded%20stuff',
  'مثال.إختبار',
  '例子.测试',
  'उदाहरण.परीक्षा',
  "-.~_!$&'()*+,;=:%40:80%2f::::::@example.com",
  '1337.net',
  'a.d-b.de',

  // short URLs
  'j.mp',
  't.co/2Y2tPh0TuJ/',

  // ip
  '142.42.1.1/',
  '142.42.1.1:8080',
  '223.255.255.254',
  '[2001:4860:0:2001::68]',
  '[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/',

  // invalid, but fixable
  'https://cliqz.com.',
  'https://cliqz.com. ',
  'http://192.168.1.1.',
  'cliqz.com.',
  'cliqz.com. ',
  '192.168.1.1.',

  // ALLCAPS
  'HTTP://WWW.EXAMPLE.COM/FOO/?BAR=BAZ&INGA=42&QUUX',
  'FILE:///ETC/PASSWD',
  'MAILTO:CLIQZ <INFO@CLIQZ.COM>',
  'VIEW-SOURCE:HTTPS://CLIQZ.COM',
  'DATA:TEXT/PLAIN,HELLO',

  // special exception
  'localhost',
  'LOCALHOST',

  // known protocol + host, or host + port
  'http:localhost',
  'http:localhost:4300',
  'http:weird-local-domain.dev',
  'maghratea:8080',
  'cliqz-test:4300',

  // other weirdness
  'http://www.f',
  'http:////a',
];

const QUERIES = [
  // search query
  'cliqz',
  'google.com is a suspicious site',
  'how do I go to facebook.com?',
  'owner of someone@gmail.com',
  'undefined',

  // search alias
  '#go youtube.com',

  // bad url
  'cliqz,com',
  'cliqz.c om',
  'cliqz.c/om',
  'cliqz.com..',
  'cliqz.com.. ',
  'cliqz.com. .',
  'cliqz.c',
  'i.e',
  '-cliqz.com',
  'cliqz-.cat',
  'cliqz-.com',
  '.www.foo.bar.',
  'about:',
  'https://?query=0#top',
  'http:// shouldfail.com',
  'https://@_@_@_@_@',
  'http://facebok.com is a fishing site',

  // unknown protocol
  'abc://cliqz.com',
  "KeyError: 'credential_provider'",

  // bad port
  'warhammer:40k',
  // '192.168.1.1:65536',
  // 'www.bild.de:0',

  // unicode in hostname and no protocol or TLD
  'Wiedźmin_3:Dziki_Gon',
];

const URL_VARIANTS = [
  {
    title: 'trailing slash',
    params: {
      protocol: false,
      www: false,
    },
    should: {
      'http://cliqz.com/': ['http://cliqz.com/', 'http://cliqz.com'],
      'http://cliqz.com/path/name/': ['http://cliqz.com/path/name/', 'http://cliqz.com/path/name'],
      'http://cliqz.com/path/?search=1': ['http://cliqz.com/path/?search=1', 'http://cliqz.com/path?search=1'],
      'http://cliqz.com/path/#hash=xxx': ['http://cliqz.com/path/#hash=xxx', 'http://cliqz.com/path#hash=xxx'],
    },
    shouldnt: {
      'http://cliqz.com/': ['http://www.cliqz.com/', 'https://cliqz.com/'],
      'http://cliqz.com/path?x=1': ['http://cliqz.com/path?x=1/', 'http://cliqz.com/path/?x=1/'],
    }
  },
  {
    title: 'www',
    params: {
      protocol: false,
      www: true,
    },
    should: {
      'http://cliqz.com': [
        'http://cliqz.com', 'http://www.cliqz.com/',
        'http://www.cliqz.com', 'http://cliqz.com/',
      ],
    },
    shouldnt: {
      'http://cliqz.com': ['https://cliqz.com'],
    },
  },
  {
    title: 'protocol',
    params: {
      protocol: true,
      www: false,
    },
    should: {
      'http://cliqz.com': ['http://cliqz.com', 'https://cliqz.com', 'http://cliqz.com/', 'https://cliqz.com/'],
      'ftp://cliqz.com': ['ftp://cliqz.com', 'ftp://cliqz.com/'],
    },
    shouldnt: {
      'http://cliqz.com': ['http://www.cliqz.com', 'https://www.cliqz.com'],
      'ftp://cliqz.com': ['http://cliqz.com', 'https://www.cliqz.com'],
    },
  },
  {
    title: 'protocol, www, and trailing slash',
    params: {
      protocol: true,
      www: true,
    },
    should: {
      'http://cliqz.com': [
        'http://cliqz.com', 'https://cliqz.com',
        'http://cliqz.com/', 'https://cliqz.com/',
        'http://www.cliqz.com', 'https://www.cliqz.com',
        'http://www.cliqz.com/', 'https://www.cliqz.com/',
      ],
    },
    shouldnt: {},
  }
];

const plainUrls = [
  {
    url: 'https://cliqz.com',
    url_parts: {
      username: '',
      protocol: 'https',
      hostname: 'cliqz.com',
      path: '/',
      query: '',
      query_keys: {},
      password: '',
    }
  },
  {
    url: 'https://ssl.bbc.co.uk/frameworks/fig/1/fig.js',
    url_parts: {
      username: '',
      protocol: 'https',
      hostname: 'ssl.bbc.co.uk',
      path: '/frameworks/fig/1/fig.js',
      query: '',
      query_keys: {},
      password: '',
    }
  },
  {
    url: 'http://www.bbc.co.uk/wwscripts/flag',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'www.bbc.co.uk',
      path: '/wwscripts/flag',
      query: '',
      query_keys: {},
      password: '',
    }
  }];

const queryStrings = [
  {
    url: 'http://pubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=1810614703467044&output=json_html&callback=googletag.impl.pubads.setAdContentsBySlotForSync&impl=ss&json_a=1&eid=108809047%2C108809030%2C108809035%2C108809050&sc=0&sfv=1-0-2&iu_parts=4817%2Cbbccom.live.site.news%2Csport_live_content&enc_prev_ius=%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2&prev_iu_szs=1x1%2C728x90%7C970x300%7C970x250%7C970x90%7C970x66%7C940x230%7C930x180%7C844x179%2C300x250%7C300x600%7C300x1050%2C1x1&ists=1&prev_scp=slot%3Dwallpaper%7Cslot%3Dleaderboard%26sl%3Dtop%7Cslot%3Dmpu%26sl%3Dmiddle%7Cslot%3Dinterstitial&cust_params=kuid%3Dptbex8ffm%26khost%3Dwww.bbc.com%26frd%3D1%26channel%3Dsport%26sectn%3Dlive%26subsect%3Dcricket%26domain%3Dwww.bbc.com%26story_id%3D32809781%26ctype%3Dcontent%26asset_type%3Dlive_event%26referrer%3Dsport0%26referrer_domain%3Dwww.bbc.com%26esi%3D0&cookie=ID%3D2cdd06c7dff60cd5%3AT%3D1438088344%3AS%3DALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g&lmt=1438251866&dt=1438251866165&frm=20&biw=1132&bih=683&oid=3&adks=4009376745%2C679768530%2C2444114410%2C834144271&gut=v2&ifi=1&u_tz=120&u_his=4&u_h=900&u_w=1440&u_ah=828&u_aw=1440&u_cd=24&u_nplug=2&u_nmime=39&u_sd=2&flash=0&url=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ref=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F&dssz=71&icsg=134217728&std=5&csl=183&vrg=68&vrp=68&ga_vid=1104604060.1437652108&ga_sid=1438251866&ga_hid=1225307609',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'pubads.g.doubleclick.net',
      path: '/gampad/ads',
      query: 'gdfp_req=1&correlator=1810614703467044&output=json_html&callback=googletag.impl.pubads.setAdContentsBySlotForSync&impl=ss&json_a=1&eid=108809047%2C108809030%2C108809035%2C108809050&sc=0&sfv=1-0-2&iu_parts=4817%2Cbbccom.live.site.news%2Csport_live_content&enc_prev_ius=%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2&prev_iu_szs=1x1%2C728x90%7C970x300%7C970x250%7C970x90%7C970x66%7C940x230%7C930x180%7C844x179%2C300x250%7C300x600%7C300x1050%2C1x1&ists=1&prev_scp=slot%3Dwallpaper%7Cslot%3Dleaderboard%26sl%3Dtop%7Cslot%3Dmpu%26sl%3Dmiddle%7Cslot%3Dinterstitial&cust_params=kuid%3Dptbex8ffm%26khost%3Dwww.bbc.com%26frd%3D1%26channel%3Dsport%26sectn%3Dlive%26subsect%3Dcricket%26domain%3Dwww.bbc.com%26story_id%3D32809781%26ctype%3Dcontent%26asset_type%3Dlive_event%26referrer%3Dsport0%26referrer_domain%3Dwww.bbc.com%26esi%3D0&cookie=ID%3D2cdd06c7dff60cd5%3AT%3D1438088344%3AS%3DALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g&lmt=1438251866&dt=1438251866165&frm=20&biw=1132&bih=683&oid=3&adks=4009376745%2C679768530%2C2444114410%2C834144271&gut=v2&ifi=1&u_tz=120&u_his=4&u_h=900&u_w=1440&u_ah=828&u_aw=1440&u_cd=24&u_nplug=2&u_nmime=39&u_sd=2&flash=0&url=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ref=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F&dssz=71&icsg=134217728&std=5&csl=183&vrg=68&vrp=68&ga_vid=1104604060.1437652108&ga_sid=1438251866&ga_hid=1225307609',
      query_keys: {
        flash: '0',
        u_his: '4',
        u_nmime: '39',
        enc_prev_ius: '/0/1/2,/0/1/2,/0/1/2,/0/1/2',
        icsg: '134217728',
        correlator: '1810614703467044',
        ga_hid: '1225307609',
        csl: '183',
        output: 'json_html',
        u_h: '900',
        prev_scp: 'slot=wallpaper|slot=leaderboard&sl=top|slot=mpu&sl=middle|slot=interstitial',
        frm: '20',
        prev_iu_szs: '1x1,728x90|970x300|970x250|970x90|970x66|940x230|930x180|844x179,300x250|300x600|300x1050,1x1',
        gdfp_req: '1',
        ists: '1',
        u_w: '1440',
        u_sd: '2',
        ref: 'http://www.bbc.com/sport/0/',
        ga_vid: '1104604060.1437652108',
        vrp: '68',
        bih: '683',
        sfv: '1-0-2',
        u_cd: '24',
        oid: '3',
        lmt: '1438251866',
        adks: '4009376745,679768530,2444114410,834144271',
        u_ah: '828',
        json_a: '1',
        vrg: '68',
        ga_sid: '1438251866',
        biw: '1132',
        dt: '1438251866165',
        cust_params: 'kuid=ptbex8ffm&khost=www.bbc.com&frd=1&channel=sport&sectn=live&subsect=cricket&domain=www.bbc.com&story_id=32809781&ctype=content&asset_type=live_event&referrer=sport0&referrer_domain=www.bbc.com&esi=0',
        std: '5',
        u_aw: '1440',
        u_tz: '120',
        iu_parts: '4817,bbccom.live.site.news,sport_live_content',
        url: 'http://www.bbc.com/sport/live/cricket/32809781',
        u_nplug: '2',
        callback: 'googletag.impl.pubads.setAdContentsBySlotForSync',
        dssz: '71',
        eid: '108809047,108809030,108809035,108809050',
        gut: 'v2',
        sc: '0',
        cookie: 'ID=2cdd06c7dff60cd5:T=1438088344:S=ALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g',
        ifi: '1',
        impl: 'ss'
      },
      password: '',
    }
  },
  {
    url: 'http://cdn.krxd.net/controltag?confid=JZh7-1tL',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'cdn.krxd.net',
      path: '/controltag',
      query: 'confid=JZh7-1tL',
      query_keys: {
        confid: 'JZh7-1tL'
      },
      password: '',
    }
  },
  {
    url: 'http://sa.bbc.co.uk/bbc/bbc/s?name=sport.cricket.international.live_coverage.32809781.page&app_name=sport&app_version=2.8.1058&app_edition=1&is_app=0&page_type=live_coverage&pal_route=bbc_live_sport&ml_name=barlesque&app_type=responsive&language=en-GB&ml_version=0.26.31&pal_webapp=onesport&prod_name=sport&blq_s=4d&blq_r=2.7&blq_v=default&blq_e=pal&bbc_mc=ad1ps1pf1&screen_resolution=1440x900&bbc_site=&ns_ti=Ashes%202015%3A%20England%20v%20Australia%2C%20third%20Test%2C%20Edgbaston%2C%20day%20two%20-%20BBC%20Sport&ns_c=UTF-8&ns__t=1438251866485&ns_jspageurl=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ns_referrer=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'sa.bbc.co.uk',
      path: '/bbc/bbc/s',
      query: 'name=sport.cricket.international.live_coverage.32809781.page&app_name=sport&app_version=2.8.1058&app_edition=1&is_app=0&page_type=live_coverage&pal_route=bbc_live_sport&ml_name=barlesque&app_type=responsive&language=en-GB&ml_version=0.26.31&pal_webapp=onesport&prod_name=sport&blq_s=4d&blq_r=2.7&blq_v=default&blq_e=pal&bbc_mc=ad1ps1pf1&screen_resolution=1440x900&bbc_site=&ns_ti=Ashes%202015%3A%20England%20v%20Australia%2C%20third%20Test%2C%20Edgbaston%2C%20day%20two%20-%20BBC%20Sport&ns_c=UTF-8&ns__t=1438251866485&ns_jspageurl=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ns_referrer=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F',
      query_keys: {
        screen_resolution: '1440x900',
        app_name: 'sport',
        ns_jspageurl: 'http://www.bbc.com/sport/live/cricket/32809781',
        ml_version: '0.26.31',
        pal_webapp: 'onesport',
        app_type: 'responsive',
        ml_name: 'barlesque',
        app_edition: '1',
        bbc_mc: 'ad1ps1pf1',
        page_type: 'live_coverage',
        app_version: '2.8.1058',
        prod_name: 'sport',
        bbc_site: '',
        blq_s: '4d',
        blq_r: '2.7',
        blq_v: 'default',
        ns_ti: 'Ashes 2015: England v Australia, third Test, Edgbaston, day two - BBC Sport',
        blq_e: 'pal',
        pal_route: 'bbc_live_sport',
        name: 'sport.cricket.international.live_coverage.32809781.page',
        language: 'en-GB',
        ns_referrer: 'http://www.bbc.com/sport/0/',
        is_app: '0',
        ns__t: '1438251866485',
        ns_c: 'UTF-8'
      },
      password: '',
    }
  },
  {
    url: 'http://r.nexac.com/e/getdata.xgi?dt=br&pkey=jtkr94hrnfw22&ru=http://ar.atwola.com/atd?it=7%26iv=%3cna_di%3e%26at=8%26av=%3cna_di2%3e%26ds=7%26ed=%3cna_da%3e%26rand=799496',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'r.nexac.com',
      path: '/e/getdata.xgi',
      query: 'dt=br&pkey=jtkr94hrnfw22&ru=http://ar.atwola.com/atd?it=7%26iv=%3cna_di%3e%26at=8%26av=%3cna_di2%3e%26ds=7%26ed=%3cna_da%3e%26rand=799496',
      query_keys: {
        pkey: 'jtkr94hrnfw22',
        dt: 'br',
        ru: 'http://ar.atwola.com/atd?it=7&iv=<na_di>&at=8&av=<na_di2>&ds=7&ed=<na_da>&rand=799496'
      },
      password: '',
    }
  },
  {
    url: 'http://tags.bluekai.com/site/19275?ret=html&phint=page=Mashable&phint=channel=home&phint=prop2=Channel',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'tags.bluekai.com',
      path: '/site/19275',
      query: 'ret=html&phint=page=Mashable&phint=channel=home&phint=prop2=Channel',
      searchParams: [
        ['ret', 'html'],
        ['phint', 'page=Mashable'],
        ['phint', 'channel=home'],
        ['phint', 'prop2=Channel']
      ],
      password: '',
    }
  },
  {
    url: 'http://www.adidas.de?cm_mmc=AdieSEM_Google-_-Adidas-Brand-B-Exact-_-Brand-adidas-X-General-_-adidas&cm_mmca1=DE&cm_mmca2=e&gclid=Cj0KEQiA496zBRDoi5OY3p2xmaUBEiQArLNnKyRcv0vcTG0u8qPDyE-mwvW_CMkrZ4SGYODRzSZ54mAaAlBc8P8HAQ&gclsrc=aw.ds',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'www.adidas.de',
      path: '/',
      query: 'cm_mmc=AdieSEM_Google-_-Adidas-Brand-B-Exact-_-Brand-adidas-X-General-_-adidas&cm_mmca1=DE&cm_mmca2=e&gclid=Cj0KEQiA496zBRDoi5OY3p2xmaUBEiQArLNnKyRcv0vcTG0u8qPDyE-mwvW_CMkrZ4SGYODRzSZ54mAaAlBc8P8HAQ&gclsrc=aw.ds',
      query_keys: {
        cm_mmc: 'AdieSEM_Google-_-Adidas-Brand-B-Exact-_-Brand-adidas-X-General-_-adidas',
        cm_mmca1: 'DE',
        cm_mmca2: 'e',
        gclid: 'Cj0KEQiA496zBRDoi5OY3p2xmaUBEiQArLNnKyRcv0vcTG0u8qPDyE-mwvW_CMkrZ4SGYODRzSZ54mAaAlBc8P8HAQ',
        gclsrc: 'aw.ds'
      },
      password: '',
    }
  },
  {
    url: 'http://pix04.revsci.net/F09828/b3/Z/3/120814/588347998.js?D=DM_LOC%3Dhttp%253A%252F%252Fwww.eltern.de%252F%253Fbpid%253Dgrunerjahr%2526_rsiL%253D0%26DM_EOM%3D1&C=F09828&asidi=cliqz.com/tracking&asidi=V6roVyy38IZUh0ZkC_jXhw',
    url_parts: {
      protocol: 'http',
      hostname: 'pix04.revsci.net',
      path: '/F09828/b3/Z/3/120814/588347998.js',
      query: 'D=DM_LOC%3Dhttp%253A%252F%252Fwww.eltern.de%252F%253Fbpid%253Dgrunerjahr%2526_rsiL%253D0%26DM_EOM%3D1&C=F09828&asidi=cliqz.com/tracking&asidi=V6roVyy38IZUh0ZkC_jXhw',
      searchParams: [
        ['D', 'DM_LOC=http%3A%2F%2Fwww.eltern.de%2F%3Fbpid%3Dgrunerjahr%26_rsiL%3D0&DM_EOM=1'],
        ['C', 'F09828'],
        ['asidi', 'cliqz.com/tracking'],
        ['asidi', 'V6roVyy38IZUh0ZkC_jXhw'],
      ],
      username: '',
      password: '',
    }
  },
  {
    url: 'https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=381867223985307&output=json_html&callback=googletag.impl.pubads.setPassbackAdContents&impl=s&eid=108809080&sc=1&sfv=1-0-6&iu=/59666047/theguardian.com/x-passback/appnexus&sz=300x250&scp=url=https%3A%2F%2Fwww.theguardian.com%2Fuk-news&edition=int&ct=section&p=ng&k=uk-news&su=0&bp=wide&x=&gdncrm=&pv=j0hz3tifocrvn65tut9x&co=&tn=&slot=inline1&passback=mediamath,appnexus&eri=2&cookie=ID=801c1fee7e3ea0e0:T=1489154693:S=ALNI_Mb77wmklXwm0DZhnZUkB8VwQuRd-Q&cdm=www.theguardian.com&lmt=1490006017&dt=1490006017168&cc=100&ea=0&frm=23&biw=1349&bih=1098&isw=300&ish=250&oid=3&adk=2342784336&ifi=1&ifk=2042039554&u_tz=60&u_his=3&u_h=1440&u_w=2560&u_ah=1366&u_aw=2560&u_cd=24&u_nplug=1&u_nmime=2&u_sd=1&flash=23.0.0&nhd=1&url=https://www.theguardian.com/uk-news&ref=https://www.theguardian.com/international&top=https://www.theguardian.com/uk-news&dssz=8&icsg=346&mso=544&std=8&vrg=111&vrp=111&ga_vid=933737547.1488448014&ga_sid=1490006017&ga_hid=907246662',
    url_parts: {
      hostname: 'securepubads.g.doubleclick.net',
      protocol: 'https',
      path: '/gampad/ads',
      query: 'gdfp_req=1&correlator=381867223985307&output=json_html&callback=googletag.impl.pubads.setPassbackAdContents&impl=s&eid=108809080&sc=1&sfv=1-0-6&iu=/59666047/theguardian.com/x-passback/appnexus&sz=300x250&scp=url=https%3A%2F%2Fwww.theguardian.com%2Fuk-news&edition=int&ct=section&p=ng&k=uk-news&su=0&bp=wide&x=&gdncrm=&pv=j0hz3tifocrvn65tut9x&co=&tn=&slot=inline1&passback=mediamath,appnexus&eri=2&cookie=ID=801c1fee7e3ea0e0:T=1489154693:S=ALNI_Mb77wmklXwm0DZhnZUkB8VwQuRd-Q&cdm=www.theguardian.com&lmt=1490006017&dt=1490006017168&cc=100&ea=0&frm=23&biw=1349&bih=1098&isw=300&ish=250&oid=3&adk=2342784336&ifi=1&ifk=2042039554&u_tz=60&u_his=3&u_h=1440&u_w=2560&u_ah=1366&u_aw=2560&u_cd=24&u_nplug=1&u_nmime=2&u_sd=1&flash=23.0.0&nhd=1&url=https://www.theguardian.com/uk-news&ref=https://www.theguardian.com/international&top=https://www.theguardian.com/uk-news&dssz=8&icsg=346&mso=544&std=8&vrg=111&vrp=111&ga_vid=933737547.1488448014&ga_sid=1490006017&ga_hid=907246662',
      query_keys: {
        gdfp_req: '1',
        correlator: '381867223985307',
        output: 'json_html',
        callback: 'googletag.impl.pubads.setPassbackAdContents',
        impl: 's',
        eid: '108809080',
        sc: '1',
        sfv: '1-0-6',
        iu: '/59666047/theguardian.com/x-passback/appnexus',
        sz: '300x250',
        scp: 'url=https://www.theguardian.com/uk-news',
        edition: 'int',
        ct: 'section',
        p: 'ng',
        k: 'uk-news',
        su: '0',
        bp: 'wide',
        x: '',
        gdncrm: '',
        pv: 'j0hz3tifocrvn65tut9x',
        co: '',
        tn: '',
        slot: 'inline1',
        passback: 'mediamath,appnexus',
        eri: '2',
        cookie: 'ID=801c1fee7e3ea0e0:T=1489154693:S=ALNI_Mb77wmklXwm0DZhnZUkB8VwQuRd-Q',
        cdm: 'www.theguardian.com',
        lmt: '1490006017',
        dt: '1490006017168',
        cc: '100',
        ea: '0',
        frm: '23',
        biw: '1349',
        bih: '1098',
        isw: '300',
        ish: '250',
        oid: '3',
        adk: '2342784336',
        ifi: '1',
        ifk: '2042039554',
        u_tz: '60',
        u_his: '3',
        u_h: '1440',
        u_w: '2560',
        u_ah: '1366',
        u_aw: '2560',
        u_cd: '24',
        u_nplug: '1',
        u_nmime: '2',
        u_sd: '1',
        flash: '23.0.0',
        nhd: '1',
        url: 'https://www.theguardian.com/uk-news',
        ref: 'https://www.theguardian.com/international',
        top: 'https://www.theguardian.com/uk-news',
        dssz: '8',
        icsg: '346',
        mso: '544',
        std: '8',
        vrg: '111',
        vrp: '111',
        ga_vid: '933737547.1488448014',
        ga_sid: '1490006017',
        ga_hid: '907246662',
      }
    }
  }
];

const parameters = [
  {
    url: 'http://pixel.quantserve.com/pixel;r=1275226977;a=p-3aud4J6uA4Z6Y;labels=verticalHP.index;fpan=0;fpa=P0-113403507-1437990328261;ns=0;ce=1;cm=;je=0;sr=1440x900x24;enc=n;dst=1;et=1438251870170;tzo=-120;ref=;url=http%3A%2F%2Fwww.buzzfeed.com%2F;ogl=site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'pixel.quantserve.com',
      path: '/pixel;r=1275226977;a=p-3aud4J6uA4Z6Y;labels=verticalHP.index;fpan=0;fpa=P0-113403507-1437990328261;ns=0;ce=1;cm=;je=0;sr=1440x900x24;enc=n;dst=1;et=1438251870170;tzo=-120;ref=;url=http%3A%2F%2Fwww.buzzfeed.com%2F;ogl=site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom',
      parameters: 'r=1275226977;a=p-3aud4J6uA4Z6Y;labels=verticalHP.index;fpan=0;fpa=P0-113403507-1437990328261;ns=0;ce=1;cm=;je=0;sr=1440x900x24;enc=n;dst=1;et=1438251870170;tzo=-120;ref=;url=http%3A%2F%2Fwww.buzzfeed.com%2F;ogl=site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom',
      parameter_keys: {
        r: '1275226977',
        a: 'p-3aud4J6uA4Z6Y',
        labels: 'verticalHP.index',
        fpan: '0',
        fpa: 'P0-113403507-1437990328261',
        ns: '0',
        ce: '1',
        cm: '',
        je: '0',
        sr: '1440x900x24',
        enc: 'n',
        dst: '1',
        et: '1438251870170',
        tzo: '-120',
        ref: '',
        url: 'http://www.buzzfeed.com/',
        ogl: 'site_name.BuzzFeed,type.website,description.BuzzFeed has the hottest%2C most social content on the web%2E We feature breaking bu,title.BuzzFeed,image.http://s3-ak%2Ebuzzfed%2Ecom/static/images/global/buzzfeed%2Ejpg?v=201507291520,url.http://www%2Ebuzzfeed%2Ecom'
      },
      query: '',
      query_keys: {},
      password: '',
    }
  },
];

const fragments = [
  {
    url: 'http://s7.addthis.com/js/250/addthis_widget.js#async=1&username=wettercom',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 's7.addthis.com',
      path: '/js/250/addthis_widget.js',
      query: '',
      query_keys: {},
      fragment: '#async=1&username=wettercom',
      fragment_keys: {
        async: '1',
        username: 'wettercom'
      },
      password: '',
    }
  }];

const combined = [
  {
    url: 'https://accounts.google.com/o/oauth2/postmessageRelay?parent=http%3A%2F%2Fwww.buzzfeed.com#rpctoken=797034019&forcesecure=1',
    url_parts: {
      username: '',
      protocol: 'https',
      hostname: 'accounts.google.com',
      path: '/o/oauth2/postmessageRelay',
      query: 'parent=http%3A%2F%2Fwww.buzzfeed.com',
      query_keys: {
        parent: 'http://www.buzzfeed.com'
      },
      fragment: '#rpctoken=797034019&forcesecure=1',
      fragment_keys: {
        rpctoken: '797034019',
        forcesecure: '1'
      },
      password: '',
    }
  },
  {
    url: 'http://fast.adobe.demdex.net/dest4.html?d_nsid=0#http%3A%2F%2Fwww.adobe.com%2F%23',
    url_parts: {
      username: '',
      protocol: 'http',
      hostname: 'fast.adobe.demdex.net',
      path: '/dest4.html',
      query: 'd_nsid=0',
      query_keys: {
        d_nsid: '0'
      },
      fragment: '#http%3A%2F%2Fwww.adobe.com%2F%23',
      fragment_keys: {
        'http%3A%2F%2Fwww.adobe.com%2F%23': 'true'
      },
      password: '',
    }
  },
  {
    url: 'http://myname:mypassword@example.com:81/some/path;with=parameters;howmany=2?also=query#andfinally=fragment',
    url_parts: {
      protocol: 'http',
      username: 'myname',
      password: 'mypassword',
      hostname: 'example.com',
      port: '81',
      path: '/some/path;with=parameters;howmany=2',
      parameters: 'with=parameters;howmany=2',
      parameter_keys: {
        with: 'parameters',
        howmany: '2'
      },
      query: 'also=query',
      query_keys: {
        also: 'query'
      },
      fragment: '#andfinally=fragment',
      fragment_keys: {
        andfinally: 'fragment'
      }
    }
  }
];

const special = [{
  url: 'https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.de.qTommvXNk3Y.O/m=gapi_iframes_style_common,plusone/rt=j/sv=1/d=1/ed=1/am=AQ/rs=AGLTcCPFQTY3xyU4E7vwFYmIgrjbG0BFEA/cb=gapi.loaded_0',
  url_parts: {
    protocol: 'https',
    hostname: 'apis.google.com',
    path: '/_/scs/apps-static/_/js/k=oz.gapi.de.qTommvXNk3Y.O/m=gapi_iframes_style_common,plusone/rt=j/sv=1/d=1/ed=1/am=AQ/rs=AGLTcCPFQTY3xyU4E7vwFYmIgrjbG0BFEA/cb=gapi.loaded_0'
  }
}, {
  url: 'https://accounts.google.com/o/oauth2/postmessageRelay?parent=https%3A%2F%2Fwww.blogger.com&jsh=m%3B%2F_%2Fscs%2Fapps-static%2F_%2Fjs%2Fk%3Doz.gapi.de.qTommvXNk3Y.O%2Fm%3D__features__%2Fam%3DAQ%2Frt%3Dj%2Fd%3D1%2Frs%3DAGLTcCPFQTY3xyU4E7vwFYmIgrjbG0BFEA#rpctoken=686210141&forcesecure=1',
  url_parts: {
    protocol: 'https',
    hostname: 'accounts.google.com',
    path: '/o/oauth2/postmessageRelay',
    query: 'parent=https%3A%2F%2Fwww.blogger.com&jsh=m%3B%2F_%2Fscs%2Fapps-static%2F_%2Fjs%2Fk%3Doz.gapi.de.qTommvXNk3Y.O%2Fm%3D__features__%2Fam%3DAQ%2Frt%3Dj%2Fd%3D1%2Frs%3DAGLTcCPFQTY3xyU4E7vwFYmIgrjbG0BFEA',
    query_keys: {
      parent: 'https://www.blogger.com',
      jsh: 'm;/_/scs/apps-static/_/js/k=oz.gapi.de.qTommvXNk3Y.O/m=__features__/am=AQ/rt=j/d=1/rs=AGLTcCPFQTY3xyU4E7vwFYmIgrjbG0BFEA',
    },
    fragment: '#rpctoken=686210141&forcesecure=1',
    fragment_keys: {
      rpctoken: '686210141',
      forcesecure: '1'
    }
  }
}];

const emptyParts = {
  protocol: '',
  username: '',
  password: '',
  hostname: '',
  port: '',
  path: '',
  parameters: '',
  parameter_keys: {},
  query: '',
  query_keys: {},
  fragment: '',
  fragment_keys: {}
};


const keyValueTestCases = [{
  url: 'https://cliqz.com',
  expectedKv: []
}, {
  url: 'http://pix04.revsci.net/F09828/b3/Z/3/120814/588347998.js?D=DM_LOC%3Dhttp%253A%252F%252Fwww.eltern.de%252F%253Fbpid%253Dgrunerjahr%2526_rsiL%253D0%26DM_EOM%3D1&C=F09828&asidi=cliqz.com/tracking&asidi=V6roVyy38IZUh0ZkC_jXhw',
  expectedKv: [
    ['D', 'DM_LOC=http%3A%2F%2Fwww.eltern.de%2F%3Fbpid%3Dgrunerjahr%26_rsiL%3D0&DM_EOM=1'],
    ['C', 'F09828'],
    ['asidi', 'cliqz.com/tracking'],
    ['asidi', 'V6roVyy38IZUh0ZkC_jXhw'],
  ]
}];

function fillInSpec(spec) {
  Object.keys(emptyParts).forEach(function (k) {
    // eslint-disable-next-line no-param-reassign
    spec[k] = spec[k] || emptyParts[k];
  });
  return spec;
}

export default describeModule('core/url',
  () => ({}),
  () => {
    describe('#compare', function () {
      let equals;
      beforeEach(function () {
        equals = this.module().equals;
      });
      it('with exactly same urls returns true', function () {
        chai.expect(equals('https://cliqz.com', 'https://cliqz.com')).to.be.true;
      });

      it('with missing urls returns false', function () {
        chai.expect(equals('https://cliqz.com', '')).to.be.false;
        chai.expect(equals('', 'https://cliqz.com')).to.be.false;
        chai.expect(equals('', '')).to.be.false;
      });

      it('with the same decoded urls return true', function () {
        chai.expect(equals('https://en.wikipedia.org/wiki/Murphy\'s_law', 'https://en.wikipedia.org/wiki/Murphy%27s_law')).to.be.true;
        chai.expect(equals('https://de.wikipedia.org/wiki/Stojanka_Novaković', 'https://de.wikipedia.org/wiki/Stojanka_Novakovi%C4%87')).to.be.true;
      });
    });

    describe('#isUrl', function () {
      let isUrl;

      beforeEach(function () {
        isUrl = this.module().isUrl;
      });

      describe('should return true on URLs or URL-like strings', () => {
        URLS.forEach((urlStr) => {
          it(urlStr, () => chai.expect(isUrl(urlStr)).to.be.true);
        });
      });

      describe('should return false on non-URL-like strings', () => {
        QUERIES.forEach((queryStr) => {
          it(queryStr, () => chai.expect(isUrl(queryStr)).to.be.false);
        });
      });
    });

    describe('#fixURL', function () {
      let fixURL;

      beforeEach(function () {
        fixURL = this.module().fixURL;
      });

      describe('should not return null for URL-like strings', () => {
        URLS.forEach((urlStr) => {
          it(urlStr, () => chai.expect(fixURL(urlStr)).not.to.be.null);
        });
      });
    });

    describe('#getUrlVariations', function () {
      let getUrlVariations;

      beforeEach(function () {
        getUrlVariations = this.module().getUrlVariations;
      });

      describe('for invalid urls', function () {
        const badURL = 'xxx bad url';
        it('should return array with the original url-string', function () {
          const variants = getUrlVariations(badURL, {});
          chai.expect(variants).to.deep.equal([badURL]);
        });
      });

      URL_VARIANTS.forEach((testCase) => {
        describe(`creating url variants by adding/removing "${testCase.title}"`, function () {
          // should
          Object.keys(testCase.should).forEach((url) => {
            const shouldUrls = testCase.should[url];
            it(`should generate variants "${shouldUrls.join(', ')}" of url "${url}"`, function () {
              const variants = getUrlVariations(url, testCase.params).sort();
              // Sort both `variants` and `shouldUrls` before compating
              //  because the order of the created variants doesn't matter.
              chai.expect(variants.sort()).to.deep.equal(shouldUrls.sort());
            });
          });

          // should not
          Object.keys(testCase.shouldnt).forEach((url) => {
            const shouldntUrls = testCase.shouldnt[url];
            it(`should not generate variants "${shouldntUrls.join(', ')}" of url "${url}"`, function () {
              const variants = new Set(getUrlVariations(url, testCase.params));
              shouldntUrls.forEach(u => chai.expect(variants.has(u)).to.be.false);
            });
          });
        });
      });
    });

    describe('#isPrivateIP', function () {
      let isPrivateIP;
      beforeEach(function () {
        isPrivateIP = this.module().isPrivateIP;
      });

      it('should detect private ipv4 subnets', function () {
        chai.expect(isPrivateIP('127.0.0.1')).to.be.true;
        chai.expect(isPrivateIP('192.168.2.107')).to.be.true;
        chai.expect(isPrivateIP('192.168.1.41')).to.be.true;
        chai.expect(isPrivateIP('10.0.5.250')).to.be.true;
      });

      it('should detect public ipv4 subnets', function () {
        chai.expect(isPrivateIP('93.184.216.34')).to.be.false;
      });

      // once we add support for ipv6, this test is expected to pass
      it('should detect private ipv6 subnets', function () {
        chai.expect(isPrivateIP('::1')).to.be.true;
        chai.expect(isPrivateIP('0:0:0:0:0:0:0:1')).to.be.true;
        chai.expect(isPrivateIP('fd12:3456:789a:1::1')).to.be.true;
      });

      it('should detect public ipv6 address', function () {
        chai.expect(isPrivateIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).to.be.false;
      });
    });

    describe('#strip', () => {
      let strip;
      beforeEach(function () {
        strip = this.module().strip;
      });

      const spaces = [
        '',
        ' ',
        '\t',
        '\n\r',
      ];

      const protocols = [
        '',
        'http:',
        'only-one-slash:/',
        'https://',
        'HTTP://',
        'wss://',
        'some-custom-protocol://',
        'multiple-slashes:///',
      ];

      const wwws = [
        '',
        'www.',
        'www2.',
        'WWW.',
        'WWW2.',
      ];

      const mobiles = [
        '',
        'mobile.',
        'mobil.',
        'm.',
      ];

      const paths = [
        '/foo',
        '/foo/bar',
      ];

      const searches = [
        '?q=42',
        '?q=42/',
      ];

      const hashes = [
        '#hash',
        '#hash/',
      ];

      const base = 'sub.example.com';

      it('leaves normal string un-changed', () => {
        for (const query of ['', 'f', 'fa', 'facebook']) {
          chai.expect(strip(query, {
            spaces: true,
            protocol: true,
            www: true,
            mobile: true,
            trailingSlash: true,
          })).to.equal(query);
        }
      });

      const spacesRe = /\s+/g;
      const normalizeSpaces = s => s.replace(spacesRe, ' ');

      describe('handles URLs', () => {
        spaces.forEach((space) => {
          protocols.forEach((protocol) => {
            wwws.forEach((www) => {
              mobiles.forEach((mobile) => {
                paths.forEach((path) => {
                  searches.forEach((search) => {
                    hashes.forEach((hash) => {
                      const rawUrl = `${space}${protocol}${www}${mobile}${base}${path}/${search}${hash}${space}`;

                      describe(`'${normalizeSpaces(rawUrl)}' -> '${base}${path}${search}${hash}'`, () => {
                        it('all', () => {
                          chai.expect(strip(rawUrl, {
                            spaces: true,
                            protocol: true,
                            www: true,
                            mobile: true,
                            trailingSlash: true,
                          })).to.equal(`${base}${path}${search}${hash}`);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    describe('#getName', () => {
      let getName;
      let parse;

      beforeEach(function () {
        getName = this.module().getName;
        parse = this.module().parse;
      });

      it('return "null" for invalid URL', () => {
        chai.expect(getName(parse('foo'))).to.equal(null);
      });

      it('return "IP" if URL is ipv4', () => {
        chai.expect(getName(parse('https://1.1.1.1/'))).to.equal('IP');
      });

      // Currently not handled by '@cliqz/url-parser' but will be fixed soon.
      it.skip('return "IP" if URL is ipv6', () => {
        chai.expect(getName(parse('https://[::1]/'))).to.equal('IP');
      });

      it('handle localhost', () => {
        chai.expect(getName(parse('http://localhost/path'))).to.equal('localhost');
      });

      it('return domain without suffix', () => {
        chai.expect(getName(parse('https://sub.foo.co.uk'))).to.equal('foo');
      });
    });

    describe('#parse', () => {
      let parse;

      beforeEach(function () {
        parse = this.module().parse;
      });

      function testSpecArray(name, spec) {
        describe(name, function () {
          spec.forEach(function (testcase) {
            let urlDesc = testcase.url;
            if (urlDesc.length > 180) urlDesc = `${urlDesc.substring(0, 180)}...`;
            it(urlDesc, function () {
              const expected = fillInSpec(testcase.url_parts);
              const actual = parse(testcase.url);
              chai.expect(actual.protocol).to.equal(`${expected.protocol}:`);
              chai.expect(actual.username).to.equal(expected.username);
              chai.expect(actual.password).to.equal(expected.password);
              chai.expect(actual.hostname).to.equal(expected.hostname);
              chai.expect(actual.port).to.equal(expected.port);
              chai.expect(actual.pathname).to.equal(expected.path);
              if (expected.query) {
                chai.expect(actual.search).to.equal(`?${expected.query}`);
              } else {
                chai.expect(actual.search).to.equal('');
              }
              chai.expect(actual.hash).to.equal(expected.fragment);

              if (expected.searchParams) {
                chai.expect(actual.searchParams.params.length, 'detected QS values').to.equal(expected.searchParams.length);
                let i = 0;
                for (const [k, v] of actual.searchParams.entries()) {
                  chai.expect(k).to.equal(expected.searchParams[i][0]);
                  chai.expect(v).to.equal(expected.searchParams[i][1]);
                  i += 1;
                }
              } else {
                // legacy spec using object
                chai.expect(actual.searchParams.params.length, 'detected QS values').to.equal(Object.keys(expected.query_keys).length);
                chai.expect(actual.parameters.params.length, 'detected PS values').to.equal(Object.keys(expected.parameter_keys).length);

                for (const [k, v] of actual.searchParams.entries()) {
                  chai.expect(v).to.equal(expected.query_keys[k]);
                }
                for (const [k, v] of actual.parameters.entries()) {
                  chai.expect(v).to.equal(expected.parameter_keys[k]);
                }
              }
            });
          });
        });
      }

      // test examples
      testSpecArray('plain urls', plainUrls);
      testSpecArray('query strings', queryStrings);
      testSpecArray('parameter strings', parameters);
      testSpecArray('fragment strings', fragments);
      testSpecArray('combined', combined);
      testSpecArray('special', special);

      describe('get', function () {
        it('returns null if argument is falsy', () => {
          chai.expect(parse('')).to.be.null;
          chai.expect(parse()).to.be.null;
          chai.expect(parse(false)).to.be.null;
          chai.expect(parse(null)).to.be.null;
        });

        it('returns parsed url info for valid url', () => {
          const urlParts = parse('https://cliqz.com');
          chai.expect(urlParts.hostname).to.equal('cliqz.com');
          chai.expect(urlParts.protocol).to.equal('https:');
          chai.expect(urlParts.pathname).to.equal('/');
        });
      });

      describe('getKeyValues', function () {
        keyValueTestCases.forEach((testCase) => {
          it(testCase.url, () => {
            const kv = [...parse(testCase.url).searchParams.entries()];
            chai.expect(kv).to.eql(testCase.expectedKv);
          });
        });
      });
    });

    describe('#equals', () => {
      let equals;

      beforeEach(function () {
        equals = this.module().equals;
      });

      [
        ['http://cliqz.com', 'http://cliqz.com'],
        ['http://cliqz.com', 'http://cliqz.com/'],
        ['http://cliqz.com:80', 'http://cliqz.com'],
        ['https://cliqz.com', 'https://cliqz.com:443'],
        ['https://cliqz.com/test?q=hi#anchor', 'https://cliqz.com:443/test?q=hi#anchor'],
        ['https://user:pass@cliqz.com/', 'https://user:pass@cliqz.com'],
        ['http://xn--mnchen-3ya.de/', 'http://münchen.de'],
        ['http://cliqz.com/test%20site/', 'http://cliqz.com/test site/'],
      ].forEach((urls) => {
        const [url1, url2] = urls;
        it(`returns true for ${url1} and ${url2}`, () => {
          chai.expect(equals(url1, url2)).to.be.true;
        });
      });

      [
        [null, null],
        ['', ''],
        ['http://cliqz.com:443', 'https://cliqz.com'],
        ['https://user:pass@cliqz.com/', 'https://user:pas@cliqz.com/'],
        ['https://user:pass@cliqz.com/', 'https://user:pas@cliqz.com/'],
        ['http://www.cliqz.com/', 'http://www3.cliqz.com/'],
      ].forEach((urls) => {
        const [url1, url2] = urls;
        it(`returns false for ${url1} and ${url2}`, () => {
          chai.expect(equals(url1, url2)).to.be.false;
        });
      });
    });

    describe('#haveCompatibleProtocol', () => {
      let haveCompatibleProtocol;

      beforeEach(function () {
        haveCompatibleProtocol = this.module().haveCompatibleProtocol;
      });

      it('handles empty protocol', () => {
        chai.expect(haveCompatibleProtocol(
          '://example.com',
          '://example.com',
        )).to.be.true;

        chai.expect(haveCompatibleProtocol(
          '://example.com',
          's://example.com',
        )).to.be.false;
      });

      const protocols = [
        'http',
        'ftp',
        'file',
        'about',
        'mailto',
        'chrome',
        'moz-extension',
        'chrome-extension',
        'view-source',
        'data',
        'dat',
        'resource',
      ];

      describe('protocol is the same', () => {
        protocols.forEach((protocol) => {
          it(`${protocol}`, () => {
            chai.expect(haveCompatibleProtocol(
              `${protocol}://example.com`,
              `${protocol}://example.com`,
            )).to.be.true;
          });
        });
      });

      describe('protocol differs', () => {
        protocols.forEach((p1) => {
          protocols.forEach((p2) => {
            if (p1 !== p2) {
              it(`${p1} !== ${p2}`, () => {
                chai.expect(haveCompatibleProtocol(
                  `${p1}://example.com`,
                  `${p2}://example.com`,
                )).to.be.false;
              });
            }
          });
        });
      });

      it('case differs', () => {
        chai.expect(haveCompatibleProtocol(
          'HTTPS://example.com',
          'https://example.com',
        )).to.be.true;
      });

      it('security differs', () => {
        chai.expect(haveCompatibleProtocol(
          'http://example.com',
          'https://example.com',
        )).to.be.true;
      });

      it('number of slashes differs', () => {
        chai.expect(haveCompatibleProtocol(
          'https:example.com',
          'https://example.com',
        )).to.be.true;
      });
    });
  });
