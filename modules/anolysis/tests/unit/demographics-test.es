/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-unused-expressions */
/* global chai */
/* global describeModule */

const UAParser = require('ua-parser-js');
const moment = require('moment');


const INSTALL_DATE_TESTS = [
  { signal: { install_date: 16128 }, result: 'other/16128' },
  { signal: { install_date: '16128' }, result: 'other/16128' },
  { signal: { install_date: 16129 }, result: '2014/02/28' },
  { signal: { install_date: '16129' }, result: '2014/02/28' },
  { signal: { install_date: 17070 }, result: '2016/09/26' },
  { signal: { install_date: 17170 }, result: 'other/17170' },
  { signal: { install_date: '17170' }, result: 'other/17170' },
  { signal: { install_date: 17175 }, result: 'other/17175' },
  { signal: { install_date: 17180 }, result: 'other/17180' },
  { signal: { install_date: 20000 }, result: 'other/20000' },
  { signal: { install_date: '20000' }, result: 'other/20000' },
  { signal: { install_date: '' }, result: 'other/' },
  { signal: { install_date: 0 }, result: 'other/0' },
  { signal: { install_date: '2018/' }, result: 'other/2018/' },
  { signal: { install_date: '20180101' }, result: '2018/01/01' },
  { signal: { install_date: '2018-01-01' }, result: 'other/2018-01-01' },
  { signal: { install_date: '20181131' }, result: 'other/20181131' },
  { signal: { install_date: '2018/01/01' }, result: 'other/2018/01/01' },
];


const OS_TESTS = [
  // NOTE: Not handled properly by the user agent parsing library
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/602.3.12 (KHTML, like Gecko) Version/10.0.2 Safari/602.3.12' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/53.0.2785.143 Chrome/53.0.2785.143 Safari/537.36' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0;  Trident/5.0)' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 10_1_1 like Mac OS X) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0 Mobile/14B100 Safari/602.1' }, result: 'mobile/ios/10.1' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0;  Trident/5.0)' }, result: 'desktop/windows/vista' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36 OPR/41.0.2353.69' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.9' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.7 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 5.1; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/linux/fedora' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:49.0) Gecko/20100101 Firefox/49.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_1_1 like Mac OS X) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0 Mobile/14B100 Safari/602.1' }, result: 'mobile/ios/10.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36 OPR/34.0.2036.25' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.12' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7' }, result: 'desktop/mac-os/10.9' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.90 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36 OPR/41.0.2353.69' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/601.7.8' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:50.0) Gecko/20100101 Firefox/50.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.3.12 (KHTML, like Gecko) Version/10.0.2 Safari/602.3.12' }, result: 'desktop/mac-os/10.11' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:49.0) Gecko/20100101 Firefox/49.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0' }, result: 'desktop/windows/7' },
  { signal: { agent: '(Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: '2' }, result: 'other/2' },
  { signal: { agent: '<NUMBER>' }, result: 'other/<number>' },
  { signal: { agent: '<NUMBER>CB97FADECF<NUMBER>E84ED2F4BE' }, result: 'other/<number>cb97fadecf<number>e84ed2f4be' },
  { signal: { agent: 'DenUserAgentHatBestimmtNiemand' }, result: 'other/denuseragenthatbestimmtniemand' },
  { signal: { agent: 'Dillo/0.6.6' }, result: 'other/dillo/0.6.6' },
  { signal: { agent: 'Firefox/50.0.2 (x64 en-US); anonymized by Abelssoft <NUMBER>' }, result: 'other/firefox/50.0.2-(x64-en-us);-anonymized-by-abelssoft-<number>' },
  { signal: { agent: 'Firefox/50.1.0 (x86 de); anonymized by Abelssoft <NUMBER>' }, result: 'other/firefox/50.1.0-(x86-de);-anonymized-by-abelssoft-<number>' },
  { signal: { agent: 'Googlebot/2.1 (+http://www.googlebot.com/bot.html)' }, result: 'other/googlebot/2.1-(+http://www.googlebot.com/bot.html)' },
  { signal: { agent: 'Links (2.1pre31; Linux 2.6.21-omap1 armv6l; x)' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/3.0 (x86 [en] Windows NT 5.1; Sun)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; GTB6.4; .NET CLR 1.1.4322; FDM; .NET CLR 2.0.<NUMBER>; .NET CLR 3.0.<NUMBER>.30; .NET CLR 3.0.4506.2152; .NET CLR 3.5.<NUMBER>)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; GTB6.3; Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) ; ws8 Embedded Web Browser from: http://bsalsa.com/; .NET CLR 1.1.4322; .NET CLR 2.0.<NUMBER>; .NET CLR 3.0.4506.2152; .NET CLR 3.5.<NUMBER>)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; Trident/6.0)' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/4.0 (compatible; Mozilla/4.0; Mozilla/5.0; Mozilla/6.0; Safari/431.7; Macintosh; U; PPC Mac OS X 10.6 Leopard; AppleWebKit/421.9 (KHTML, like Gecko) )' }, result: 'desktop/mac-os/10.6' },
  { signal: { agent: 'Mozilla/4.5 RPT-HTTPClient/0.3-2' }, result: 'other/mozilla/4.5-rpt-httpclient/0.3-2' },
  { signal: { agent: 'Mozilla/4.7 (compatible; OffByOne; Windows 2000)' }, result: 'desktop/windows/2000' },
  { signal: { agent: 'Mozilla/5.0 (Android; Tablet; rv:51.0) Gecko/51.0 Firefox/51.0' }, result: 'mobile/android' },
  { signal: { agent: 'Mozilla/5.0 (Fedora; Linux i386) AppleWebKit/602.1 (KHTML, like Gecko) Version/8.0 Safari/602.1 Epiphany/3.18.5' }, result: 'desktop/linux/fedora' },
  { signal: { agent: 'Mozilla/5.0 (Fedora; Linux x86_64) AppleWebKit/602.1 (KHTML, like Gecko) Version/8.0 Safari/602.1 Epiphany/3.18.5' }, result: 'desktop/linux/fedora' },
  { signal: { agent: 'Mozilla/5.0 (HENGTIANSOFT; Windows NT 6.1; WOW64; rv:49.0) Gecko/<NUMBER> Firefox/49.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 4.1.2; GT-I9100 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.99 Mobile Safari/537.36' }, result: 'mobile/android/4.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 4.1.2; GT-I9100 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Mobile Safari/537.36' }, result: 'mobile/android/4.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 4.4.2; HTC One mini 2 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36' }, result: 'mobile/android/4.4' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 4.4.4; SM-N910F Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.59 Mobile Safari/537.36' }, result: 'mobile/android/4.4' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 5.0; X9006 Build/LRX21M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.124 Mobile Safari/537.36' }, result: 'mobile/android/5.0' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 5.1.1; D6603 Build/23.4.A.1.264; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/49.0.2623.105 Mobile Safari/537.36' }, result: 'mobile/android/5.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 4 Build/LMY48T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.89 Mobile Safari/537.36' }, result: 'mobile/android/5.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36' }, result: 'mobile/android/5.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; Android 6.0.1; D6603 Build/23.5.A.1.291; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Mobile Safari/537.36' }, result: 'mobile/android/6.0' },
  { signal: { agent: 'Mozilla/5.0 (Linux; U; Android 2.3.3; en-au; GT-I9100 Build/GINGERBREAD) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1' }, result: 'mobile/android/2.3' },
  { signal: { agent: 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; SonyC1505 Build/11.3.A.0.47) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30' }, result: 'mobile/android/4.1' },
  { signal: { agent: 'Mozilla/5.0 (Linux; U; Android-4.0.3; en-us; Galaxy Nexus Build/HNC3481) AppleWebKit/821.45.754 (KHTML, like Gecko) CrMo/15.0.29.13 Mobile Safari/821.45.754' }, result: 'mobile/android/4.0' },
  { signal: { agent: 'Mozilla/5.0 (Linux; U; X11; en-US; Valve Steam GameOverlay/<NUMBER>; ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.86 Safari/537.36' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:35.0) Gecko/<NUMBER> Firefox/35.0' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:36.0) Gecko/<NUMBER> Firefox/36.0 SeaMonkey/2.33.1' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:48.0) Gecko/<NUMBER> Firefox/48.0.2 Waterfox/48.0.2' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:50.0) Gecko/<NUMBER> Firefox/50.0 Waterfox/50.0' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.125 Safari/537.36 OPR/25.0.1614.71' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.2357.124 Safari/537.36' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.52 Safari/537.36 OPR/31.0.1889.50 (Edition beta)' }, result: 'desktop/mac-os/10.10' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; PPC Mac OS X 10.5; rv:38.0) Gecko/<NUMBER> Firefox/38.0 TenFourFox/G5' }, result: 'desktop/mac-os/10.5' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; en-US) AppleWebKit/534.13 (KHTML, like Gecko) Iron/9.0.600.2 Chrome/9.0.600.2 Safari/534.13' }, result: 'desktop/mac-os/10.6' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-us) AppleWebKit/537+ (KHTML, like Gecko) Version/5.0 Safari/537.6+ Midori/0.4' }, result: 'desktop/mac-os' },
  { signal: { agent: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.5b) Gecko/<NUMBER> Camino/0.7+' }, result: 'desktop/mac-os/mach' },
  { signal: { agent: 'Mozilla/5.0 (Mobile; OPENC; rv:47.0) Gecko/47.0 Firefox/47.0' }, result: 'other/firefox-os' },
  { signal: { agent: 'Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; SAMSUNG; GT-I8750) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537' }, result: 'other/windows-phone' },
  { signal: { agent: 'Mozilla/5.0 (Mobile; rv:46.0) Gecko/46.0 Firefox/46.0' }, result: 'other/firefox-os' },
  { signal: { agent: 'Mozilla/5.0 (PLAYSTATION 3; 2.00)' }, result: 'other/playstation' },
  { signal: { agent: 'Mozilla/5.0 (PLAYSTATION 3; 4.70) AppleWebKit/531.22.8 (KHTML, like Gecko)' }, result: 'other/playstation' },
  { signal: { agent: 'Mozilla/5.0 (PlayStation 4 3.50) AppleWebKit/537.78 (KHTML, like Gecko)' }, result: 'other/playstation' },
  { signal: { agent: 'Mozilla/5.0 (PlayStation Vita 3.60) AppleWebKit/537.73 (KHTML, like Gecko) Silk/3.2' }, result: 'other/playstation' },
  { signal: { agent: 'Mozilla/5.0 (Ultimate Edition; X11; Linux ; rv:8.0) Gecko/#BUILDDATE Ultimate Edition #DIST / 5.0 Firefox' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Ultimate Edition; X11; Linux ; rv:8.0) Gecko/<NUMBER> Ultimate Edition 4.7 / 4.7 Firefox' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (Windows 95; WOW64; rv:41.0) Gecko/<NUMBER> Firefox/50.1.0 (x86 de) Anonymisiert durch AlMiSoft Browser-Maulkorb <NUMBER>' }, result: 'desktop/windows/95' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.0 Safari/537.36 AviraScout/16.9.2785.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.0 Safari/537.36 AviraScout/16.9.2785.1370' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 AviraScout/16.9.2785.1588' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36 AviraScout/16.10.2840.1818' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.75 Safari/537.36' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.0 Safari/537.36 AviraScout/16.9.2785.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.0 Safari/537.36 AviraScout/16.9.2785.1381' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:25.8) Gecko/<NUMBER> PaleMoon/25.8.1' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:35.0) Gecko/<NUMBER> Firefox/35.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:35.0) Gecko/<NUMBER> Firefox/35.0 DT-Browser/DTB7.35.0.11_01' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:35.0; WUID=b992dbf2b6f6eed<NUMBER>b<NUMBER>; WTB=3580) Gecko/<NUMBER> Firefox/35.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:37.0) Gecko/<NUMBER> Firefox/37.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:37.0.1) Gecko/<NUMBER> Firefox/37.0.1' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:38.0) Gecko/<NUMBER> IceDragon/38.0.5 Firefox/38.0.5' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:38.0; WUID=3ba<NUMBER>f74c932c4ee22af<NUMBER>; WTB=6787; WUID=0b8a793d8d80d3a<NUMBER>db1bc65ee49; WTB=<NUMBER>) Gecko/<NUMBER> Firefox/38.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:38.9) Gecko/<NUMBER> Goanna/2.2 Firefox/38.9 PaleMoon/26.5.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:39.0) Gecko/<NUMBER> Firefox/39.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:39.0; WUID=5bdbe34e80efa47ebf262cf8961a075a; WTB=6787) Gecko/<NUMBER> Firefox/39.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:40.0) Gecko/<NUMBER> Firefox/40.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:40.0) Gecko/<NUMBER> IceDragon/40.1.1.18 Firefox/40.0.2' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:40.0; WUID=3ee7a11a1ce<NUMBER>c<NUMBER>a0e<NUMBER>bd; WTB=6787) Gecko/<NUMBER> Firefox/40.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:41.0) Gecko/<NUMBER> Firefox/41.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:41.0) Gecko/<NUMBER> Firefox/44.0.2 (x86 de) Anonymisiert durch AlMiSoft Browser-Anonymisierer <NUMBER>' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:41.0; WUID=1da<NUMBER>dc<NUMBER>ea0a148b0868; WTB=3580) Gecko/<NUMBER> Firefox/41.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:41.0; WUID=4814d50fb<NUMBER>c5c63b46dc<NUMBER>ade; WTB=<NUMBER>; WUID=6103cb4ae643be<NUMBER>a8abdc64c757a; WTB=3772; WUID=4814d50fb<NUMBER>c5c63b46dc<NUMBER>ade; WTB=<NUMBER>) Gecko/<NUMBER> Firefox/41.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:42.0) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:42.0) Gecko/<NUMBER> Firefox/42.0 BLNGBAR BLNGBAR BLNGBAR BLNGBAR' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:42.0) Gecko/<NUMBER> Firefox/42.0 DT-Browser/DTB7.42.0.19_01' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:42.0) Gecko/<NUMBER> Firefox/42.0 OWASMIME/4.0500' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:45.0) Gecko/<NUMBER> Firefox/45.0 Cyberfox/45.0.3' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:45.0) Gecko/<NUMBER> Firefox/45.0 TO-Browser/TOB7.45.0.113_13' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:45.0) Gecko/<NUMBER> Firefox/45.2.1.003 AdAware/45.2.1.003' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:45.9) Gecko/<NUMBER> Goanna/3.0 Firefox/45.9 PaleMoon/27.0.3' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:46.0) Gecko/<NUMBER> Firefox/46.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:46.0) Gecko/<NUMBER> Firefox/46.0 BLNGBAR' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.<NUMBER>' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; WOW64; rv:41.0) Gecko/<NUMBER> Firefox/ Anonymisiert durch AlMiSoft Browser-Anonymisierer <NUMBER>' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; WOW64; rv:41.0) Gecko/<NUMBER> Firefox/40.0.3 (x86 de) Anonymisiert durch AlMiSoft Browser-Maulkorb <NUMBER>' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:3.0) Gecko/<NUMBER> Goanna/<NUMBER> PaleMoon/27.0.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:35.0) Gecko/<NUMBER> Firefox/35.0 Waterfox/35.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:38.9) Gecko/<NUMBER> Goanna/2.0 Firefox/38.9 PaleMoon/26.1.1' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:42.0; WUID=09cd12e<NUMBER>e4d9d<NUMBER>; WTB=<NUMBER>) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:42.0; WUID=3f0aa5926b4b4be3aaed511b<NUMBER>; WTB=6787) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:42.0; WUID=65b113d<NUMBER>bacf77be<NUMBER>e08c22; WTB=3580) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:42.0; WUID=a787f<NUMBER>f1bca965f01e32c4d07be3; WTB=<NUMBER>) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:43.0) Gecko/<NUMBER> Firefox/43.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:43.0) Gecko/<NUMBER> Firefox/43.0 Framafox/43.0.1' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:43.0; WUID=1b3f9262bdf83df3a6d<NUMBER>b1ed9506; WTB=3580) Gecko/<NUMBER> Firefox/43.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:43.0; WUID=b01d095f3389c33eebcf8864d7743b9f; WTB=<NUMBER>) Gecko/<NUMBER> Firefox/43.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:44.0) Gecko/<NUMBER> Firefox/44.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 10.0; rv:44.0; WUID=00e750b2f80a9c1e133af045d6d5c4e9; WTB=8679) Gecko/<NUMBER> Firefox/44.0' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Mspa; rv:2.0.1) Gecko/<NUMBER> Firefox/4.0.1' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:32.0) Gecko/<NUMBER> Firefox/32.0 BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR BLNGBAR' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/<NUMBER> Firefox/45.0; xs-Y60QMw57EYU;wKhMnI;' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.1; rv:45.0; ffco7; ffco7; ffco7; ffco7; ffco7; ffco7) Gecko/<NUMBER> Firefox/45.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; .NET4.0E; .NET4.0C; .NET CLR 3.5.<NUMBER>; .NET CLR 2.0.<NUMBER>; .NET CLR 3.0.<NUMBER>; InfoPath.3; rv:11.0) like Gecko' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows 95; de; rv:1.9.2.6) Gecko/<NUMBER> Firefox/50.1.0 (x86 de) Anonymisiert durch AlMiSoft Browser-Maulkorb <NUMBER>' }, result: 'desktop/windows/95' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 10.0; de; rv:1.9.2.6) Gecko/<NUMBER> Firefox/45.0.1 (x86 de) Anonymisiert durch AlMiSoft Browser-Anonymisierer <NUMBER>' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 5.0; de-DE; rv:1.7.6) Gecko/<NUMBER> Firefox/1.0.1' }, result: 'desktop/windows/2000' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 5.0; en-NZ; rv:1.8.1b2) Gecko/<NUMBER> Songbird/0.2' }, result: 'desktop/windows/2000' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 5.1; RW; rv:1.8.0.7; WUID=01ff4a<NUMBER>fdfd7e8c664fc7c3eb2; WTB=<NUMBER>) Gecko/<NUMBER> MultiZilla/4.33.2.6a SeaMonkey/8.6.55' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 6.0; de; rv:1.9.2.28; WUID=f23ea138c92a22e57d0257a2c7278a34; WTB=3580) Gecko/<NUMBER> Firefox/3.6.28 ( .NET CLR 3.5.<NUMBER>; .NET4.0C)' }, result: 'desktop/windows/vista' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 6.1; de; rv:1.9.2.28; WUID=5f6147b43a9a<NUMBER>e7ebdb0fe6c958; WTB=3580) Gecko/<NUMBER> Firefox/3.6.28' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows; U; Windows NT 6.3; Win64; x64; de; rv:1.9.2.6) Gecko/<NUMBER> Firefox/50.1.0 (x86 de) Anonymisiert durch AlMiSoft Browser-Anonymisierer <NUMBER>' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (Windows; Windows NT 10.0; WOW64; rv:45.1) Gecko/<NUMBER> Firefox/45.1' }, result: 'desktop/windows/10' },
  { signal: { agent: 'Mozilla/5.0 (Windows; Windows NT 6.1; Win64; x64; rv:48.0) Gecko/<NUMBER> Firefox/48.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (Windows; Windows NT 6.3; WOW64; rv:45.5) Gecko/<NUMBER> Firefox/45.5' }, result: 'desktop/windows/8.1' },
  { signal: { agent: 'Mozilla/5.0 (X11; Fedora; Linux i686; rv:44.0) Gecko/<NUMBER> Firefox/44.0' }, result: 'desktop/linux/fedora' },
  { signal: { agent: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:38.0) Gecko/<NUMBER> Firefox/38.0' }, result: 'desktop/linux/fedora' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD amd64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.124 Safari/537.36' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD amd64; rv:36.0) Gecko/<NUMBER> Firefox/36.0 SeaMonkey/2.33.1' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD amd64; rv:45.0) Gecko/<NUMBER> Firefox/45.0' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD i386; rv:36.0) Gecko/<NUMBER> Firefox/36.0 SeaMonkey/2.33.1' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD) AppleWebKit/537.21 (KHTML, like Gecko) konqueror/4.14.3 Safari/537.21' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; FreeBSD) KHTML/4.9.1 (like Gecko) Konqueror/4.9' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux armv7l; rv:38.0) Gecko/<NUMBER> Firefox/38.0 Iceweasel/38.8.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux armv7l; rv:45.0) Gecko/<NUMBER> Firefox/45.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i386; rv:45.0) Gecko/<NUMBER> Firefox/45.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:24.0) Gecko/<NUMBER> Firefox/24.0 PaleMoon/24.6.2' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:38.0) Gecko/<NUMBER> Firefox/38.0 Iceweasel/38.3.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:42.0) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.21 (KHTML, like Gecko) QupZilla/1.6.6 Safari/537.21' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.21 (KHTML, like Gecko) konqueror/4.14.3 Safari/537.21' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.21 (KHTML, like Gecko) rekonq/2.4.2 Safari/537.21' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.52 Safari/537.36 OPR/31.0.1889.50 (Edition beta)' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/36.0.1985.143 Chrome/36.0.1985.143 Safari/537.36' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/538.1 (KHTML, like Gecko) QupZilla/1.9.0 Safari/538.1' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/601.1 (KHTML, like Gecko) Version/8.0 Safari/601.1 Ubuntu/15.10 (3.16.3-1ubuntu1) Epiphany/3.16.3' }, result: 'desktop/linux/ubuntu/15.10' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686; U) Opera 7.50  [en]' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686; rv:10.0.1) Gecko/<NUMBER> Firefox/10.0.1 SeaMonkey/2.7.1' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686; rv:23.0) Gecko/<NUMBER> Firefox/23.0 Cunaguaro/23.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux i686; rv:3.0) Gecko/<NUMBER> Goanna/<NUMBER> PaleMoon/27.0.0' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.21 (KHTML, like Gecko) Chrome/19.0.1042.0 Safari/535.21' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; NetBSD amd64; rv:42.0) Gecko/<NUMBER> Firefox/42.0' }, result: 'desktop/bsd/netbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; NetBSD i386; rv:43.0) Gecko/<NUMBER> Firefox/43.0' }, result: 'desktop/bsd/netbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; OpenBSD amd64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.124 Safari/537.36' }, result: 'desktop/bsd/openbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; OpenBSD amd64; rv:36.0) Gecko/<NUMBER> Firefox/36.0 SeaMonkey/2.33.1' }, result: 'desktop/bsd/openbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; OpenBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36' }, result: 'desktop/bsd/openbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; OpenBSD i386; rv:36.0) Gecko/<NUMBER> Firefox/36.0 SeaMonkey/2.33.1' }, result: 'desktop/bsd/openbsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; U; FreeBSD i386; en-US; rv:1.7.12) Gecko/<NUMBER> Galeon/1.3.21' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (X11; U; Linux 2.4.3-20mdk i586; en-US; rv:0.9.1) Gecko/<NUMBER>' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; U; Linux i686; de; rv:1.9.1) Gecko/<NUMBER> Ubuntu/8.04 (hardy) Firefox/3.5' }, result: 'desktop/linux/ubuntu/8.04' },
  { signal: { agent: 'Mozilla/5.0 (X11; U; Linux i686; en-US) AppleWebKit/532.4 (KHTML, like Gecko) Chrome/4.0.233.0 Safari/532.4' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.7) Gecko/<NUMBER>' }, result: 'other/solaris' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux aarch64; rv:44.0) Gecko/<NUMBER> Firefox/44.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux armv7l; rv:47.0) Gecko/<NUMBER> Firefox/47.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux i686 on x86_64; rv:45.0) Gecko/<NUMBER> Firefox/45.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:12.0) Gecko/<NUMBER> Firefox/12.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:51.0) Gecko/<NUMBER> Firefox/51.0' }, result: 'desktop/linux/ubuntu' },
  { signal: { agent: 'Mozilla/5.0 (compatible)' }, result: 'other/mozilla/5.0-(compatible)' },
  { signal: { agent: 'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.1; Trident/7.0;  rv:11.0) like Gecko' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, result: 'other/mozilla/5.0-(compatible;-googlebot/2.1;-+http://www.google.com/bot.html)' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/3.2; FreeBSD) (KHTML, like Gecko)' }, result: 'desktop/bsd/freebsd' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/3.4; CYGWIN_NT-5.1) KHTML/3.4.89 (like Gecko)' }, result: 'other/mozilla/5.0-(compatible;-konqueror/3.4;-cygwin_nt-5.1)-khtml/3.4.89-(like-gecko)' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/3.4; Linux 2.6.8; X11; i686; en_US) KHTML/3.4.0 (like Gecko)' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/3.5; Darwin)  KHTML/3.5.6 (like Gecko)' }, result: 'other/mozilla/5.0-(compatible;-konqueror/3.5;-darwin)-khtml/3.5.6-(like-gecko)' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/3.5; Linux; X11; i686; en_US) KHTML/3.5.3 (like Gecko)' }, result: 'desktop/linux' },
  { signal: { agent: 'Mozilla/5.0 (compatible; Konqueror/4.0; Microsoft Windows) KHTML/4.0.80 (like Gecko)' }, result: 'other/mozilla/5.0-(compatible;-konqueror/4.0;-microsoft-windows)-khtml/4.0.80-(like-gecko)' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0; SLCC2; .NET CLR 2.0.<NUMBER>; .NET CLR 3.5.<NUMBER>; .NET CLR 3.0.<NUMBER>; Media Center PC 6.0; InfoPath.2; .NET4.0C)' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; Xbox; Xbox One)' }, result: 'desktop/windows/8' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 930' }, result: 'other/windows-phone' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 10.6; Windows NT 6.1; Trident/5.0; InfoPath.2; SLCC1; .NET CLR 3.0.4506.2152; .NET CLR 3.5.<NUMBER>; .NET CLR 2.0.<NUMBER>) 3gpp-gba UNTRUSTED/1.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 7_0_4 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) CriOS/34.0.1847.18 Mobile/11B554a Safari/9537.53' }, result: 'mobile/ios/7.0' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 8_1_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B436 Safari/600.1.4' }, result: 'mobile/ios/8.1' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12F69 Safari/600.1.4' }, result: 'mobile/ios/8.3' },
  { signal: { agent: 'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A345' }, result: 'mobile/ios/10.0' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A403' }, result: 'mobile/ios/10.0' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_2 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A456' }, result: 'mobile/ios/10.0' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_1_1 like Mac OS X) AppleWebKit/602.2.14 (KHTML, like Gecko) Mobile/14B100' }, result: 'mobile/ios/10.1' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B411 Safari/600.1.4' }, result: 'mobile/ios/8.1' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_1_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B440 Safari/600.1.4' }, result: 'mobile/ios/8.1' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_1_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B466 Safari/600.1.4' }, result: 'mobile/ios/8.1' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12D508 Safari/600.1.4' }, result: 'mobile/ios/8.2' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) CriOS/42.0.2311.47 Mobile/12F70 Safari/600.1.4' }, result: 'mobile/ios/8.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) CriOS/43.0.2357.61 Mobile/12F70 Safari/600.1.4' }, result: 'mobile/ios/8.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_4 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H143 Safari/600.1.4' }, result: 'mobile/ios/8.4' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_0_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13A452' }, result: 'mobile/ios/9.0' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13D15' }, result: 'mobile/ios/9.2' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13D15 Safari/601.1' }, result: 'mobile/ios/9.2' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13E233' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13E238' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13E238 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13F69' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13F69 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_3 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G34 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1' }, result: 'mobile/ios/9.3' },
  { signal: { agent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16' }, result: 'mobile/ios/3.0' },
  { signal: { agent: 'Mozilla/5.0 (masking-agent; rv:50.0) Gecko/<NUMBER> Firefox/50.0 Cyberfox/50.1.0' }, result: 'other/mozilla/5.0-(masking-agent;-rv:50.0)-gecko/<number>-firefox/50.0-cyberfox/50.1.0' },
  { signal: { agent: 'Mozilla/5.0 Gecko/<NUMBER> Firefox/2.0.0.0' }, result: 'other/mozilla/5.0-gecko/<number>-firefox/2.0.0.0' },
  { signal: { agent: 'Mozilla/5.0(Windows NT 6.1; WOW64; rv:38.0) Gecko/<NUMBER> Firefox/38.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0(Windows NT 6.1; WOW64; rv:40.0) Gecko/<NUMBER>Firefox/40.1' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0(Windows NT 6.1; rv:1.9.2) Gecko/<NUMBER> Firefox/3.6' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Mozilla/5.0+(X11;+U;+Linux+i686;+en-US;+rv:1.7.3)+Gecko/<NUMBER>' }, result: 'desktop/linux' },
  { signal: { agent: 'NetSurf/1.1 (Linux; i686)' }, result: 'desktop/linux' },
  { signal: { agent: 'Non Stop' }, result: 'other/non-stop' },
  { signal: { agent: 'Opera/7.60 (Windows NT 5.2; U)  [en] (IBM EVV/3.0/EAK01AG9/LE)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Opera/9.10 (Nintendo Wii; U; ; 1621; en)' }, result: 'other/nintendo' },
  { signal: { agent: 'Opera/9.52 (Windows NT 5.1; U; en)' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Opera/9.80 (Macintosh; Intel Mac OS X 10.8.2) Presto/2.12.388 Version/12.12' }, result: 'desktop/mac-os/10.8' },
  { signal: { agent: 'Opera/9.80 (Windows 98; U; de-DE) Presto/2.2.15 Version/10.10' }, result: 'desktop/windows/98' },
  { signal: { agent: 'Opera/9.80 (Windows NT 5.1) Presto/2.12.388 Version/12.12' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Opera/9.80 (Windows NT 5.1) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Opera/9.80 (Windows NT 5.1; U; de) Presto/2.2.15 Version/10.10' }, result: 'desktop/windows/xp' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/vista' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.0; Edition Campaign 21) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/vista' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; U; de-DE) Presto/2.10.229 Version/11.64' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; U; en) Presto/2.6.31 Version/10.70' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; U; en) Presto/2.8.131 Version/11.10' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.12' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.1; WOW64; Edition Campaign 21) Presto/2.12.388 Version/12.15' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.2; WOW64) Presto/2.12.388 Version/12.11' }, result: 'desktop/windows/8' },
  { signal: { agent: 'Opera/9.80 (Windows NT 6.2; WOW64) Presto/2.12.388 Version/12.12' }, result: 'desktop/windows/8' },
  { signal: { agent: 'PB0.6b Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/<NUMBER> Firefox/23.0' }, result: 'desktop/windows/7' },
  { signal: { agent: 'Unknown/X-Agent (Unknown; Version:X)' }, result: 'other/unknown/x-agent-(unknown;-version:x)' },
  { signal: { agent: 'WirSindDieMaharaProfis Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:50.0) Gecko/<NUMBER> Firefox/50.0' }, result: 'desktop/windows/10' },
  { signal: { agent: '[Austria] Wget/1.11.4' }, result: 'other/[austria]-wget/1.11.4' },
  { signal: { agent: 'edbrowse/2.2.10' }, result: 'other/edbrowse/2.2.10' },
  { signal: { agent: 'iPad cbr-test' }, result: 'other/ipad-cbr-test' },
  { signal: { agent: 'mMosaic/3.6.6 (X11;SunOS 5.8 sun4m)' }, result: 'other/solaris' },
  { signal: { agent: 'nokia' }, result: 'other/nokia' },
  { signal: { agent: 'vobsub' }, result: 'other/vobsub' },
  { signal: { agent: 'w3m/0.4.1' }, result: 'other/w3m/0.4.1' },
];

const COUNTRY_TESTS = [
  { signal: { country: 'DE' }, result: 'de' },
  { signal: { country: 'FR' }, result: 'fr' },
  { signal: { country: 'fr FR' }, result: 'fr-fr' },
  { signal: { country: 'de' }, result: 'de' },
  { signal: { country: '' }, result: '' },
  { signal: { country: null }, result: '' },
  { signal: { country: undefined }, result: '' },
];

// Used to mock demographics from platform
let channelMock;
let distributionMock;
let installDateMock;
let userAgentMock;
let countryMock;

function mockDemographics(demographics) {
  const defaultToEmptyString = value => (value === undefined ? '' : value);
  channelMock = defaultToEmptyString(demographics.channel);
  distributionMock = defaultToEmptyString(demographics.distribution);
  installDateMock = defaultToEmptyString(demographics.install_date);
  userAgentMock = defaultToEmptyString(demographics.agent);
  countryMock = defaultToEmptyString(demographics.country);
}

export default describeModule('anolysis/demographics',
  () => ({
    'platform/lib/ua-parser': {
      default: UAParser,
    },
    'platform/lib/moment': {
      default: moment,
    },
    'platform/demographics': {
      getChannel() { return channelMock; },
      getDistribution() { return distributionMock; },
      getInstallDate() { return installDateMock; },
      getUserAgent() { return userAgentMock; },
      getCountry() { return countryMock; },
    },
    'core/prefs': {
      default: {
        get(_, d) { return d; }
      },
    },
    'core/kord/inject': {
      default: {
        service: () => ({
          get: (_, d) => d,
        }),
      },
    },
    'core/logger': {
      default: { get() {
        return {
          debug() {},
          log() {},
          error() {},
        };
      } },
    },
    'core/synchronized-time': {
      default: () => moment('2017-01-01', 'YYYY-MM-DD'),
    },
  }),
  () => {
    let parseProduct;
    let parseCampaign;
    let parseExtension;
    let parseBrowser;

    let getDemographics;
    let getInstallDateAsDaysSinceEpoch;

    beforeEach(function () {
      parseBrowser = this.module().parseBrowser;
      parseExtension = this.module().parseExtension;
      parseCampaign = this.module().parseCampaign;
      parseProduct = this.module().parseProduct;
      getDemographics = this.module().default;
      getInstallDateAsDaysSinceEpoch = this.module().getInstallDateAsDaysSinceEpoch;
    });

    describe('#getDemographics', () => {
      describe('#parseBrowser', () => {
        it('handles empty input', () => {
          chai.expect(parseBrowser({})).to.eql('');
          chai.expect(parseBrowser({
            userAgent: '',
            distributionVersion: '',
          })).to.eql('');
        });

        it('handles Cliqz browser version', () => {
          chai.expect(parseBrowser({
            distributionVersion: '1.31.0',
          })).to.eql('cliqz/1/31/0');
        });

        it('handles Cliqz browser version even if user agent specified', () => {
          chai.expect(parseBrowser({
            distributionVersion: '1.31.0',
            userAgent: 'foo bar',
          })).to.eql('cliqz/1/31/0');
        });

        describe('parses browser from user agent', () => {
          [
            [ // Firefox
              'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
              'firefox/47/0',
            ],
            [ // Brave
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) brave/0.8.3 Chrome/49.0.2623.108 Brave/0.37.3 Safari/537.36',
              'brave/0/8/3',
            ],
            [ // Edge
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134',
              'edge/17/17134',
            ],
            [ // Safari
              'Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
              'mobile-safari/12/1',
            ],
            [
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7',
              'safari/9/1/3',
            ],
            [ // Yandex
              'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/536.5 (KHTML, like Gecko) YaBrowser/1.0.1084.5404 Chrome/19.0.1084.5404 Safari/536.5',
              'yandex/1/0/1084',
            ],
            [ // IE
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
              'ie/6/0',
            ],
            [ // Chromium
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/534.30 (KHTML, like Gecko) Ubuntu/11.04 Chromium/12.0.742.112 Chrome/12.0.742.112 Safari/534.30',
              'chromium/12/0/742',
            ],
            [
              'Mozilla/5.0 (Unknown; Linux) AppleWebKit/538.1 (KHTML, like Gecko) Chrome/v1.0.0 Safari/538.1',
              'chrome/1/0/0',
            ],
          ].forEach(([userAgent, expected]) => {
            it(userAgent, () => {
              chai.expect(parseBrowser({ userAgent })).to.eql(expected);
            });
          });
        });
      });

      describe('#parseExtension', () => {
        it('handles falsy version', () => {
          chai.expect(parseExtension()).to.eql('');
          chai.expect(parseExtension(null)).to.eql('');
          chai.expect(parseExtension(undefined)).to.eql('');
          chai.expect(parseExtension('')).to.eql('');
        });

        it('handles version', () => {
          chai.expect(parseExtension('1.42.0')).to.eql('1/42/0');
        });

        it('ignores extra components', () => {
          chai.expect(parseExtension('1.42.0.1')).to.eql('1/42/0');
        });
      });

      describe('#parseCampaign', () => {
        describe('full_distribution', () => {
          [
            ['keyword=%2Bbrowser&pk_campaign=GA255850517658', 'google/ga255850517658/browser'],
            ['keyword=%2Bbrowser&pk_campaign=LP_myoffrz_126', 'other/keyword=%2bbrowser&pk_campaign=lp_myoffrz_126'],
            ['keyword=%2Bcliqz&pk_campaign=GA383310118991', 'google/ga383310118991/cliqz'],
            ['keyword=+cliqz', 'other/keyword=+cliqz'],
            ['keyword=+cliqz&pk_campaign=GA383310118991', 'google/ga383310118991/cliqz'],
            ['keyword=bester', 'other/keyword=bester'],
            ['keyword=bester%20browser&pk_campaign=GA383247426190', 'google/ga383247426190/bester-browser'],
            ['keyword=cliqz&pk_campaign=BI77309456060829', 'bing/bi77309456060829/cliqz'],
            ['keyword=cliqz&pk_campaign=GA383310118979', 'google/ga383310118979/cliqz'],
            ['keyword=internet%20browser&pk_campaign=ns0001', 'netzsieger/ns0001/internet-browser'],
            ['null', 'other/null'],
            ['keyword=null', 'other/keyword=null'],
            ['keyword=null&pk_campaign=BI77515614320362', 'bing/bi77515614320362/null'],
            ['keyword=null&pk_campaign=GA216161890473', 'google/ga216161890473/null'],
            ['keyword=null&pk_campaign=fb_privacyawareness_de', 'facebook/fb_privacyawareness_de/null'],
            ['keyword=null&pk_campaign=gavd_views_all_de', 'google/gavd_views_all_de/null'],
            ['keyword=null&pk_campaign=ns0001', 'netzsieger/ns0001/null'],
            ['keyword=null&pk_campaign=null', 'other/keyword=null&pk_campaign=null'],
            ['keyword=null&pk_campaign=tw_privacyawareness', 'twitter/tw_privacyawareness/null'],
            ['keyword=null&pk_campaign=twlp9', 'twitter/twlp9/null'],
            ['keyword=null&pk_campaign=yt_privacyawareness', 'youtube/yt_privacyawareness/null'],
            ['pk_campaign=BI77309456060829', 'bing/bi77309456060829'],
            ['pk_campaign=amo2', 'other/pk_campaign=amo2'],
            ['pk_campaign=fb_privacyawareness_en', 'facebook/fb_privacyawareness_en'],
            ['pk_campaign=fp1', 'focus/fp1'],
            ['pk_campaign=fromBlogPost', 'other/pk_campaign=fromblogpost'],
            ['pk_campaign=galp112', 'galp/galp112'],
            ['pk_campaign=ns0001', 'netzsieger/ns0001'],
            ['pk_campaign=softonic0005', 'other/pk_campaign=softonic0005'],
            ['pk_campaign=web0003', 'cliqz-website/web0003'],
          ].forEach(([fullDistribution, expected]) => {
            it(`${fullDistribution}`, () => {
              chai.expect(parseCampaign(fullDistribution)).to.eql(expected);
            });
          });
        });
      });

      describe('#parseProduct', () => {
        it('handle no config demographics', () => {
          chai.expect(parseProduct(undefined)).to.eql('');
        });

        it('handle empty config demographics', () => {
          chai.expect(parseProduct({})).to.eql('');
        });

        it('handle brand only', () => {
          chai.expect(parseProduct({ brand: 'brand' })).to.eql('brand');
        });

        it('handle name only', () => {
          chai.expect(parseProduct({ name: 'name' })).to.eql('');
        });

        it('handle platform only', () => {
          chai.expect(parseProduct({ platform: 'platform' })).to.eql('');
        });

        it('handle branch + name', () => {
          chai.expect(parseProduct({ brand: 'brand', name: 'name' })).to.eql('brand/name');
        });

        it('handle brand + platform', () => {
          chai.expect(parseProduct({ brand: 'brand', platform: 'platform' })).to.eql('brand');
        });

        it('handle name + platform', () => {
          chai.expect(parseProduct({ name: 'name', platform: 'platform' })).to.eql('');
        });

        it('handle brand + name + platform', () => {
          chai.expect(parseProduct({
            brand: 'brand',
            name: 'name',
            platform: 'platform',
          })).to.eql('brand/name/platform');
        });

        it('apply normalization', () => {
          chai.expect(parseProduct({
            brand: ' Brand ',
            name: 'NAME',
            platform: 'pl at fo rm',
          })).to.eql('brand/name/pl-at-fo-rm');
        });
      });

      [
        [COUNTRY_TESTS, 'country'],
        [INSTALL_DATE_TESTS, 'install_date'],
        [OS_TESTS, 'os'],
      ].forEach(([tests, factor]) => {
        tests.forEach((testCase) => {
          const signal = testCase.signal;
          const result = testCase.result;
          signal.type = 'environment';

          it(`Should parse ${JSON.stringify(signal)}`, () => {
            mockDemographics(signal);
            return getDemographics('0.0.0', {}).then((demographics) => {
              chai.expect(demographics[factor]).to.be.eql(result);
            });
          });
        });
      });
    });

    describe('#getInstallDateAsDaysSinceEpoch', () => {
      [
        { installDate: 0, result: 0 },
        { installDate: 1, result: 1 },
        { installDate: 1642, result: 1642 },
        { installDate: '19700101', result: 0 },
        { installDate: '19700102', result: 1 },
        { installDate: '20160101', result: 16801 },
        { installDate: '20170505', result: 17291 },
        { installDate: '20181130', result: 17865 },
      ].forEach(({ installDate, result }) => {
        it(`returns correct result for: ${installDate}`, async () => {
          mockDemographics({ install_date: installDate });
          chai.expect(await getInstallDateAsDaysSinceEpoch()).to.eql(result);
        });
      });
    });
  });
