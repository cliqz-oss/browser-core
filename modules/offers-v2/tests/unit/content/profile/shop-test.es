/* global chai */
/* global describeModule */
/* global require */
const JSDOM = require('jsdom').jsdom;

export default describeModule('offers-v2/content/profile/shop',
  () => ({
  }),
  () => {
    describe('shop page detection', function () {
      let isShopPage;

      beforeEach(function () {
        isShopPage = this.module().isShopPage;
      });

      context('isShopPage', function () {
        it('/find word "shop" in the title', () => {
          const doc = new JSDOM(
            `<html lang="de-DE"><head>
              <title>Parfümerie, Kosmetik & Beauty Online Shop | DOUGLAS</title>
              </head></html>`,
            { url: 'https://www.douglas.de/' }
          );

          const isShop = isShopPage(doc);

          chai.expect(isShop).to.be.true;
        });

        it('/find class "cart" (amazon case)', () => {
          const doc = new JSDOM(
            `<a href="https://www.amazon.de/gp/cart/view.html?ref_=nav_cart" aria-label="0 Artikel in Einkaufswagen" class="nav-a nav-a-2" id="nav-cart" tabindex="31">
              <span aria-hidden="true" class="nav-line-1">Einkaufs-</span>
              <span aria-hidden="true" class="nav-line-2">wagen<span class="nav-icon nav-arrow"></span>
              </span>
              <span class="nav-cart-icon nav-sprite"></span>
              <span id="nav-cart-count" aria-hidden="true" class="nav-cart-count nav-cart-0">0</span>
            </a>`,
            { url: 'https://www.amazon.de/' }
          );

          const isShop = isShopPage(doc);

          chai.expect(isShop).to.be.true;
        });

        it('/find class "basket"', () => {
          const doc = new JSDOM(
            '<a class="nav-basket" title="Warenkorb" href="https://www.as-garten.de/checkout/cart/"><img src="https://www.as-garten.de/skin/frontend/bragento/default/images/ico-cart-nav2.png" alt="ico-cart-nav" /></a>',
            { url: 'http://as-garten.de/sales' }
          );

          const isShop = isShopPage(doc);

          chai.expect(isShop).to.be.true;
        });

        it('/find a keyword in icon properties', () => {
          const fixture = {
            'src-cart': '<img src="ico2018-cart.svg" />',
            'title-cart': '<img title="ico2018-cart.svg" />',
            'alt-cart': '<img alt="ico2018-cart.svg" />',
            'title-warenkorb': '<img title="Warenkorb" />',
          };
          Object.entries(fixture).forEach(([annot, html]) => {
            const doc = new JSDOM(html);

            const isShop = isShopPage(doc);

            chai.expect(isShop, annot).to.be.true;
          });
        });
      });
    });
  });
