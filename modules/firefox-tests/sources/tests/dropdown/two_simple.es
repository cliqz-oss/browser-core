/* global it, expect, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

export default function () {
  context('for two generic results', function () {
    const results = [
      {
        url: 'royalgames.com',
        snippet: {
          title: 'title_1: Spielen - Kostenlose Spiele Spielen',
          description: 'description_1: Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
        },
      },
      {
        url: 'twitch.tv/rocketbeanstv',
        snippet: {
          title: 'title_2: Twitch',
          description: "description_2: Twitch is the world's leading video platform and community for gamers. More than 45 million gamers gather every month on Twitch to broadcast, watch and chat about gaming. Twitch's video platform is the backbone of both live and on-demand distribution for the entire video game ecosystem. This includes game publishers, developers, media outlets, industry conventions and press conferences, casual gamers and gaming for charity events. Twitch also caters to the entire esports industry, spanning the t",
        },
      }
    ];
    let resultElement1;
    let resultElement2;

    beforeEach(function () {
      respondWith({ results });
      fillIn('ro');
      return waitForPopup().then(function () {
        resultElement1 = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0];
        resultElement2 = $cliqzResults().find(`a.result[href='${results[1].url}']`)[0];
      });
    });

    it('renders first title', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect(resultElement1).to.contain(titleSelector);
      expect(resultElement1.querySelector(titleSelector)).to.have.text(results[0].snippet.title);
    });

    it('renders first description', function () {
      const descriptionSelector = ".abstract span[class='description']";
      expect(resultElement1).to.contain(descriptionSelector);
      expect(resultElement1.querySelector(descriptionSelector))
        .to.have.text(results[0].snippet.description);
    });

    it('renders first url', function () {
      const urlSelector = ".abstract span[class='url']";
      expect(resultElement1).to.contain(urlSelector);
      expect(resultElement1.querySelector(urlSelector)).to.have.text(results[0].url);
    });

    it('renders first logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect(resultElement1).to.contain(logoSelector);
    });

    it('renders second title', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect(resultElement2).to.contain(titleSelector);
      expect(resultElement2.querySelector(titleSelector)).to.have.text(results[1].snippet.title);
    });

    it('renders second description', function () {
      const descriptionSelector = ".abstract span[class='description']";
      expect(resultElement2).to.contain(descriptionSelector);
      expect(resultElement2.querySelector(descriptionSelector))
        .to.have.text(results[1].snippet.description);
    });

    it('renders second url', function () {
      const urlSelector = ".abstract span[class='url']";
      expect(resultElement2).to.contain(urlSelector);
      expect(resultElement2.querySelector(urlSelector)).to.have.text(results[1].url);
    });

    it('renders second logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect(resultElement2).to.contain(logoSelector);
    });
  });
}
