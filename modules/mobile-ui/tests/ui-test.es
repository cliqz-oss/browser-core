/* global  chai, describeModule */

export default describeModule('mobile-ui/UI',
  function () {
    return {
      'mobile-ui/webview': {
        window: {
          addEventListener() { },
          document: {
            getElementById() {}
          },
        }
      },
      'core/templates': {
        default: {
          TEMPLATES: []
        }
      },
      'core/utils': {
        default: {},
      },
      'viewpager': {},
      'core/http': {}
    };
  },
  function () {
    let NO_MOBILE_URL_RESULT = {
      'val': 'http://www.onmeda.de/krankheiten/magersucht.html'
    };
    let MOBILE_URL_RESULT = {
      'val': 'http://www.onmeda.de/krankheiten/magersucht.html',
      'data': {
        'mobile_url': 'http://www.onmeda.de/amp/krankheiten/magersucht.html'
      }
    };
    let M_URL_RESULT = {
      'internal_links': [
        {
          'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Leben',
          'title': 'Leben',
          'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Leben'
        },
        {
          'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#K.C3.BCnstlerischer_Werdegang',
          'title': 'Künstlerischer Werdegang',
          'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#K.C3.BCnstlerischer_Werdegang'
        },
        {
          'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Diskografie',
          'title': 'Diskografie',
          'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Diskografie'
        },
        {
          'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Weblinks',
          'title': 'Weblinks',
          'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Weblinks'
        },
        {
          'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Quellen',
          'title': 'Quellen',
          'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Quellen'
        }
      ]
    };
    describe('Set Mobile urls', function () {
      it('should not replace val if no mobile url supported', function () {
        this.module().default.setMobileBasedUrls(NO_MOBILE_URL_RESULT);
        chai.expect(NO_MOBILE_URL_RESULT.val).to.equal('http://www.onmeda.de/krankheiten/magersucht.html');
      });
      it('should set val with amp_url', function () {
        this.module().default.setMobileBasedUrls(MOBILE_URL_RESULT);
        chai.expect(MOBILE_URL_RESULT.val).to.equal('http://www.onmeda.de/amp/krankheiten/magersucht.html');
      });
      it('should set links url with m_url', function () {
        this.module().default.setMobileBasedUrls(M_URL_RESULT);
        M_URL_RESULT.internal_links.forEach(link => chai.expect(link.url).to.equal(link.m_url));
      });
    });
  }
);
