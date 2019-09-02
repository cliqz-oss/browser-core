/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const R = require('ramda');

export default describeModule('human-web/ad-detection',
  () => ({}),
  () => {
    const expect = chai.expect;

    describe('normalizeAclkUrl', function () {
      let normalizeAclkUrl;

      beforeEach(function () {
        normalizeAclkUrl = this.module().normalizeAclkUrl;
      });

      it('should fail for non-aclk urls', function () {
        ['', 'http://example.com', 'http://www.google.com'].forEach((url) => {
          expect(() => normalizeAclkUrl(url)).to.throw();
        });
      });

      it('should consider ads to be identical if only their "ved" code differs', function () {
        const sharedPrefix = 'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAJGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_36ojDsT8n10T9Xg6jpqqFpeAlvWQ&ctype=5&q=';
        const sharedSuffix = '&adurl=';

        const url1 = `${sharedPrefix}&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4IpAE${sharedSuffix}`;
        const url2 = `${sharedPrefix}&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ9aACCKcB${sharedSuffix}`;

        const key1 = normalizeAclkUrl(url1);
        const key2 = normalizeAclkUrl(url2);

        expect(key1).to.equal(key2);
      });

      it('should ignore "adurl" and "q" parameters', function () {
        const url1 = 'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjJt6z20PrWAhUiKNMKHfvTB4kYABAAGgJ3Yg&ohost=www.google.de&cid=CAASEuRobxFBtt0g1nfQpKP2P2hE6Q&sig=AOD64_0B3ktCajIy1rkz-mH2AO8PDPAmug&adurl=&q=';
        const url2 = 'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjJt6z20PrWAhUiKNMKHfvTB4kYABAAGgJ3Yg&ohost=www.google.de&cid=CAASEuRobxFBtt0g1nfQpKP2P2hE6Q&sig=AOD64_0B3ktCajIy1rkz-mH2AO8PDPAmug&q=&adurl=';

        const key1 = normalizeAclkUrl(url1);
        const key2 = normalizeAclkUrl(url2);

        expect(key1).to.equal(key2);
      });

      it('should not rely on the order of "adurl" and "q" parameters', function () {
        const url1 = 'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjo8OmgzPrWAhXuCtMKHQbaAt0YABAAGgJ3Yg&ohost=www.google.de&cid=CAASEuRovOsq8jYWW7VzZbLgEFV4vw&sig=AOD64_2K3umt-jl0hvOZeZXWExyyAWAfjw&q=&ved=0ahUKEwjareagzPrWAhVBvhQKHeCCDzEQ0QwIZA&adurl=';
        const url2 = 'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjo8OmgzPrWAhXuCtMKHQbaAt0YABAAGgJ3Yg&ohost=www.google.de&cid=CAASEuRovOsq8jYWW7VzZbLgEFV4vw&sig=AOD64_2K3umt-jl0hvOZeZXWExyyAWAfjw&adurl=&ved=0ahUKEwjareagzPrWAhVBvhQKHeCCDzEQ0QwIZA&q=';

        const key1 = normalizeAclkUrl(url1);
        const key2 = normalizeAclkUrl(url2);

        expect(key1).to.equal(key2);
      });

      it('should map different ads to different normalized strings', function () {
        const urls = [
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAAGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_0iZf149HO9tmAdBuXWsYrMVIF9xQ&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ0QwIKA&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAFGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_1GFh2-IlzDNYtcnfEypFCU5V9mEA&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ0QwINA&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAHGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_1BN2dYOV_iA9sa_EfGQLzcAwy1Dg&ctype=5&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4IngE&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAJGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_36ojDsT8n10T9Xg6jpqqFpeAlvWQ&ctype=5&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4IpAE&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABALGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_1VajZWWaPWohWazKfZa96Z1h2mbg&ctype=5&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4IqgE&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABANGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_3GQWCcTw0tGIOyytQsafH8j1XlCQ&ctype=5&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4IsAE&adurl=',
          'https://www.googleadservices.com/pagead/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAPGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_2iP4NeSXmb_bEN11-8_xOYKLzVAw&ctype=5&q=&ved=0ahUKEwirx4qVwLPWAhXHXBQKHXDqCTEQ8w4ItgE&adurl'
        ];

        const keys = new Map();
        urls.forEach((url) => {
          const newKey = normalizeAclkUrl(url);
          if (keys[newKey]) {
            throw new Error(`Both\n${keys[newKey]}\nand\n${url}\nhave been mapped to the same key:\n${newKey}`);
          }
          keys[newKey] = url;
        });
      });

      it('should consider ads to be identical if only the first part of the URL (before "aclk") differs', () => {
        const prefixes = [
          'https://www.googleadservices.com/pagead',
          'http://www.googleadservices.com/pagead',
          '',
          'https://www.google.com',
          'https://www.google.de',
        ];

        const sharedSuffix = '/aclk?sa=L&ai=DChcSEwjyu42VwLPWAhUQnhsKHYgzAZcYABAJGgJ3bA&ohost=www.google.de&cid=CAASEuRopco2XerPuHClGWTnWaddQg&sig=AOD64_36ojDsT8n10T9Xg6jpqqFpeAlvWQ&ctype=5&q=';
        const urls = prefixes.map(prefix => prefix + sharedSuffix);

        // all urls should be mapped to the same key
        const keys = R.uniq(urls.map(normalizeAclkUrl));
        expect(keys).to.have.lengthOf(1);
      });
    });
  });
