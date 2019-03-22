import { getUrl } from '../../../core/test-helpers';

const finalWithoutHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'water',
      text: 'water',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {},
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          mozActionUrl: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
          searchEngineName: 'Google'
        },
        kind: [
          'custom-search'
        ],
        suggestion: 'water'
      }
    },
    {
      url: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      href: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      friendlyUrl: 'pubchem.ncbi.nlm.nih.gov/compound/water',
      title: 'Water | H2O - PubChem',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'water',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'nih.gov',
        host: 'pubchem.ncbi.nlm.nih.gov',
        hostAndPort: 'pubchem.ncbi.nlm.nih.gov',
        port: '',
        url: 'pubchem.ncbi.nlm.nih.gov/compound/water',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: 'https://en.wikipedia.org/wiki/Water',
      href: 'https://en.wikipedia.org/wiki/Water',
      friendlyUrl: 'en.wikipedia.org/wiki/Water',
      title: 'Water',
      description: "Water is a transparent, tasteless, odorless, and nearly colorless chemical substance, which is the main constituent of Earth's streams, lakes, and oceans, and the fluids of most living organisms. It is vital for all known forms of life, even though it provides no calories or organic nutrients. Its chemical formula is HO, meaning that each of its molecules contains one oxygen and two hydrogen atoms connected by covalent bonds. Water is the name of the liquid state of HO at standard ambient temper",
      kind: [
        'H',
        'h'
      ],
      style: 'favicon',
      provider: 'history',
      template: 'hq',
      text: 'water',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'wikipedia.org',
        host: 'en.wikipedia.org',
        hostAndPort: 'en.wikipedia.org',
        port: '',
        url: 'en.wikipedia.org/wiki/water',
        subType: {},
        originalUrl: 'https://en.wikipedia.org/wiki/Water',
        isEnriched: true,
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [
          {
            type: 'images',
            links: [
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                image: 'https://imgr.cliqz.com/BVpPhpDJyLamrJKPYaUGp0yFQaA4aNDFt45NDe69_K8/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0dyYW5kX0Fuc2VfQmVhY2hfR3JlbmFkYS5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/grand_anse_beach_grenada.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                image: 'https://imgr.cliqz.com/wjL0h0BIXh_Nq71E0dnnPpgnKLvX2PsAYci7QIAWeEs/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL1N0ZXJpbGV3YXRlci5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/sterilewater.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                href: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                friendlyUrl: 'upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                image: 'https://imgr.cliqz.com/nZN_LOdAZT2xpfXLXibHYh49UPmFx-v2ZofFL73IgxE/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi8yLzJmL0F1dG8tYW5kX2hldGVyb3Ryb3Bocy5zdmcvMTQ1cHgtQXV0by1hbmRfaGV0ZXJvdHJvcGhzLnN2Zy5wbmc.png',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikimedia.org',
                  host: 'upload.wikimedia.org',
                  hostAndPort: 'upload.wikimedia.org',
                  port: '',
                  url: 'upload.wikimedia.org/wikipedia/commons/thumb/2/2f/auto-and_heterotrophs.svg/145px-auto-and_heterotrophs.svg.png',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                image: 'https://imgr.cliqz.com/8j-QjAXRcrbng8yOiHXLOwTNYGH0f9ihmZwlNQf9QEc/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0JhbmRfNV9BTE1BX3JlY2VpdmVyLmpwZw.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/band_5_alma_receiver.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                href: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                friendlyUrl: 'upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                image: 'https://imgr.cliqz.com/yTE0MSH1bICABJoIB1ezEDSKCH8nWXxWFSoD5stdjxI/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi9jL2M2LzNEX21vZGVsX2h5ZHJvZ2VuX2JvbmRzX2luX3dhdGVyLnN2Zy8xNDVweC0zRF9tb2RlbF9oeWRyb2dlbl9ib25kc19pbl93YXRlci5zdmcucG5n.png',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikimedia.org',
                  host: 'upload.wikimedia.org',
                  hostAndPort: 'upload.wikimedia.org',
                  port: '',
                  url: 'upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3d_model_hydrogen_bonds_in_water.svg/145px-3d_model_hydrogen_bonds_in_water.svg.png',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                image: 'https://imgr.cliqz.com/IIzEmNkArIC_fIuRDSI-yHz0775INfgCetSrk2HfnII/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL01ILTYwU19IZWxpY29wdGVyX2R1bXBzX3dhdGVyX29udG9fRmlyZS5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/mh-60s_helicopter_dumps_water_onto_fire.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                image: 'https://imgr.cliqz.com/8w2wWP-c_KQPCe4jgfhNcBHfouoRJ0qigUzbIZDyKlo/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0h1bWFuaXRhcmlhbl9haWRfT0NQQS0yMDA1LTEwLTI4LTA5MDUxN2EuanBn.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/humanitarian_aid_ocpa-2005-10-28-090517a.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                image: 'https://imgr.cliqz.com/hlHgYefcVCjUKVI_iNkjoUOOFzkkxcZ7u5l857u22BY/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0xvbmd3b29kX0dhcmRlbnMtSXRhbGlhbl9HYXJkZW4uanBn.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/longwood_gardens-italian_garden.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              }
            ]
          },
          {
            type: 'simple_links',
            links: [
              {
                url: 'https://en.wikipedia.org/wiki/Water#Etymology',
                href: 'https://en.wikipedia.org/wiki/Water#Etymology',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Etymology',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Etymology'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#etymology',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Chemical_and_physical_properties',
                href: 'https://en.wikipedia.org/wiki/Water#Chemical_and_physical_properties',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Chemical and physical properties',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Chemical_and_physical_properties'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#chemical_and_physical_properties',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#On_Earth',
                href: 'https://en.wikipedia.org/wiki/Water#On_Earth',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'On Earth',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#On_Earth'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#on_earth',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_life',
                href: 'https://en.wikipedia.org/wiki/Water#Effects_on_life',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Effects on life',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_life'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#effects_on_life',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_human_civilization',
                href: 'https://en.wikipedia.org/wiki/Water#Effects_on_human_civilization',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Effects on human civilization',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_human_civilization'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#effects_on_human_civilization',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Distribution_in_nature',
                href: 'https://en.wikipedia.org/wiki/Water#Distribution_in_nature',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Distribution in nature',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Distribution_in_nature'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#distribution_in_nature',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis',
                href: 'https://en.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Law, politics, and crisis',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#law.2c_politics.2c_and_crisis',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#In_culture',
                href: 'https://en.wikipedia.org/wiki/Water#In_culture',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'In culture',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#In_culture'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#in_culture',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#See_also',
                href: 'https://en.wikipedia.org/wiki/Water#See_also',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'See also',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#See_also'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#see_also',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#References',
                href: 'https://en.wikipedia.org/wiki/Water#References',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'References',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#References'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#references',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Further_reading',
                href: 'https://en.wikipedia.org/wiki/Water#Further_reading',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Further reading',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Further_reading'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#further_reading',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#External_links',
                href: 'https://en.wikipedia.org/wiki/Water#External_links',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'External links',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#External_links'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#external_links',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Properties_of_water',
                href: 'http://en.wikipedia.org/wiki/Properties_of_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Properties_of_water',
                title: 'Properties of water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Properties_of_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/properties_of_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Hydrology',
                href: 'http://en.wikipedia.org/wiki/Hydrology',
                friendlyUrl: 'en.wikipedia.org/wiki/Hydrology',
                title: 'Hydrology',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Hydrology'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/hydrology',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_cycle',
                href: 'http://en.wikipedia.org/wiki/Water_cycle',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_cycle',
                title: 'Water cycle',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_cycle'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_cycle',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_resources',
                href: 'http://en.wikipedia.org/wiki/Water_resources',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_resources',
                title: 'Water resources',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_resources'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_resources',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Seawater',
                href: 'http://en.wikipedia.org/wiki/Seawater',
                friendlyUrl: 'en.wikipedia.org/wiki/Seawater',
                title: 'Seawater',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Seawater'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/seawater',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Drinking_water',
                href: 'http://en.wikipedia.org/wiki/Drinking_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Drinking_water',
                title: 'Drinking water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Drinking_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/drinking_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Ship_transport',
                href: 'http://en.wikipedia.org/wiki/Ship_transport',
                friendlyUrl: 'en.wikipedia.org/wiki/Ship_transport',
                title: 'Ship transport',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Ship_transport'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/ship_transport',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_sport_(recreation)',
                href: 'http://en.wikipedia.org/wiki/Water_sport_(recreation)',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_sport_(recreation)',
                title: 'Water sport (recreation)',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_sport_(recreation)'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_sport_(recreation)',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_law',
                href: 'http://en.wikipedia.org/wiki/Water_law',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_law',
                title: 'Water law',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_law'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_law',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_and_religion',
                href: 'http://en.wikipedia.org/wiki/Water_and_religion',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_and_religion',
                title: 'Water and religion',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_and_religion'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_and_religion',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                href: 'http://en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                friendlyUrl: 'en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                title: 'Dihydrogen monoxide hoax',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Dihydrogen_monoxide_hoax'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/dihydrogen_monoxide_hoax',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Outline_of_water',
                href: 'http://en.wikipedia.org/wiki/Outline_of_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Outline_of_water',
                title: 'Outline of water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Outline_of_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/outline_of_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              }
            ]
          }
        ],
        extra: {
          alternatives: [
            'https://en.wikipedia.org/wiki/Composition_of_water',
            'https://en.wikipedia.org/wiki/Effects_of_water_on_life',
            'https://en.wikipedia.org/wiki/Hydrogen_hydroxide',
            'https://en.wikipedia.org/wiki/Liquid_water',
            'https://en.wikipedia.org/wiki/Water_in_biology',
            'https://en.wikipedia.org/wiki/Watery'
          ],
          language: {
            en: 1
          },
          m_url: 'https://en.m.wikipedia.org/wiki/Water',
          rich_data: {
            infobox_images: [],
            langlinks: [
              'https://de.wikipedia.org/wiki/Wasser',
              'https://es.wikipedia.org/wiki/Agua',
              'https://pl.wikipedia.org/wiki/Woda',
              'https://fr.wikipedia.org/wiki/Eau',
              'https://it.wikipedia.org/wiki/Acqua',
              'https://nl.wikipedia.org/wiki/Water'
            ],
            source_language: 'EN',
            source_name: 'Wikipedia'
          }
        },
        kind: [
          'H',
          'h'
        ],
        template: 'hq'
      }
    },
    {
      url: 'https://simple.wikipedia.org/wiki/Water',
      href: 'https://simple.wikipedia.org/wiki/Water',
      friendlyUrl: 'simple.wikipedia.org/wiki/Water',
      title: 'Water - Simple English Wikipedia, the free encyclopedia',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'water',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'wikipedia.org',
        host: 'simple.wikipedia.org',
        hostAndPort: 'simple.wikipedia.org',
        port: '',
        url: 'simple.wikipedia.org/wiki/water',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
  ]
};

const finalWithHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'water',
      text: 'water',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {},
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          mozActionUrl: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
          searchEngineName: 'Google'
        },
        kind: [
          'custom-search'
        ],
        suggestion: 'water'
      }
    },
    {
      url: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      href: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      friendlyUrl: 'pubchem.ncbi.nlm.nih.gov/compound/water',
      title: 'Water | H2O - PubChem',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'water',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'nih.gov',
        host: 'pubchem.ncbi.nlm.nih.gov',
        hostAndPort: 'pubchem.ncbi.nlm.nih.gov',
        port: '',
        url: 'pubchem.ncbi.nlm.nih.gov/compound/water',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: 'https://en.wikipedia.org/wiki/Water',
      href: 'https://en.wikipedia.org/wiki/Water',
      friendlyUrl: 'en.wikipedia.org/wiki/Water',
      title: 'Water',
      description: "Water is a transparent, tasteless, odorless, and nearly colorless chemical substance, which is the main constituent of Earth's streams, lakes, and oceans, and the fluids of most living organisms. It is vital for all known forms of life, even though it provides no calories or organic nutrients. Its chemical formula is HO, meaning that each of its molecules contains one oxygen and two hydrogen atoms connected by covalent bonds. Water is the name of the liquid state of HO at standard ambient temper",
      kind: [
        'H',
        'h'
      ],
      style: 'favicon',
      provider: 'history',
      template: 'hq',
      text: 'water',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'wikipedia.org',
        host: 'en.wikipedia.org',
        hostAndPort: 'en.wikipedia.org',
        port: '',
        url: 'en.wikipedia.org/wiki/water',
        subType: {},
        originalUrl: 'https://en.wikipedia.org/wiki/Water',
        isEnriched: true,
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [
          {
            type: 'images',
            links: [
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg',
                image: 'https://imgr.cliqz.com/BVpPhpDJyLamrJKPYaUGp0yFQaA4aNDFt45NDe69_K8/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0dyYW5kX0Fuc2VfQmVhY2hfR3JlbmFkYS5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/grand_anse_beach_grenada.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg',
                image: 'https://imgr.cliqz.com/wjL0h0BIXh_Nq71E0dnnPpgnKLvX2PsAYci7QIAWeEs/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL1N0ZXJpbGV3YXRlci5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/sterilewater.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                href: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                friendlyUrl: 'upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png',
                image: 'https://imgr.cliqz.com/nZN_LOdAZT2xpfXLXibHYh49UPmFx-v2ZofFL73IgxE/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi8yLzJmL0F1dG8tYW5kX2hldGVyb3Ryb3Bocy5zdmcvMTQ1cHgtQXV0by1hbmRfaGV0ZXJvdHJvcGhzLnN2Zy5wbmc.png',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikimedia.org',
                  host: 'upload.wikimedia.org',
                  hostAndPort: 'upload.wikimedia.org',
                  port: '',
                  url: 'upload.wikimedia.org/wikipedia/commons/thumb/2/2f/auto-and_heterotrophs.svg/145px-auto-and_heterotrophs.svg.png',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg',
                image: 'https://imgr.cliqz.com/8j-QjAXRcrbng8yOiHXLOwTNYGH0f9ihmZwlNQf9QEc/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0JhbmRfNV9BTE1BX3JlY2VpdmVyLmpwZw.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/band_5_alma_receiver.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                href: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                friendlyUrl: 'upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png',
                image: 'https://imgr.cliqz.com/yTE0MSH1bICABJoIB1ezEDSKCH8nWXxWFSoD5stdjxI/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi9jL2M2LzNEX21vZGVsX2h5ZHJvZ2VuX2JvbmRzX2luX3dhdGVyLnN2Zy8xNDVweC0zRF9tb2RlbF9oeWRyb2dlbl9ib25kc19pbl93YXRlci5zdmcucG5n.png',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikimedia.org',
                  host: 'upload.wikimedia.org',
                  hostAndPort: 'upload.wikimedia.org',
                  port: '',
                  url: 'upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3d_model_hydrogen_bonds_in_water.svg/145px-3d_model_hydrogen_bonds_in_water.svg.png',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg',
                image: 'https://imgr.cliqz.com/IIzEmNkArIC_fIuRDSI-yHz0775INfgCetSrk2HfnII/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL01ILTYwU19IZWxpY29wdGVyX2R1bXBzX3dhdGVyX29udG9fRmlyZS5qcGc.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/mh-60s_helicopter_dumps_water_onto_fire.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg',
                image: 'https://imgr.cliqz.com/8w2wWP-c_KQPCe4jgfhNcBHfouoRJ0qigUzbIZDyKlo/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0h1bWFuaXRhcmlhbl9haWRfT0NQQS0yMDA1LTEwLTI4LTA5MDUxN2EuanBn.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/humanitarian_aid_ocpa-2005-10-28-090517a.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                href: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                friendlyUrl: 'en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg',
                image: 'https://imgr.cliqz.com/hlHgYefcVCjUKVI_iNkjoUOOFzkkxcZ7u5l857u22BY/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0xvbmd3b29kX0dhcmRlbnMtSXRhbGlhbl9HYXJkZW4uanBn.jpg',
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'images',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/w:en:special:filepath/longwood_gardens-italian_garden.jpg',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              }
            ]
          },
          {
            type: 'simple_links',
            links: [
              {
                url: 'https://en.wikipedia.org/wiki/Water#Etymology',
                href: 'https://en.wikipedia.org/wiki/Water#Etymology',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Etymology',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Etymology'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#etymology',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Chemical_and_physical_properties',
                href: 'https://en.wikipedia.org/wiki/Water#Chemical_and_physical_properties',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Chemical and physical properties',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Chemical_and_physical_properties'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#chemical_and_physical_properties',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#On_Earth',
                href: 'https://en.wikipedia.org/wiki/Water#On_Earth',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'On Earth',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#On_Earth'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#on_earth',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_life',
                href: 'https://en.wikipedia.org/wiki/Water#Effects_on_life',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Effects on life',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_life'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#effects_on_life',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_human_civilization',
                href: 'https://en.wikipedia.org/wiki/Water#Effects_on_human_civilization',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Effects on human civilization',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_human_civilization'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#effects_on_human_civilization',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Distribution_in_nature',
                href: 'https://en.wikipedia.org/wiki/Water#Distribution_in_nature',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Distribution in nature',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Distribution_in_nature'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#distribution_in_nature',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis',
                href: 'https://en.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Law, politics, and crisis',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#law.2c_politics.2c_and_crisis',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#In_culture',
                href: 'https://en.wikipedia.org/wiki/Water#In_culture',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'In culture',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#In_culture'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#in_culture',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#See_also',
                href: 'https://en.wikipedia.org/wiki/Water#See_also',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'See also',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#See_also'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#see_also',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#References',
                href: 'https://en.wikipedia.org/wiki/Water#References',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'References',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#References'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#references',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#Further_reading',
                href: 'https://en.wikipedia.org/wiki/Water#Further_reading',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'Further reading',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Further_reading'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#further_reading',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'https://en.wikipedia.org/wiki/Water#External_links',
                href: 'https://en.wikipedia.org/wiki/Water#External_links',
                friendlyUrl: 'en.wikipedia.org/wiki/Water',
                title: 'External links',
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#External_links'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water#external_links',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Properties_of_water',
                href: 'http://en.wikipedia.org/wiki/Properties_of_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Properties_of_water',
                title: 'Properties of water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Properties_of_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/properties_of_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Hydrology',
                href: 'http://en.wikipedia.org/wiki/Hydrology',
                friendlyUrl: 'en.wikipedia.org/wiki/Hydrology',
                title: 'Hydrology',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Hydrology'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/hydrology',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_cycle',
                href: 'http://en.wikipedia.org/wiki/Water_cycle',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_cycle',
                title: 'Water cycle',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_cycle'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_cycle',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_resources',
                href: 'http://en.wikipedia.org/wiki/Water_resources',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_resources',
                title: 'Water resources',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_resources'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_resources',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Seawater',
                href: 'http://en.wikipedia.org/wiki/Seawater',
                friendlyUrl: 'en.wikipedia.org/wiki/Seawater',
                title: 'Seawater',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Seawater'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/seawater',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Drinking_water',
                href: 'http://en.wikipedia.org/wiki/Drinking_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Drinking_water',
                title: 'Drinking water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Drinking_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/drinking_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Ship_transport',
                href: 'http://en.wikipedia.org/wiki/Ship_transport',
                friendlyUrl: 'en.wikipedia.org/wiki/Ship_transport',
                title: 'Ship transport',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Ship_transport'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/ship_transport',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_sport_(recreation)',
                href: 'http://en.wikipedia.org/wiki/Water_sport_(recreation)',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_sport_(recreation)',
                title: 'Water sport (recreation)',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_sport_(recreation)'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_sport_(recreation)',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_law',
                href: 'http://en.wikipedia.org/wiki/Water_law',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_law',
                title: 'Water law',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_law'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_law',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Water_and_religion',
                href: 'http://en.wikipedia.org/wiki/Water_and_religion',
                friendlyUrl: 'en.wikipedia.org/wiki/Water_and_religion',
                title: 'Water and religion',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_and_religion'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/water_and_religion',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                href: 'http://en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                friendlyUrl: 'en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax',
                title: 'Dihydrogen monoxide hoax',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Dihydrogen_monoxide_hoax'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/dihydrogen_monoxide_hoax',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              },
              {
                url: 'http://en.wikipedia.org/wiki/Outline_of_water',
                href: 'http://en.wikipedia.org/wiki/Outline_of_water',
                friendlyUrl: 'en.wikipedia.org/wiki/Outline_of_water',
                title: 'Outline of water',
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Outline_of_water'
                },
                kind: [
                  'H',
                  'h'
                ],
                meta: {
                  level: 1,
                  type: 'simple_links',
                  domain: 'wikipedia.org',
                  host: 'en.wikipedia.org',
                  hostAndPort: 'en.wikipedia.org',
                  port: '',
                  url: 'en.wikipedia.org/wiki/outline_of_water',
                  subType: {},
                  completion: '',
                  logo: {},
                  extraLogos: {},
                  externalProvidersLogos: {
                    kicker: {}
                  }
                }
              }
            ]
          }
        ],
        extra: {
          alternatives: [
            'https://en.wikipedia.org/wiki/Composition_of_water',
            'https://en.wikipedia.org/wiki/Effects_of_water_on_life',
            'https://en.wikipedia.org/wiki/Hydrogen_hydroxide',
            'https://en.wikipedia.org/wiki/Liquid_water',
            'https://en.wikipedia.org/wiki/Water_in_biology',
            'https://en.wikipedia.org/wiki/Watery'
          ],
          language: {
            en: 1
          },
          m_url: 'https://en.m.wikipedia.org/wiki/Water',
          rich_data: {
            infobox_images: [],
            langlinks: [
              'https://de.wikipedia.org/wiki/Wasser',
              'https://es.wikipedia.org/wiki/Agua',
              'https://pl.wikipedia.org/wiki/Woda',
              'https://fr.wikipedia.org/wiki/Eau',
              'https://it.wikipedia.org/wiki/Acqua',
              'https://nl.wikipedia.org/wiki/Water'
            ],
            source_language: 'EN',
            source_name: 'Wikipedia'
          }
        },
        kind: [
          'H',
          'h'
        ],
        template: 'hq'
      }
    },
    {
      url: 'https://simple.wikipedia.org/wiki/Water',
      href: 'https://simple.wikipedia.org/wiki/Water',
      friendlyUrl: 'simple.wikipedia.org/wiki/Water',
      title: 'Water - Simple English Wikipedia, the free encyclopedia',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'water',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'wikipedia.org',
        host: 'simple.wikipedia.org',
        hostAndPort: 'simple.wikipedia.org',
        port: '',
        url: 'simple.wikipedia.org/wiki/water',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: getUrl('modules/cliqz-history/index.html#/?query=water'),
      href: getUrl('modules/cliqz-history/index.html#/?query=water'),
      friendlyUrl: getUrl('modules/cliqz-history/index.html'),
      kind: [
        'history-ui'
      ],
      template: 'sessions',
      text: 'water',
      meta: {
        level: 0,
        type: 'main',
        domain: 'de49e5ac-04ee-2c45-b985-f6bed223a3ac',
        host: 'de49e5ac-04ee-2c45-b985-f6bed223a3ac',
        hostAndPort: 'de49e5ac-04ee-2c45-b985-f6bed223a3ac',
        port: '',
        url: getUrl('modules/cliqz-history/index.html#/?query=water'),
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'history-ui'
        ],
        template: 'sessions'
      }
    }
  ]
};

const results = {
  instant: [
    {
      url: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
      extra: {
        mozActionUrl: 'https://www.google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
        searchEngineName: 'Google'
      },
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'water',
      text: 'water',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=water&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {}
      }
    }
  ],
  cliqz: [
    {
      url: 'https://water.org/',
      score: 10261.848,
      snippet: {
        description: 'Water.org is founded by Gary White & Matt Damon. We make it our mission to provide the world with Safe Water and Sanitation through innovative microfinancing solutions. Come learn how you can help support our cause today!',
        extra: {
          alternatives: [
            'https://water.org/'
          ],
          language: {
            en: 0.99
          },
          og: {
            description: 'Water.org is founded by Gary White & Matt Damon. We make it our mission to provide the world with Safe Water and Sanitation through innovative microfinancing solutions. Come learn how you can help support our cause today!',
            image: 'https://imgr.cliqz.com/_yY-XJ86ixxTkNNty7okufHNVcjeGVP4FjMMEeE6SrM/fill/0/200/no/1/aHR0cHM6Ly93YXRlci5vcmcvbWVkaWEvaW1hZ2VzL2xvZ28ub3JpZ2luYWwucG5n.png',
            site_name: 'Water.org',
            title: 'Water.org - Water Charity For Safe Water & Sanitation',
            type: 'website',
            url: 'https://water.org/'
          }
        },
        title: 'Water.org - Water Charity For Safe Water & Sanitation'
      },
      c_url: 'https://water.org/',
      type: 'bm'
    },
    {
      url: 'https://www.britannica.com/science/water',
      score: 212.31339,
      snippet: {
        description: 'Water: Water, substance composed of the chemical elements hydrogen and oxygen and existing in gaseous, liquid, and solid states. It is one of the most plentiful of compounds and has the important ability to dissolve many other substances, which was essential to the development of life.',
        extra: {
          alternatives: [
            'https://www.britannica.com/science/water'
          ],
          language: {
            en: 0.99
          },
          og: {
            description: 'Water: Water, substance composed of the chemical elements hydrogen and oxygen and existing in gaseous, liquid, and solid states. It is one of the most plentiful of compounds and has the important ability to dissolve many other substances, which was essential to the development of life.',
            image: 'https://imgr.cliqz.com/CKLH8zPHMfvywc1ISHkHTT_VP2Db3sS3l23NNluTz9A/fill/0/200/no/1/aHR0cHM6Ly9jZG4uYnJpdGFubmljYS5jb20vNTgvOTQ4NTgtMDA0LTE3RkNGNDA2LmpwZw.jpg',
            'image:type': 'image/jpeg',
            site_name: 'Encyclopedia Britannica',
            title: 'water | Definition, Chemical Formula, Structure, & Facts',
            type: 'ARTICLE',
            url: 'https://www.britannica.com/science/water'
          }
        },
        title: 'water'
      },
      c_url: 'https://www.britannica.com/science/water',
      type: 'bm'
    },
    {
      url: 'https://simple.wikipedia.org/wiki/Water',
      score: 147.5554,
      snippet: {
        description: 'Contents',
        extra: {
          alternatives: [
            'https://simple.wikipedia.org/wiki/Water'
          ],
          language: {
            en: 0.89
          },
          m_url: 'http://simple.m.wikipedia.org/wiki/Water',
          mobile_links: {
            android: [
              'android-app://org.wikipedia/http/simple.m.wikipedia.org/wiki/Water'
            ]
          },
          og: {
            image: 'https://imgr.cliqz.com/fS_O5R21Vsz7pSrCz-Tpt8TsNp81tncCTJT_hroJ_ME/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi9mL2ZjL1dhdGVyX2Ryb3BsZXRfYmx1ZV9iZzA1LmpwZy8xMjAwcHgtV2F0ZXJfZHJvcGxldF9ibHVlX2JnMDUuanBn.jpg'
          }
        },
        title: 'Water - Simple English Wikipedia, the free encyclopedia'
      },
      c_url: 'https://simple.wikipedia.org/wiki/Water',
      type: 'bm'
    },
    {
      url: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      score: 173.47897,
      snippet: {
        description: 'Your access to the NCBI website at www.ncbi.nlm.nih.gov has been temporarily blocked due to a possible misuse/abuse situation involving your site. This is not an indication of a security issue such as a virus or attack. It could be something as simple as a run away script or learning how to better use E-utilities, http://www.ncbi.nlm.nih.gov/books/NBK25497/ , for more efficient work such that your work does not impact the ability of other researchers to also use our site. To restore access and u',
        extra: {
          alternatives: [
            'https://misuse.ncbi.nlm.nih.gov/error/abuse.shtml'
          ],
          language: {
            en: 0.99
          }
        },
        title: 'NCBI - WWW Error Blocked Diagnostic'
      },
      c_url: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      type: 'bm'
    },
    {
      url: 'https://en.wikipedia.org/wiki/Water',
      score: 366.52997,
      snippet: {
        deepResults: [
          {
            links: [
              {
                image: 'https://imgr.cliqz.com/BVpPhpDJyLamrJKPYaUGp0yFQaA4aNDFt45NDe69_K8/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0dyYW5kX0Fuc2VfQmVhY2hfR3JlbmFkYS5qcGc.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Grand_Anse_Beach_Grenada.jpg'
              },
              {
                image: 'https://imgr.cliqz.com/wjL0h0BIXh_Nq71E0dnnPpgnKLvX2PsAYci7QIAWeEs/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL1N0ZXJpbGV3YXRlci5qcGc.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Sterilewater.jpg'
              },
              {
                image: 'https://imgr.cliqz.com/nZN_LOdAZT2xpfXLXibHYh49UPmFx-v2ZofFL73IgxE/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi8yLzJmL0F1dG8tYW5kX2hldGVyb3Ryb3Bocy5zdmcvMTQ1cHgtQXV0by1hbmRfaGV0ZXJvdHJvcGhzLnN2Zy5wbmc.png',
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Auto-and_heterotrophs.svg/145px-Auto-and_heterotrophs.svg.png'
              },
              {
                image: 'https://imgr.cliqz.com/8j-QjAXRcrbng8yOiHXLOwTNYGH0f9ihmZwlNQf9QEc/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0JhbmRfNV9BTE1BX3JlY2VpdmVyLmpwZw.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Band_5_ALMA_receiver.jpg'
              },
              {
                image: 'https://imgr.cliqz.com/yTE0MSH1bICABJoIB1ezEDSKCH8nWXxWFSoD5stdjxI/fill/0/200/no/1/aHR0cHM6Ly91cGxvYWQud2lraW1lZGlhLm9yZy93aWtpcGVkaWEvY29tbW9ucy90aHVtYi9jL2M2LzNEX21vZGVsX2h5ZHJvZ2VuX2JvbmRzX2luX3dhdGVyLnN2Zy8xNDVweC0zRF9tb2RlbF9oeWRyb2dlbl9ib25kc19pbl93YXRlci5zdmcucG5n.png',
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/3D_model_hydrogen_bonds_in_water.svg/145px-3D_model_hydrogen_bonds_in_water.svg.png'
              },
              {
                image: 'https://imgr.cliqz.com/IIzEmNkArIC_fIuRDSI-yHz0775INfgCetSrk2HfnII/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL01ILTYwU19IZWxpY29wdGVyX2R1bXBzX3dhdGVyX29udG9fRmlyZS5qcGc.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/MH-60S_Helicopter_dumps_water_onto_Fire.jpg'
              },
              {
                image: 'https://imgr.cliqz.com/8w2wWP-c_KQPCe4jgfhNcBHfouoRJ0qigUzbIZDyKlo/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0h1bWFuaXRhcmlhbl9haWRfT0NQQS0yMDA1LTEwLTI4LTA5MDUxN2EuanBn.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Humanitarian_aid_OCPA-2005-10-28-090517a.jpg'
              },
              {
                image: 'https://imgr.cliqz.com/hlHgYefcVCjUKVI_iNkjoUOOFzkkxcZ7u5l857u22BY/fill/0/200/no/1/aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvdzplbjpTcGVjaWFsOkZpbGVwYXRoL0xvbmd3b29kX0dhcmRlbnMtSXRhbGlhbl9HYXJkZW4uanBn.jpg',
                url: 'https://en.wikipedia.org/wiki/w:en:Special:Filepath/Longwood_Gardens-Italian_Garden.jpg'
              }
            ],
            type: 'images'
          },
          {
            links: [
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Etymology'
                },
                title: 'Etymology',
                url: 'https://en.wikipedia.org/wiki/Water#Etymology'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Chemical_and_physical_properties'
                },
                title: 'Chemical and physical properties',
                url: 'https://en.wikipedia.org/wiki/Water#Chemical_and_physical_properties'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#On_Earth'
                },
                title: 'On Earth',
                url: 'https://en.wikipedia.org/wiki/Water#On_Earth'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_life'
                },
                title: 'Effects on life',
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_life'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Effects_on_human_civilization'
                },
                title: 'Effects on human civilization',
                url: 'https://en.wikipedia.org/wiki/Water#Effects_on_human_civilization'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Distribution_in_nature'
                },
                title: 'Distribution in nature',
                url: 'https://en.wikipedia.org/wiki/Water#Distribution_in_nature'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis'
                },
                title: 'Law, politics, and crisis',
                url: 'https://en.wikipedia.org/wiki/Water#Law.2C_politics.2C_and_crisis'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#In_culture'
                },
                title: 'In culture',
                url: 'https://en.wikipedia.org/wiki/Water#In_culture'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#See_also'
                },
                title: 'See also',
                url: 'https://en.wikipedia.org/wiki/Water#See_also'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#References'
                },
                title: 'References',
                url: 'https://en.wikipedia.org/wiki/Water#References'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#Further_reading'
                },
                title: 'Further reading',
                url: 'https://en.wikipedia.org/wiki/Water#Further_reading'
              },
              {
                extra: {
                  m_url: 'https://en.m.wikipedia.org/wiki/Water#External_links'
                },
                title: 'External links',
                url: 'https://en.wikipedia.org/wiki/Water#External_links'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Properties_of_water'
                },
                title: 'Properties of water',
                url: 'http://en.wikipedia.org/wiki/Properties_of_water'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Hydrology'
                },
                title: 'Hydrology',
                url: 'http://en.wikipedia.org/wiki/Hydrology'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_cycle'
                },
                title: 'Water cycle',
                url: 'http://en.wikipedia.org/wiki/Water_cycle'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_resources'
                },
                title: 'Water resources',
                url: 'http://en.wikipedia.org/wiki/Water_resources'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Seawater'
                },
                title: 'Seawater',
                url: 'http://en.wikipedia.org/wiki/Seawater'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Drinking_water'
                },
                title: 'Drinking water',
                url: 'http://en.wikipedia.org/wiki/Drinking_water'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Ship_transport'
                },
                title: 'Ship transport',
                url: 'http://en.wikipedia.org/wiki/Ship_transport'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_sport_(recreation)'
                },
                title: 'Water sport (recreation)',
                url: 'http://en.wikipedia.org/wiki/Water_sport_(recreation)'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_law'
                },
                title: 'Water law',
                url: 'http://en.wikipedia.org/wiki/Water_law'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Water_and_religion'
                },
                title: 'Water and religion',
                url: 'http://en.wikipedia.org/wiki/Water_and_religion'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Dihydrogen_monoxide_hoax'
                },
                title: 'Dihydrogen monoxide hoax',
                url: 'http://en.wikipedia.org/wiki/Dihydrogen_monoxide_hoax'
              },
              {
                extra: {
                  m_url: 'http://en.m.wikipedia.org/wiki/Outline_of_water'
                },
                title: 'Outline of water',
                url: 'http://en.wikipedia.org/wiki/Outline_of_water'
              }
            ],
            type: 'simple_links'
          }
        ],
        description: "Water is a transparent, tasteless, odorless, and nearly colorless chemical substance, which is the main constituent of Earth's streams, lakes, and oceans, and the fluids of most living organisms. It is vital for all known forms of life, even though it provides no calories or organic nutrients. Its chemical formula is HO, meaning that each of its molecules contains one oxygen and two hydrogen atoms connected by covalent bonds. Water is the name of the liquid state of HO at standard ambient temper",
        extra: {
          alternatives: [
            'https://en.wikipedia.org/wiki/Composition_of_water',
            'https://en.wikipedia.org/wiki/Effects_of_water_on_life',
            'https://en.wikipedia.org/wiki/Hydrogen_hydroxide',
            'https://en.wikipedia.org/wiki/Liquid_water',
            'https://en.wikipedia.org/wiki/Water_in_biology',
            'https://en.wikipedia.org/wiki/Watery'
          ],
          language: {
            en: 1
          },
          m_url: 'https://en.m.wikipedia.org/wiki/Water',
          rich_data: {
            infobox_images: [],
            langlinks: [
              'https://de.wikipedia.org/wiki/Wasser',
              'https://es.wikipedia.org/wiki/Agua',
              'https://pl.wikipedia.org/wiki/Woda',
              'https://fr.wikipedia.org/wiki/Eau',
              'https://it.wikipedia.org/wiki/Acqua',
              'https://nl.wikipedia.org/wiki/Water'
            ],
            source_language: 'EN',
            source_name: 'Wikipedia'
          }
        },
        title: 'Water'
      },
      c_url: 'https://en.wikipedia.org/wiki/Water',
      similars: [
        'https://en.wikipedia.org/wiki/Properties_of_water'
      ],
      type: 'bm',
      template: 'hq'
    }
  ],
  history: [
    {
      style: 'favicon',
      value: 'https://pubchem.ncbi.nlm.nih.gov/compound/water',
      image: 'page-icon:https://pubchem.ncbi.nlm.nih.gov/compound/water',
      comment: 'Water | H2O - PubChem',
      label: 'https://pubchem.ncbi.nlm.nih.gov/compound/water'
    },
    {
      style: 'favicon',
      value: 'https://en.wikipedia.org/wiki/Water',
      image: 'page-icon:https://en.wikipedia.org/wiki/Water',
      comment: 'Water - Wikipedia',
      label: 'https://en.wikipedia.org/wiki/Water'
    },
    {
      style: 'favicon',
      value: 'https://simple.wikipedia.org/wiki/Water',
      image: 'page-icon:https://simple.wikipedia.org/wiki/Water',
      comment: 'Water - Simple English Wikipedia, the free encyclopedia',
      label: 'https://simple.wikipedia.org/wiki/Water'
    },
    {
      style: 'favicon',
      value: 'https://www.britannica.com/science/water',
      image: 'page-icon:https://www.britannica.com/science/water',
      comment: 'water | Definition, Chemical Formula, Structure, & Facts | Britannica.com',
      label: 'https://www.britannica.com/science/water'
    },
    {
      style: 'favicon',
      value: 'https://water.org/',
      image: 'page-icon:https://water.org/',
      comment: 'Water.org - Water Charity For Safe Water & Sanitation',
      label: 'https://water.org/'
    }
  ]
};

export const withoutHistoryView = Object.assign({}, finalWithoutHistoryView, results);
export const withHistoryView = Object.assign({}, finalWithHistoryView, results);
