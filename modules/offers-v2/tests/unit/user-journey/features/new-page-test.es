/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const commonMocks = require('../../utils/common');

export default describeModule('offers-v2/user-journey/features/new-page',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('add a step to user journey', function () {
      let addStepMock;
      let eventHandler;
      let featurer;

      beforeEach(async function () {
        const EventHandler = (await this.system.import('offers-v2/event_handler')).default;
        eventHandler = new EventHandler();
        addStepMock = sinon.stub();
        const journeyCollector = { addStep: addStepMock, addFeature: () => {} };
        const UnknownPage = this.module().default;
        featurer = new UnknownPage(eventHandler, journeyCollector);
        featurer.init();
      });

      afterEach(async function () {
        featurer.destroy();
      });

      it('/notify collector about an unknown page', () => {
        eventHandler.onTabLocChanged({ url: 'http://some.domain.com/' });

        chai.expect(addStepMock).to.be.called;
        chai.expect(addStepMock.firstCall.args).to.eql([{
          feature: 'unk',
          url: 'http://some.domain.com/'
        }]);
      });

      it('/notify collector about amazon page', () => {
        eventHandler.onTabLocChanged({ url: 'http://www.amazon.co.uk/' });

        chai.expect(addStepMock.firstCall.args).to.eql([{
          feature: 'amazon',
          url: 'http://www.amazon.co.uk/',
        }]);
      });

      it('/notify collector about ebay page', () => {
        eventHandler.onTabLocChanged({ url: 'http://www.ebay.de/' });

        chai.expect(addStepMock.firstCall.args).to.eql([{
          feature: 'ebay',
          url: 'http://www.ebay.de/',
        }]);
      });

      it('/notify collector about main search engines', () => {
        const fixture = [
          'http://www.google.co.uk/search.php',
          'https://Bing.cn',
          'http://Yandex.ru',
          'https://wWw.Baidu.com',
          'http://Yahoo.co.uk',
          'https://de.ask.com/web?q=schuhe&qsrc=0&o=0&l=dir&qo=homepageSearchBox',
          'https://fireball.com/search?q=bier',
          'http://www.lycos.de/',
          'https://www.qwant.com/?l=de',
          'http://www.exalead.com/search/web/',
          'https://www.Gigablast.com/search?c=main&qlangcountry=en-us&q=test',
          'https://DuckDuckGo.com/?q=bier&t=h_&ia=web',
        ];
        fixture.forEach((url) => {
          addStepMock.reset();

          eventHandler.onTabLocChanged({ url });

          chai.expect(addStepMock.firstCall.args, url).to.eql([{
            feature: 'search-top',
            url,
          }]);
        });
      });

      it('/notify collector about meta search', () => {
        const fixture = [
          'https://metager.de/',
          'http://metacrawler.de/',
          'http://www.extraktsearch.de/lexiquo_result8D.html?ESP&ENG&pro&test&msn&screenlang=ESP',
          'https://search.disconnect.me/',
          'https://www.dogpile.com/',
          'https://www.StartPage.com/',
          'https://suche.t-online.de/fast-cgi/tsc?sr=ptoweb&q=bayern',
          'https://suche.web.de/web/result?origin=HP&q=fu%C3%9Fball',
          'https://suche.gmx.net/web/result?origin=HP&q=bier',
          'https://www.ecosia.org/search?q=baum',
          'https://www.hotbot.com/web?q=bot',
          'https://www.wolframalpha.com/input/?i=cliqz',
        ];
        fixture.forEach((url) => {
          addStepMock.reset();

          eventHandler.onTabLocChanged({ url });

          chai.expect(addStepMock.firstCall.args, url).to.eql([{
            feature: 'metasearch',
            url,
          }]);
        });
      });

      it('/regression: do not crash on local domains', () => {
        const url = 'http://my-little-pony:8000/index.html';
        eventHandler.onTabLocChanged({ url });

        chai.expect(addStepMock.firstCall.args, url).to.eql([{
          feature: 'unk',
          url,
        }]);
      });

      it('/do not annotate special google domains as search-top', () => {
        const url1 = 'http://mail.google.com';
        const url2 = 'http://account.google.de';
        const url3 = 'http://wWw.google.de/search';
        const url4 = 'http://www.google.de/mail';
        [url1, url2, url3, url4].forEach(url =>
          eventHandler.onTabLocChanged({ url }));

        chai.expect(addStepMock.args).to.eql([
          [{ feature: 'unk', url: url1 }],
          [{ feature: 'unk', url: url2 }],
          [{ feature: 'search-top', url: url3 }],
          [{ feature: 'unk', url: url4 }],
        ]);
      });
    });
  });
