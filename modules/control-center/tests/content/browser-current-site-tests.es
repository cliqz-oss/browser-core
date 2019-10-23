/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataFalse, generateDataTrue } from './fixtures/current-site';

function currentSiteTests(amo) {
  const dataFalse = generateDataFalse(amo);
  const dataTrue = generateDataTrue(amo);
  const target = 'control-center';
  let subject;

  before(function () {
    subject = new Subject();
  });

  describe('pushing data, specialUrl = false', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataFalse
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('exists', function () {
      const sectionSelector = '#control-center #currentsite';
      expect(subject.query(sectionSelector)).to.exist;
    });

    it('renders site name', function () {
      const siteSelector = '#control-center #currentsite .truncate .dark';
      expect(subject.query(siteSelector)).to.exist;
      expect(subject.query(siteSelector).textContent.trim()).to.equal(dataFalse.domain);
    });

    it('link for "Report URL" is correct', function () {
      const objectSelector = '#control-center #currentsite .reportsite';
      expect(subject.query(objectSelector)).to.exist;
      expect(subject.query(objectSelector).getAttribute('target')).to.equal('https://cliqz.com/report-url');
    });

    it('renders "Report URL"', function () {
      const linkSelector = '#control-center #currentsite .reportsite';
      expect(subject.query(linkSelector)).to.exist;
      expect(subject.query(linkSelector).textContent.trim()).to.equal('control_center_report_url');
    });
  });

  describe('pushing data, specialUrl = true', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataTrue
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('exists', function () {
      const sectionSelector = '#control-center #currentsite';
      expect(subject.query(sectionSelector)).to.exist;
    });

    it('renders site name', function () {
      const siteSelector = '#control-center #currentsite .truncate .dark';
      expect(subject.query(siteSelector)).to.exist;
      expect(subject.query(siteSelector).textContent.trim()).to.equal(dataTrue.friendlyURL);
    });

    it('link for "Report URL" is correct', function () {
      const objectSelector = '#control-center #currentsite .reportsite';
      expect(subject.query(objectSelector)).to.exist;
      expect(subject.query(objectSelector).getAttribute('target')).to.equal('https://cliqz.com/report-url');
    });

    it('renders "Report URL"', function () {
      const linkSelector = '#control-center #currentsite .reportsite';
      expect(subject.query(linkSelector)).to.exist;
      expect(subject.query(linkSelector).textContent.trim()).to.equal('control_center_report_url');
    });
  });
}

describe('Control Center: Current site section UI tests browser', function () {
  currentSiteTests(false);
});


describe('Control Center: AMO, Current site section UI tests', function () {
  currentSiteTests(true);
});
