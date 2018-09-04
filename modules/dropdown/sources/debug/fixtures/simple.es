export default {
  'simple-results': {
    query: 'ro',
    results: [
      {
        template: 'result',
        title: 'Spielen - Kostenlose Spiele Spielen',
        url: "http://www.royalgames.com/Murphy's_law",
        description: 'Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
        data: {},
      }, {
        url: 'https://cliqz.com/q=query 1 ro',
        type: 'suggestion',
        data: { suggestion: 'query 1 ro', source: 'Cliqz', template: 'suggestion' }
      }, {
        url: 'https://cliqz.com/q=romantic',
        type: 'suggestion',
        data: { suggestion: 'romantic', source: 'Cliqz', template: 'suggestion' }
      },
      {
        url: 'https://cliqz.com/q=romantic1',
        type: 'suggestion',
        data: { suggestions: ['romantic', 'romantic 1', 'romantic2'], source: 'Cliqz', template: 'inline-suggestion' }
      }
    ]
  },
  'two-simple-results': {
    query: 'query',
    results: [
      {
        template: 'result',
        title: 'Spielen - Kostenlose Spiele Spielen',
        description: 'Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
        url: 'http://www.royalgames.com/',
        data: {},
      },
      {
        template: 'result',
        title: 'Twitch',
        description: "Twitch is the world's leading video platform and community for gamers. More than 45 million gamers gather every month on Twitch to broadcast, watch and chat about gaming. Twitch's video platform is the backbone of both live and on-demand distribution for the entire video game ecosystem. This includes game publishers, developers, media outlets, industry conventions and press conferences, casual gamers and gaming for charity events. Twitch also caters to the entire esports industry, spanning the t",
        url: 'https://www.twitch.tv/rocketbeanstv',
        data: {},
      },
    ]
  },
};
