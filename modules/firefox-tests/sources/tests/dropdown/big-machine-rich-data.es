/* global it, expect, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

export default function () {
  context('big machine result with rich data', function () {
    const results = [
      {
        url: 'de.wikipedia.org/wiki/GitHub',
        score: 385,
        source: 'bm',
        snippet: {
          deepResults: [
            {
              links: [
                {
                  image: 'https://cdn.cliqz.com/snippets/wikipedia/images/de/GitHub_logo_2013.svg',
                  url: 'https://cdn.cliqz.com/snippets/wikipedia/images/de/GitHub_logo_2013.svg'
                },
                {
                  image: 'https://cdn.cliqz.com/snippets/wikipedia/images/en/Mapping_collaborative_software_on_GitHub.png',
                  url: 'https://cdn.cliqz.com/snippets/wikipedia/images/en/Mapping_collaborative_software_on_GitHub.png'
                },
                {
                  image: 'https://cdn.cliqz.com/snippets/wikipedia/images/en/GitHub_logo_2013_padded.svg',
                  url: 'https://cdn.cliqz.com/snippets/wikipedia/images/en/GitHub_logo_2013_padded.svg'
                }
              ],
              type: 'images'
            },
            {
              links: [
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Eigenschaften'
                  },
                  title: 'Eigenschaften',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Eigenschaften'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Einzelnachweise'
                  },
                  title: 'Einzelnachweise',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Einzelnachweise'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Geschichte'
                  },
                  title: 'Geschichte',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Geschichte'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Kritik'
                  },
                  title: 'Kritik',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Kritik'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Literatur'
                  },
                  title: 'Literatur',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Literatur'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Verwendung'
                  },
                  title: 'Verwendung',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Verwendung'
                },
                {
                  extra: {
                    m_url: 'http://de.m.wikipedia.org/wiki/GitHub#Weblinks'
                  },
                  title: 'Weblinks',
                  url: 'http://de.wikipedia.org/wiki/GitHub#Weblinks'
                }
              ],
              type: 'simple_links'
            }
          ],
          description: 'GitHub ist ein webbasierter Online-Dienst, der Software-Entwicklungsprojekte auf seinen Servern bereitstellt. Namensgebend war das Versionsverwaltungssystem Git.',
          extra: {
            alternatives: [
              'http://de.wikipedia.org/wiki/Github'
            ],
            language: {
              de: 1
            },
            m_url: 'http://de.m.wikipedia.org/wiki/GitHub',
            rich_data: {
              attr: [],
              langlinks: [
                'http://it.wikipedia.org/wiki/GitHub',
                'http://pl.wikipedia.org/wiki/GitHub',
                'http://en.wikipedia.org/wiki/GitHub',
                'http://fr.wikipedia.org/wiki/GitHub',
                'http://es.wikipedia.org/wiki/GitHub'
              ],
              source_language: 'DE',
              source_name: 'Wikipedia',
              top_infos: []
            }
          },
          title: 'GitHub'
        },
        c_url: 'https://de.wikipedia.org/wiki/GitHub',
        type: 'bm',
        template: 'hq'
      }
    ];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('github');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders result', function () {
      it('with correct title', function () {
        const titleSelector = ".abstract span[data-extra='title']";
        expect(resultElement).to.contain(titleSelector);
        expect(resultElement.querySelector(titleSelector)).to.have.text(results[0].snippet.title);
      });

      it('with correct description', function () {
        const descriptionSelector = ".abstract span[class='description']";
        expect(resultElement).to.contain(descriptionSelector);
        expect(resultElement.querySelector(descriptionSelector))
          .to.have.text(results[0].snippet.description);
      });

      it('with correct url', function () {
        const urlSelector = ".abstract span[class='url']";
        expect(resultElement).to.contain(urlSelector);
        expect(resultElement.querySelectorAll(urlSelector)[1]).to.have.text(results[0].url);
      });

      it('with logo', function () {
        const logoSelector = ".icons span[class='logo']";
        expect(resultElement).to.contain(logoSelector);
      });
    });

    describe('renders images', function () {
      it('successfully', function () {
        const imagesAreaSelector = '.images.padded';
        expect(resultElement.querySelector(imagesAreaSelector)).to.exist;
      });

      it('correct amount of images', function () {
        const imagesSelector = '.images.padded a.result';
        const amountOfImages = (results[0].snippet.deepResults[0].links).length;
        if (amountOfImages <= 4) {
          expect(resultElement.querySelectorAll(imagesSelector).length).to.equal(amountOfImages);
        } else {
          expect(resultElement.querySelectorAll(imagesSelector).length).to.equal(4);
        }
      });

      it('correct images', function () {
        const imagesSelector = '.images.padded a.result img';
        const imagesItems = resultElement.querySelectorAll(imagesSelector);
        [].forEach.call(imagesItems, function (image, i) {
          expect(image.src).to.be.equal(results[0].snippet.deepResults[0].links[i].image);
        });
      });

      it('correct links', function () {
        const imagesSelector = '.images.padded a.result';
        const imagesItems = resultElement.querySelectorAll(imagesSelector);
        [].forEach.call(imagesItems, function (image, i) {
          expect(image.href).to.be.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders simple links', function () {
      it('successfully', function () {
        const linksAreaSelector = '.anchors.padded';
        expect(resultElement.querySelector(linksAreaSelector)).to.exist;
      });

      it('correct amount of links', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const amountOfSimpleLinks = (results[0].snippet.deepResults[1].links).length;
        if (amountOfSimpleLinks <= 4) {
          expect(resultElement.querySelectorAll(simpleLinksSelector).length)
            .to.equal(amountOfSimpleLinks);
        } else {
          expect(resultElement.querySelectorAll(simpleLinksSelector).length).to.equal(4);
        }
      });

      it('with correct titles', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const simpleLinksItems = resultElement.querySelectorAll(simpleLinksSelector);
        [].forEach.call(simpleLinksItems, function (link, i) {
          expect(link.title).to.be.equal(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('with correct urls', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const simpleLinksItems = resultElement.querySelectorAll(simpleLinksSelector);
        [].forEach.call(simpleLinksItems, function (link, i) {
          expect(link.href).to.be.equal(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });
  });
}
