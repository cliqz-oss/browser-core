export default [
  {
    url: 'http://www.bundesliga.de',
    score: 0,
    snippet: {
      extra: {
        language: 'de',
        leagueId: '1',
        leagueName: '1. Bundesliga',
        ranking: [
          {
            PKT: 9,
            SP: 3,
            TD: 7,
            club: 'Bayern München',
            rank: 1
          },
          {
            PKT: 7,
            SP: 3,
            TD: 5,
            club: 'Borussia Dortmund',
            rank: 2
          },
          {
            PKT: 7,
            SP: 3,
            TD: 3,
            club: 'VfL Wolfsburg',
            rank: 3
          },
          {
            PKT: 7,
            SP: 3,
            TD: 3,
            club: 'Hertha BSC',
            rank: 4
          },
          {
            PKT: 7,
            SP: 3,
            TD: 3,
            club: 'Bor. Mönchengladbach',
            rank: 4
          },
          {
            PKT: 7,
            SP: 3,
            TD: 2,
            club: 'Mainz 05',
            rank: 6
          },
          {
            PKT: 5,
            SP: 3,
            TD: 1,
            club: 'Werder Bremen',
            rank: 7
          },
          {
            PKT: 4,
            SP: 3,
            TD: 0,
            club: 'FC Augsburg',
            rank: 8
          },
          {
            PKT: 4,
            SP: 3,
            TD: 0,
            club: 'Fortuna Düsseldorf',
            rank: 8
          },
          {
            PKT: 4,
            SP: 3,
            TD: -2,
            club: 'RB Leipzig',
            rank: 10
          },
          {
            PKT: 3,
            SP: 3,
            TD: -1,
            club: 'TSG Hoffenheim',
            rank: 11
          },
          {
            PKT: 3,
            SP: 3,
            TD: -1,
            club: 'Eintracht Frankfurt',
            rank: 12
          },
          {
            PKT: 2,
            SP: 3,
            TD: -1,
            club: 'Hannover 96',
            rank: 13
          },
          {
            PKT: 2,
            SP: 3,
            TD: -1,
            club: 'FC Nürnberg',
            rank: 14
          },
          {
            PKT: 1,
            SP: 3,
            TD: -4,
            club: 'SC Freiburg',
            rank: 15
          },
          {
            PKT: 1,
            SP: 3,
            TD: -4,
            club: 'VfB Stuttgart',
            rank: 16
          },
          {
            PKT: 0,
            SP: 3,
            TD: -4,
            club: 'Schalke 04',
            rank: 17
          },
          {
            PKT: 0,
            SP: 3,
            TD: -6,
            club: 'Bayer Leverkusen',
            rank: 18
          }
        ],
        result_type: {
          league_table: true
        },
        static: {
          description: null,
          links: []
        },
        title: '1. Bundesliga Tabelle',
        url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/18/tabellenrechner.html'
      },
      friendlyUrl: 'bundesliga.de',
      last_update: 1537184941.765946
    },
    type: 'rh',
    subType: {
      class: 'SoccerEZ',
      id: '99e45a0e28545958d9766c67bd48dac79248c030340e3b7b432261dffc67cbc9',
      name: 'TABLE: 1. Bundesliga'
    },
    template: 'ligaEZTable',
    trigger: [
      'bundesliga.de'
    ],
    trigger_method: 'query'
  }
];
