export default [
  {
    url: 'http://www.bundesliga.de/de/liga/tabelle',
    score: 9848,
    snippet: {
      description: 'Die aktuelle Tabelle der Bundesliga mit allen Informationen zu Punkten, Tore, Heimbilanz, Auswärtsbilanz, Form',
      extra: {
        info_list: {
          N: 'Verloren',
          PKT: 'Punkte',
          S: 'Siege',
          SP: 'Spiele',
          TD: 'Tordiff',
          U: 'Remis',
          club: 'Mannschaft',
          goals: 'Tore +:-',
          qualified: 'Qualifiziert',
          rank: 'Platz'
        },
        leagueId: '1',
        leagueName: '1. Bundesliga',
        ranking: [
          {
            GT: 0,
            N: 0,
            PKT: 13,
            S: 4,
            SP: 5,
            T: 13,
            TD: 13,
            U: 1,
            club: 'Borussia Dortmund',
            goals: '13:0',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Borussia-Dortmund.png',
            qualified: 'Champions League',
            rank: 1
          },
          {
            GT: 3,
            N: 1,
            PKT: 12,
            S: 4,
            SP: 5,
            T: 12,
            TD: 9,
            U: 0,
            club: 'Bayern München',
            goals: '12:3',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
            qualified: 'Champions League',
            rank: 2
          },
          {
            GT: 5,
            N: 0,
            PKT: 11,
            S: 3,
            SP: 5,
            T: 9,
            TD: 4,
            U: 2,
            club: 'TSG Hoffenheim',
            goals: '9:5',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/TSG-Hoffenheim.png',
            qualified: 'Champions League',
            rank: 3
          },
          {
            GT: 2,
            N: 0,
            PKT: 11,
            S: 3,
            SP: 5,
            T: 6,
            TD: 4,
            U: 2,
            club: 'Hannover 96',
            goals: '6:2',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Hannover-96.png',
            qualified: 'Champions League',
            rank: 4
          },
          {
            GT: 4,
            N: 1,
            PKT: 10,
            S: 3,
            SP: 5,
            T: 8,
            TD: 4,
            U: 1,
            club: 'FC Augsburg',
            goals: '8:4',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Augsburg.png',
            qualified: 'Champions League',
            rank: 5
          },
          {
            GT: 6,
            N: 2,
            PKT: 9,
            S: 3,
            SP: 5,
            T: 7,
            TD: 1,
            U: 0,
            club: 'FC Schalke 04',
            goals: '7:6',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Schalke-04.png',
            qualified: 'Champions League',
            rank: 6
          },
          {
            GT: 5,
            N: 1,
            PKT: 8,
            S: 2,
            SP: 5,
            T: 7,
            TD: 2,
            U: 2,
            club: 'Bor. Mönchengladbach',
            goals: '7:5',
            logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bor-Moenchengladbach.png',
            qualified: 'Champions League',
            rank: 7
          },
        ],
        result_type: {
          league_table: true
        },
        title: '1. Bundesliga Tabelle',
        url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/spieltag.html'
      },
      friendlyUrl: 'bundesliga.de/de/liga/tabelle',
      title: 'Bundesliga | Tabelle | Spieltag 1 | Saison 2016/2017'
    },
    c_url: 'http://www.bundesliga.de/de/liga/tabelle',
    type: 'rh',
    subType: {
      class: 'SoccerEZ',
      id: '184384238616031931',
      name: 'TABLE: 1. Bundesliga'
    },
    template: 'ligaEZTable',
    trigger: [
      'bundesliga.de/de/liga/tabelle'
    ],
    trigger_method: 'url'
  },
];
