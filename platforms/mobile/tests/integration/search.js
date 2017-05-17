var expect = chai.expect;

var contentWindow;

describe('Search View', function() {
  let timeout = 15000;
  var testBox;

  beforeEach(function (done) {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(timeout);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame");
    testBox.src =	"/build/index.html";

    return new Promise(function (resolve, reject) {
      window.addEventListener('message', function (ev) {
        if (ev.data === 'cliqz-ready') {
          contentWindow = testBox.contentWindow;
          resolve();
        }
      });
      document.body.appendChild(testBox);
    }).then(() => {
      return injectSinon(testBox.contentWindow);
    }).then(done);
  });

  afterEach(function () {
  	localStorage.clear();
    window.fakeServer.restore();
    document.body.removeChild(testBox);
  });

  context("Local Results", function () {
    var query = "kino cadillac",
        extraResult;

    beforeEach(function (done) {

      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      extraResult = {
        "url": "http://cadillac.movieplace.de/",
        "trigger_method": "url",
        "snippet": {
          "friendlyUrl": "cadillac.movieplace.de",
          "description": "Cadillac Veranda Kino, M\u00fcnchen, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
          "title": "!!!fake title!!! Kino in M\u00fcnchen: Cadillac Veranda Kino mit Kinoprogramm, Infos rund ums Kino und die Filme, Filmtrailern und vielem mehr.",
          "extra": {
            "rating": 4.7,
            "map_img": "http://maps.google.com/maps/api/staticmap?size=124x124&zoom=16&center=48.1517753,11.6197005&format=png&markers=size:mid|color:red|label:C|48.1517753,11.6197005",
            "opening_hours": [

            ],
            "address": "Rosenkavalierpl. 12, 81925 M\u00fcnchen, Germany",
            "lon": 11.6197005,
            "superTemplate": "local-data-sc",
            "mu": "https://www.google.de/maps/place/kino+aschheim+m%C3%BCnchen/@48.1517753,11.6197005,15z/data=!4m2!3m1!1s0x0:0xec7891cbdf1a3b49?sa=X&ved=0COsBEK8LMAZqFQoTCOu365-88cYCFcRXFAod7DsATg",
            "u": "cadillac.movieplace.de",
            "t": "Cadillac & Veranda Kino",
            "timestamp": 1437816516.774708,
            "lat": 48.1517753,
            "phonenumber": "089 912000"
          }
        },
        "subType": {
          "id": "3087855600870963194",
          "name": "cadillac.movieplace.de",
          "class": "EntityLocal"
        },
        "trigger": [
        ],
        "template": "generic",
        "type": "rh"
      };


      cliqzResponse(query, [ extraResult ]);

      contentWindow.jsAPI.search(encodeURIComponent(query), true, 48.151753799999994, 11.620054999999999);
    });

    it("should intercept request and respond with fake result", function () {
      expect($('.card__title')[0].innerText).to.contain('!!!fake title!!!');
    });

    it("has one local result", function () {
      expect($('.cqz-local-result')).to.have.length(1);
    });

    it("renders local template with address and map", function () {
      var address = $('.address__text')[0];
      expect(address).to.be.ok;

      var addressText = address.lastChild.wholeText;
      expect(addressText).to.be.ok;
      expect(addressText.trim()).to.equal(extraResult.snippet.extra.address);
    });

    it("shows local data image", function () {
      var img = $('.map__img')[0];
      expect(img).to.be.ok
      expect(img).to.have.property('style');
      expect(img.style).to.have.property('display').that.not.equal('none');
    });
  });

  context("Generic Entities", function () {
    var query = "amazon";

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      cliqzResponse(query, [
        {
          "url": "https://www.amazon.de/",
          "trigger_method": "url",
          "snippet": {
            "friendlyUrl": "amazon.de",
            "description": "Entdecken, shoppen und einkaufen bei Amazon.de: G\u00fcnstige Preise f\u00fcr Elektronik & Foto, Filme, Musik, B\u00fccher, Games, Spielzeug, Sportartikel, Drogerie & mehr bei Amazon.de",
            "title": "!!!fake title!!! Amazon.de: G\u00fcnstige Preise f\u00fcr Elektronik & Foto, Filme, Musik, B\u00fccher, Games, Spielzeug & mehr",
            "extra": {
              "og": {
                "description": "Entdecken, shoppen und einkaufen bei Amazon.de: G\u00fcnstige Preise f\u00fcr Elektronik & Foto, Filme, Musik, B\u00fccher, Games, Spielzeug, Sportartikel, Drogerie & mehr bei Amazon.de"
              },
              "alternatives": [

              ],
              "language": {
                "de": 1.0
              }
            },
            "deepResults": [
              {
                "type": "buttons",
                "links": [
                  {
                    "url": "https://partnernet.amazon.de",
                    "title": "Partnerprogramm"
                  },
                  {
                    "url": "https://payments.amazon.de?ld=AWREDEAPAFooter",
                    "title": "Login und Bezahlen mit Amazon"
                  }
                ]
              }
            ]
          },
          "subType": {
            "id": "-1884090464472778153",
            "name": "amazon.de",
            "class": "EntityGeneric"
          },
          "trigger": [
            "amazon.de"
          ],
          "template": "generic",
          "type": "rh"
        }
      ]);

      contentWindow.jsAPI.search(encodeURIComponent(query));
    });

    it("should intercept request and respond with fake result", function () {
      expect($('.card__title')[0].innerText).to.contain('!!!fake title!!!');
    });

    it("should render generic template", function () {
      expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- generic.tpl -->');
    });
  });

  context("Adult Filter", function () {
    var query = "titten";

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      cliqzResponse(query, [
        {
          "snippet": {
            "description": "Grosse Titten :: Kostenlose porno von Grosse Titten. Auf Einfachporno finden Sie alle Pornofilme von Grosse Titten die Sie sich k\u00f6nnen vorstellen. Nur hier Qualit\u00e4tsporno.",
            "title": "Grosse Titten",
            "extra": {
              "alternatives": [
                "http://www.einfachporno.xxx/pornofilme/grosse-titten/"
              ],
              "adult": true,
              "language": {
                "de": 1.0
              }
            }
          },
          "url": "http://www.einfachporno.com/pornofilme/grosse-titten",
          "type": "bm"
        }
      ]);

      contentWindow.jsAPI.search(encodeURIComponent(query));
    });

    it("should filter all results", function () {
      expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- googlethis -->');
    });
  });

  context("Weather", function () {
    var query = "wetter münchen";

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      cliqzResponse(query, [
        {
          "url": "https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833",
          "score": 0,
          "snippet": {
    				"deepResults": [
    					{
    						"links": [
    							{
    								"title_key": "extended_forecast",
    								"url": "https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833#forecast"
    							}
    						],
    						"type": "buttons"
    					}
    				],
    				"extra": {
    					"api_returned_location": "Munich, Germany",
    					"forecast": [
    						{
    							"desc": "Clear",
    							"description": "Klar",
    							"icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg",
    							"icon_bck": "http://icons.wxug.com/i/c/k/clear.gif",
    							"max": "27°",
    							"min": "14°",
    							"weekday": "Mittwoch"
    						},
    						{
    							"desc": "Clear",
    							"description": "Klar",
    							"icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg",
    							"icon_bck": "http://icons.wxug.com/i/c/k/clear.gif",
    							"max": "27°",
    							"min": "15°",
    							"weekday": "Donnerstag"
    						},
    						{
    							"desc": "Rain",
    							"description": "Regen",
    							"icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg",
    							"icon_bck": "http://icons.wxug.com/i/c/k/rain.gif",
    							"max": "19°",
    							"min": "12°",
    							"weekday": "Freitag"
    						},
    						{
    							"desc": "Rain",
    							"description": "Regen",
    							"icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg",
    							"icon_bck": "http://icons.wxug.com/i/c/k/rain.gif",
    							"max": "16°",
    							"min": "11°",
    							"weekday": "Samstag"
    						}
    					],
    					"meta": {
    						"cached_weather_data": "yes",
    						"lazy-RH": 0,
    						"lazy-RH1": 0,
    						"lazy-snpt1": 0,
    						"location": "München, Deutschland",
    						"version": "21Dec15"
    					},
    					"searched_city": "münchen, Deutschland",
    					"searched_country": "Germany - default",
    					"title_icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg",
    					"todayDesc": "Clear",
    					"todayDescription": "Klar",
    					"todayIcon": "http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg",
    					"todayIcon_bck": "http://icons.wxug.com/i/c/k/clear.gif",
    					"todayMax": "30°",
    					"todayMin": "13°",
    					"todayTemp": "29°",
    					"todayWeekday": "Heute"
    				},
    				"friendlyUrl": "wunderground.com/cgi-bin/findweather/getforecast",
    				"title": "!!!fake title!!! München, Deutschland"
    			},
    			"type": "rh",
    			"subType": {
    				"class": "EntityWeather",
    				"id": "5138280142441694865",
    				"name": "weather EZ"
    			},
    			"template": "weatherEZ",
    			"trigger_method": "query"
    		}
      ]);

      contentWindow.jsAPI.search(encodeURIComponent(query));
    });

    it("should intercept request and respond with fake result", function () {
      expect($('.card__title')[0].innerText).to.contain('!!!fake title!!!');
    });

    it("should have the weather card", function () {
      expect($('.EZ-weather-container')).to.have.length(5);
      expect($('.EZ-weather-img')).to.have.length(5);
    });
  });

  context("FC Bayern", function () {
    var query = "fcbayern";

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      cliqzResponse(query, [
        {
          "url": "http://www.fcbayern.de/",
          "trigger_method": "url",
          "snippet": {
            "friendlyUrl": "fcbayern.de",
            "description": "Willkommen auf dem offiziellen Internetportal des FC Bayern M\u00fcnchen! Hier gibt es aktuelle News, Spielberichte, FCB.tv-Videos, Online-Shop, FCB Erlebniswelt u.v.m. Klicken Sie rein!",
            "title": "!!!fake title!!! FC Bayern M\u00fcnchen - Offizielle Website",
            "extra": {
              "scored": "",
              "status": "scheduled",
              "GUESS": "FK Rostow",
              "finalScore": "",
              "club": "Bayern M\u00fcnchen",
              "gameTime": "Dienstag 13 September, 20:45",
              "halfTimeScore": "",
              "spielTag": "Vorrunde, 1. Spieltag",
              "live_url": "http://www.kicker.de/news/fussball/chleague/spielrunde/champions-league/2016-17/1/3685885/spielinfo_bayern-muenchen-14_fk-rostov-1574.html",
              "HOST": "Bayern M\u00fcnchen",
              "location": null,
              "isLive": false,
              "gameUtcTimestamp": 1473792300.0,
              "leagueName": "Champions League"
            },
            "deepResults": [
              {
                "type": "buttons",
                "links": [
                  {
                    "url": "http://www.fcbayern.de/de/tickets",
                    "title": "Tickets"
                  },
                  {
                    "url": "http://www.fcbayern.de/de/teams/profis",
                    "title": "Profis"
                  },
                  {
                    "url": "http://www.fcbayern.de/de/club/mitglied-werden",
                    "title": "Mitglied werden"
                  },
                  {
                    "url": "http://www.fcbayern.de/de/club/saebener-strasse",
                    "title": "S\u00e4bener Stra\u00dfe"
                  }
                ]
              },
              {
                "type": "news",
                "links": [
                  {
                    "url": "http://www.stern.de/sport/fussball/bundesliga/fc-bayern-muenchen-von-loeschung-bedroht--jurist-sieht-rechtsformverfehlung-7049122.html",
                    "extra": {
                      "discovery_timestamp": 1473403816,
                      "score": 8.215074,
                      "source_name": "stern.de",
                      "tweet_count": "6",
                      "thumbnail": "http://image.stern.de/7049160/16x9-1200-675/f1802ea227b1acb01e4810649f340d1/fP/karl-heinz-rummenigge-und-carlo-ancelotti-fc-bayern-muenchen.jpg",
                      "desc": "Dem FC Bayern M\u00fcnchen droht die L\u00f6schung aus dem Vereinsregister. Ein Jurist hat dies beim zust\u00e4ndigen Amtsgericht beantragt. Doch dabei gehe es ihm ..."
                    },
                    "title": "FC Bayern M\u00fcnchen von L\u00f6schung bedroht: Jurist sieht Rechtsformverfehlung - Fu\u00dfball-Bundesliga"
                  }
                ]
              }
            ]
          },
          "subType": {
            "id": "-7574156205367822803",
            "name": "TEAM: fcbayern.de",
            "class": "SoccerEZ"
          },
          "trigger": [
            "fcbayern.de"
          ],
          "template": "ligaEZ1Game",
          "type": "rh"
        },
      ]);

      contentWindow.jsAPI.search(encodeURIComponent(query));
    });

    it("should intercept request and respond with fake result", function () {
      expect($('.card__title')[0].innerText).to.contain('!!!fake title!!!');
    });

    it("should have the latest results smart card", function () {
      expect($('.soccer__result')).to.have.length(1);
      expect($('.meta__legend')).to.have.length(1);
    });
  });
});
