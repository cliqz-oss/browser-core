/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const resultsBeforeRerank = [
  {
    links: [
      {
        url: 'https://www.google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        href: 'https://www.google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        friendlyUrl: 'google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        extra: {
          searchEngineName: 'Google'
        },
        kind: [
          'default-search'
        ],
        provider: 'instant',
        suggestion: 'fc bayern ',
        text: 'fc bayern',
        type: 'supplementary-search',
        meta: {
          level: 0,
          type: 'main',
          domain: 'google.com',
          host: 'google.com',
          hostAndPort: 'google.com',
          port: '',
          url: 'google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
          subType: {

          }
        }
      }
    ]
  },
  {
    links: [
      {
        url: 'https://fcbayern.com/de',
        href: 'https://fcbayern.com/de',
        friendlyUrl: 'fcbayern.com/de',
        description: '',
        extra: {
          language: 'de',
          matches: [
            {
              GUESS: 'SC Freiburg',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '15:30',
              gameUtcTimestamp: 1541255400,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/SC-Freiburg.png',
              guestScore: '1',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '1',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/10/4243346/spielanalyse_bayern-muenchen-14_sc-freiburg-7.html',
              scored: '1 : 1',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 10'
            },
            {
              GUESS: 'AEK Athen',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '21:00',
              gameUtcTimestamp: 1541620800,
              group: 'Gruppe E',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/AEK-Athen.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/Champions-League.png',
              leagueName: 'Champions League',
              live_url: 'http://www.kicker.de/news/fussball/chleague/spielrunde/champions-league/2018-19/4/4546674/spielvorschau_bayern-muenchen-14_aek-athen-1000.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 4 - (2)'
            },
            {
              GUESS: 'Bayern München',
              HOST: 'Borussia Dortmund',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '18:30',
              gameUtcTimestamp: 1541871000,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Borussia-Dortmund.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/11/4243356/spielinfo_borussia-dortmund-17_bayern-muenchen-14.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 11'
            },
            {
              GUESS: 'Fortuna Düsseldorf',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '15:30',
              gameUtcTimestamp: 1543069800,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Fortuna-Duesseldorf.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/12/4243364/spielinfo_bayern-muenchen-14_fortuna-duesseldorf-13.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 12'
            }
          ],
          title: 'Bayern München Spieltag - Spielplan - Ergebnisse',
          url: 'http://www.kicker.de/news/fussball/bundesliga/vereine/1-bundesliga/2017-18/bayern-muenchen-14/vereinstermine.html'
        },
        kind: [
          'X|{"class":"SoccerEZ"}'
        ],
        provider: 'cliqz',
        template: 'ligaEZ1Game',
        text: 'fc bayern ',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'fcbayern.com',
          host: 'fcbayern.com',
          hostAndPort: 'fcbayern.com',
          port: '',
          url: 'fcbayern.com/de',
          score: 0,
          subType: {
            class: 'SoccerEZ',
            id: '4981bb0fe7dc2740e424b32b10b7f370b4639bb4edc093c2eefbb33c636420e9',
            name: 'TEAM: Bayern München'
          },
          latency: 166,
          backendCountry: 'de',
          completion: ''
        }
      },
      {
        url: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
        href: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
        friendlyUrl: 'weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden',
        title: 'Neururer sicher: "Bayern München ist schwächer geworden"',
        extra: {
          breaking: false,
          creation_timestamp: 1541511715,
          description: 'Magere Auftritte gegen Mainz, SV Rödinghausen und den SC Freiburg setzen Trainer Niko Kovac beim Fußball-Bundesligisten Bayern München unter Druck. Peter Neururer, Ex-Coach des VfL Bochum, fand nun klare Worte.',
          domain: 'weltfussball.de',
          murl: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
          thumbnail: 'http://localhost:3000/static/images/2Ojy_e82Ddh_l.jpg'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'weltfussball.de',
          host: 'weltfussball.de',
          hostAndPort: 'weltfussball.de',
          port: '',
          url: 'weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden',
          subType: {

          },
          completion: ''
        }
      },
      {
        url: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        href: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        friendlyUrl: 'goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        title: 'FC Bayern München: News und Transfergerüchte zum FCB - Goretzka heiß auf den BVB',
        extra: {
          breaking: false,
          creation_timestamp: 1541497934,
          description: 'Sportliche Krise, Zweifel am Trainer und Spitzenspiel gegen den BVB vor der Brust: Rund um den FC Bayern ist im Moment eine Menge los.',
          domain: 'goal.com',
          murl: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
          thumbnail: 'http://localhost:3000/static/images/javi-martinez-bayern-04112018_baojporn13pw14tap5vjnye64.jpg?t=-404917906&quality=100&h=300'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'goal.com',
          host: 'goal.com',
          hostAndPort: 'goal.com',
          port: '',
          url: 'goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
          subType: {

          },
          completion: ''
        }
      },
      {
        url: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        href: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        friendlyUrl: 'derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        title: 'FC Bayern München: Lisa Müller löscht Fotos mit Thomas - das soll der Grund sein',
        extra: {
          breaking: false,
          creation_timestamp: 1541497925,
          description: 'Seit ihrem kritischen Instagram-Post am Samstag kehrt bei Lisa Müller, der Ehefrau von FC-Bayern-Star Thomas Müller, einfach keine Ruhe mehr ein.Während des...',
          domain: 'derwesten.de',
          murl: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
          thumbnail: 'http://localhost:3000/static/images/Thomas-und-Lisa-Mueller.jpg'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'derwesten.de',
          host: 'derwesten.de',
          hostAndPort: 'derwesten.de',
          port: '',
          url: 'derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
          subType: {

          },
          completion: ''
        }
      }
    ]
  },
  {
    links: [
      {
        url: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern',
        href: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern',
        friendlyUrl: 'abendzeitung-muenchen.de/thema/FC_Bayern',
        title: 'FC Bayern München: Aktuelle News & Gerüchte vom FC Bayern - Abendzeitung München',
        description: 'Alle News zum FC Bayern München: Aktuelle Meldungen, Spielberichte, Transfers und Gerüchte. Statistiken, Bilder und Videos. Alles zum FCB hier.',
        extra: {
          alternatives: [
            'https://www.abendzeitung-muenchen.de/thema/FC_Bayern'
          ],
          language: {
            de: 0.98
          },
          og: {
            description: 'Alle News zum FC Bayern München: Aktuelle Meldungen, Spielberichte, Transfers und Gerüchte. Statistiken, Bilder und Videos. Alles zum FCB hier.',
            image: 'https://imgr.cliqz.com/xfrVmz_67-8yEKUB9QRKt5GmLbXKXYX0Cs8T_I1FHek/fill/0/200/no/1/aHR0cHM6Ly93d3cuYWJlbmR6ZWl0dW5nLW11ZW5jaGVuLmRlL3d3dy9hYmVuZHplaXR1bmdfbXVlbmNoZW4vaW1hZ2VzL2xvZ29fc29jaWFsLmpwZw.jpg',
            'image:height': '210',
            'image:width': '210',
            title: 'FC Bayern München: Aktuelle News & Gerüchte vom FC Bayern - Abendzeitung München',
            type: 'website',
            url: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern'
          }
        },
        kind: [
          'm'
        ],
        provider: 'cliqz',
        text: 'fc bayern ',
        type: 'bm',
        meta: {
          level: 0,
          type: 'main',
          domain: 'abendzeitung-muenchen.de',
          host: 'abendzeitung-muenchen.de',
          hostAndPort: 'abendzeitung-muenchen.de',
          port: '',
          url: 'abendzeitung-muenchen.de/thema/fc_bayern',
          score: 0,
          subType: {

          },
          latency: 166,
          backendCountry: 'de',
          completion: ''
        }
      }
    ]
  }
];

const resultsAfterRerank = [
  {
    links: [
      {
        url: 'https://www.google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        href: 'https://www.google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        friendlyUrl: 'google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
        extra: {
          searchEngineName: 'Google'
        },
        kind: [
          'default-search'
        ],
        provider: 'instant',
        suggestion: 'fc bayern ',
        text: 'fc bayern',
        type: 'supplementary-search',
        meta: {
          level: 0,
          type: 'main',
          domain: 'google.com',
          host: 'google.com',
          hostAndPort: 'google.com',
          port: '',
          url: 'google.com/search?q=fc+bayern+&ie=utf-8&oe=utf-8&client=firefox-b-ab',
          subType: {

          }
        }
      }
    ]
  },
  {
    links: [
      {
        url: 'https://fcbayern.com/de',
        href: 'https://fcbayern.com/de',
        friendlyUrl: 'fcbayern.com/de',
        description: '',
        extra: {
          language: 'de',
          matches: [
            {
              GUESS: 'SC Freiburg',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '15:30',
              gameUtcTimestamp: 1541255400,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/SC-Freiburg.png',
              guestScore: '1',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '1',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/10/4243346/spielanalyse_bayern-muenchen-14_sc-freiburg-7.html',
              scored: '1 : 1',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 10'
            },
            {
              GUESS: 'AEK Athen',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '21:00',
              gameUtcTimestamp: 1541620800,
              group: 'Gruppe E',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/AEK-Athen.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/Champions-League.png',
              leagueName: 'Champions League',
              live_url: 'http://www.kicker.de/news/fussball/chleague/spielrunde/champions-league/2018-19/4/4546674/spielvorschau_bayern-muenchen-14_aek-athen-1000.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 4 - (2)'
            },
            {
              GUESS: 'Bayern München',
              HOST: 'Borussia Dortmund',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '18:30',
              gameUtcTimestamp: 1541871000,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Borussia-Dortmund.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/11/4243356/spielinfo_borussia-dortmund-17_bayern-muenchen-14.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 11'
            },
            {
              GUESS: 'Fortuna Düsseldorf',
              HOST: 'Bayern München',
              club: 'Bayern München',
              extraTimeScore: '- : -',
              gameTime: '15:30',
              gameUtcTimestamp: 1543069800,
              group: '',
              guestExtraTimeScore: '-',
              guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Fortuna-Duesseldorf.png',
              guestScore: '-',
              guestShootOutScore: '-',
              hostExtraTimeScore: '-',
              hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
              hostScore: '-',
              hostShootOutScore: '-',
              isLive: false,
              leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
              leagueName: '1. Bundesliga',
              live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2018-19/12/4243364/spielinfo_bayern-muenchen-14_fortuna-duesseldorf-13.html',
              scored: '- : -',
              shootOutScore: '- : -',
              spielTag: 'Spieltag 12'
            }
          ],
          title: 'Bayern München Spieltag - Spielplan - Ergebnisse',
          url: 'http://www.kicker.de/news/fussball/bundesliga/vereine/1-bundesliga/2017-18/bayern-muenchen-14/vereinstermine.html'
        },
        kind: [
          'X|{"class":"SoccerEZ"}'
        ],
        provider: 'cliqz',
        template: 'ligaEZ1Game',
        text: 'fc bayern ',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'fcbayern.com',
          host: 'fcbayern.com',
          hostAndPort: 'fcbayern.com',
          port: '',
          url: 'fcbayern.com/de',
          score: 0,
          subType: {
            class: 'SoccerEZ',
            id: '4981bb0fe7dc2740e424b32b10b7f370b4639bb4edc093c2eefbb33c636420e9',
            name: 'TEAM: Bayern München'
          },
          latency: 166,
          backendCountry: 'de',
          completion: ''
        }
      },
      {
        url: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
        href: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
        friendlyUrl: 'weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden',
        title: 'Neururer sicher: "Bayern München ist schwächer geworden"',
        extra: {
          breaking: false,
          creation_timestamp: 1541511715,
          description: 'Magere Auftritte gegen Mainz, SV Rödinghausen und den SC Freiburg setzen Trainer Niko Kovac beim Fußball-Bundesligisten Bayern München unter Druck. Peter Neururer, Ex-Coach des VfL Bochum, fand nun klare Worte.',
          domain: 'weltfussball.de',
          murl: 'https://www.weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden/',
          thumbnail: 'http://localhost:3000/static/images/2Ojy_e82Ddh_l.jpg'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'weltfussball.de',
          host: 'weltfussball.de',
          hostAndPort: 'weltfussball.de',
          port: '',
          url: 'weltfussball.de/news/_n3421336_/neururer-sicher-bayern-muenchen-ist-schwaecher-geworden',
          subType: {

          },
          completion: ''
        }
      },
      {
        url: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        href: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        friendlyUrl: 'goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
        title: 'FC Bayern München: News und Transfergerüchte zum FCB - Goretzka heiß auf den BVB',
        extra: {
          breaking: false,
          creation_timestamp: 1541497934,
          description: 'Sportliche Krise, Zweifel am Trainer und Spitzenspiel gegen den BVB vor der Brust: Rund um den FC Bayern ist im Moment eine Menge los.',
          domain: 'goal.com',
          murl: 'https://www.goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
          thumbnail: 'http://localhost:3000/static/images/javi-martinez-bayern-04112018_baojporn13pw14tap5vjnye64.jpg?t=-404917906&quality=100&h=300'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'goal.com',
          host: 'goal.com',
          hostAndPort: 'goal.com',
          port: '',
          url: 'goal.com/de/meldungen/fc-bayern-muenchen-news-transfer-geruechte-fcb-goretzka-bvb/1l6y11t0bf3dp17ncqiu5u9lz1',
          subType: {

          },
          completion: ''
        }
      },
      {
        url: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        href: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        friendlyUrl: 'derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
        title: 'FC Bayern München: Lisa Müller löscht Fotos mit Thomas - das soll der Grund sein',
        extra: {
          breaking: false,
          creation_timestamp: 1541497925,
          description: 'Seit ihrem kritischen Instagram-Post am Samstag kehrt bei Lisa Müller, der Ehefrau von FC-Bayern-Star Thomas Müller, einfach keine Ruhe mehr ein.Während des...',
          domain: 'derwesten.de',
          murl: 'https://www.derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
          thumbnail: 'http://localhost:3000/static/images/Thomas-und-Lisa-Mueller.jpg'
        },
        kind: [

        ],
        meta: {
          level: 1,
          type: 'news',
          domain: 'derwesten.de',
          host: 'derwesten.de',
          hostAndPort: 'derwesten.de',
          port: '',
          url: 'derwesten.de/sport/fussball/fc-bayern-muenchen-lisa-mueller-instagram-fotos-id215731359.html',
          subType: {

          },
          completion: ''
        }
      }
    ]
  },
  {
    links: [
      {
        url: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern',
        href: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern',
        friendlyUrl: 'abendzeitung-muenchen.de/thema/FC_Bayern',
        title: 'FC Bayern München: Aktuelle News & Gerüchte vom FC Bayern - Abendzeitung München',
        description: 'Alle News zum FC Bayern München: Aktuelle Meldungen, Spielberichte, Transfers und Gerüchte. Statistiken, Bilder und Videos. Alles zum FCB hier.',
        extra: {
          alternatives: [
            'https://www.abendzeitung-muenchen.de/thema/FC_Bayern'
          ],
          language: {
            de: 0.98
          },
          og: {
            description: 'Alle News zum FC Bayern München: Aktuelle Meldungen, Spielberichte, Transfers und Gerüchte. Statistiken, Bilder und Videos. Alles zum FCB hier.',
            image: 'https://imgr.cliqz.com/xfrVmz_67-8yEKUB9QRKt5GmLbXKXYX0Cs8T_I1FHek/fill/0/200/no/1/aHR0cHM6Ly93d3cuYWJlbmR6ZWl0dW5nLW11ZW5jaGVuLmRlL3d3dy9hYmVuZHplaXR1bmdfbXVlbmNoZW4vaW1hZ2VzL2xvZ29fc29jaWFsLmpwZw.jpg',
            'image:height': '210',
            'image:width': '210',
            title: 'FC Bayern München: Aktuelle News & Gerüchte vom FC Bayern - Abendzeitung München',
            type: 'website',
            url: 'https://www.abendzeitung-muenchen.de/thema/FC_Bayern'
          }
        },
        kind: [
          'm'
        ],
        provider: 'cliqz',
        text: 'fc bayern ',
        type: 'bm',
        meta: {
          level: 0,
          type: 'main',
          domain: 'abendzeitung-muenchen.de',
          host: 'abendzeitung-muenchen.de',
          hostAndPort: 'abendzeitung-muenchen.de',
          port: '',
          url: 'abendzeitung-muenchen.de/thema/fc_bayern',
          score: 0,
          subType: {

          },
          latency: 166,
          backendCountry: 'de',
          completion: ''
        }
      }
    ]
  }
];

module.exports = { resultsBeforeRerank, resultsAfterRerank };
