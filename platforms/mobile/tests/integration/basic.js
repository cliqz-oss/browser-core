var expect = chai.expect;

var contentWindow, fakeServer;

function cliqzResponse(query, results, extra) {
  var results = JSON.stringify({
    "cached": false,
    "choice": "type1",
    "completions": null,
    "country": "de",
    "duration": 52,
    "extra": {
      "durationTotal": 9,
      "vertical_name": "extra",
      "results": extra
    },
    "navigational": false,
    "q": query,
    "result": results
  });

  fakeServer.respondWith(
    "GET",
    new RegExp("^https:\/\/newbeta.cliqz.com\/api\/v1\/results\\?q="+encodeURIComponent(query)),
    [ 200, { "Content-Type": "application/json" }, results ]
  );
}


function newsResponse(articles) {
  var response = JSON.stringify({
    "results": [
      {
        "q": "",
        "news_version": 1455885880,
        "subType": "{\"class\": \"FreshTabNewsCache\", \"ez\": \"deprecated\"}",
        "trigger_urls": [

        ],
        "articles": [
          {
            "domain": "www.focus.de",
            "is_global": false,
            "description": "",
            "title": "USA bombardieren IS-St\u00fctzpunkt in Libyen",
            "url": "http:\/\/www.focus.de\/politik\/ausland\/kampf-gegen-terrormiliz-medienbericht-usa-bombardieren-is-stuetzpunkt-in-libyen_id_5299559.html",
            "short_title": "USA bombardieren IS-St\u00fctzpunkt in Libyen"
          }
        ]
      }
    ]
  });

  fakeServer.respondWith(
    "GET",
    new RegExp(".*rich-header.*"),
    [ 200, { "Content-Type": "application/json" }, response ]
  );
}

function $(selector) {
	return contentWindow.document.querySelectorAll(selector)
}

function injectSinon(win) {
  var resolver,
      promise = new Promise(function (resolve) {
        resolver = resolve;
      });

  var sinonScript = win.document.createElement("script");
  sinonScript.src = "/bower_components/sinonjs/sinon.js";
  sinonScript.onload = function () {
    window.sinon = contentWindow.sinon;
    resolver();
  };
  win.document.body.appendChild(sinonScript);

  return promise;
}

describe('Search View', function() {
  var testBox;

  beforeEach(function () {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(10000);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame");
    testBox.src = 	"/build/index.html";
    document.body.appendChild(testBox);


    contentWindow = testBox.contentWindow;

    function waitForWindow(win) {
      return new Promise(function (res) {
        win.addEventListener('newsLoadingDone', function () { res(); });
      })
    }

    return new Promise(function (resolve) {
      contentWindow.onload = resolve;
    }).then(function () {
      return Promise.all([
        injectSinon(contentWindow)
      ])
    }).then(function () {
      fakeServer = sinon.fakeServer.create({
        autoRespond: true,
        respondImmediately: true
      });
      newsResponse([]);

      contentWindow.sinonLoaded = true;
      return waitForWindow(contentWindow);
    });
  });

  afterEach(function () {
  	contentWindow.CliqzUtils.getLocalStorage().clear();
    fakeServer.restore();
    document.body.removeChild(testBox);
  });

  context("Local Results", function () {
    var query = "kino cadillac",
        extraResult;

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      extraResult = {
        "q": "kino cadillac",
        "ts": 1455892138,
        "data": {
          "__subType__": {
            "class": "EntityLocal",
            "id": "3087855600870963194",
            "name": "cadillac.movieplace.de"
          },
          "address": "Rosenkavalierpl. 12, 81925 München, Germany",
          "desc": "Cadillac Veranda Kino, München, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
          "description": "Cadillac Veranda Kino, München, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
          "friendly_url": "cadillac.movieplace.de",
          "lat": 48.1517753,
          "lon": 11.6197005,
          "map_img": "http://maps.google.com/maps/api/staticmap?size=124x124\u0026zoom=16\u0026center=48.1517753,11.6197005\u0026format=png\u0026markers=size:mid|color:red|label:C|48.1517753,11.6197005",
          "mu": "https://www.google.de/maps/place/cadillac+veranda/data=!4m2!3m1!1s0x0:0xec7891cbdf1a3b49?sa=X\u0026ved=0CFMQrwswAWoVChMI492LqdXuxwIVAtMUCh2-rwzi",
          "opening_hours": [],
          "phonenumber": "089 912000",
          "rating": 4.6,
          "superTemplate": "local-data-sc",
          "t": "Cadillac \u0026 Veranda Kino",
          "template": "generic",
          "timestamp": 1.443973887175803e+09,
          "title": "Kino in München: Cadillac Veranda Kino mit Kinoprogramm, Infos rund ums Kino und die Filme, Filmtrailern und vielem mehr.",
          "u": "cadillac.movieplace.de"
        },
        "url": "http://cadillac.movieplace.de/",
        "subType": "{\"class\": \"EntityLocal\", \"ez\": \"deprecated\"}"
      };

      cliqzResponse(query, [], [ extraResult ]);

      contentWindow.jsAPI.search(query, true, 48.151753799999994, 11.620054999999999);
    });

    it("has one local result", function () {
      expect($('.cqz-local-result')).to.have.length(1);
    });

    it("renders local template with address and map", function () {
      var address = $('.address__text')[0];
      expect(address).to.be.ok;

      var addressText = address.lastChild.wholeText;
      expect(addressText).to.be.ok;
      expect(addressText.trim()).to.equal(extraResult.data.address);
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

      cliqzResponse(query, [], [
        {
          "q": "amazon",
          "ts": 1456133009,
          "data": {
            "__subType__": {
              "class": "EntityGeneric",
              "id": "3513337026156341491",
              "name": "https://www.amazon.de/"
            },
            "actions": [
              {
                  "color": "",
                  "title": "Mein Konto",
                  "url": "http://www.amazon.de/mein-konto"
              },
              {
                  "color": "",
                  "title": "Einkaufswagen",
                  "url": "http://www.amazon.de/gp/cart/view.html/ref=nav_cart"
              },
              {
                  "color": "",
                  "title": "Meine Bestellungen",
                  "url": "https://www.amazon.de/gp/css/order-history"
              },
              {
                  "color": "",
                  "title": "Wunschzettel",
                  "url": "http://www.amazon.de/gp/registry/wishlist"
              }
            ],
            "description": "Entdecken, shoppen und einkaufen bei Amazon.de: Günstige Preise für Elektronik \u0026 Foto, Filme, Musik, Bücher, Games, Spielzeug, Sportartikel, Drogerie \u0026 mehr bei Amazon.de",
            "friendly_url": "amazon.de",
            "icon": "http://cdn.cliqz.com/extension/EZ/generic/EZ-shopping.svg",
            "links": [
              {
                "icon": "http://cdn.cliqz.com/extension/EZ/generic/angebote.svg",
                "title": "Sonderangebote",
                "url": "http://www.amazon.de/gp/angebote/ref=nav_cs_top_nav_gb27"
              },
              {
                "icon": "http://cdn.cliqz.com/extension/EZ/generic/clips.svg",
                "title": "Prime Instant Video",
                "url": "http://www.amazon.de/Prime-Instant-Video/b/ref=nav_shopall_aiv_piv?ie=UTF8\u0026node=3279204031"
              },
              {
                "icon": "http://cdn.cliqz.com/extension/EZ/generic/music.svg",
                "title": "Musik-Downloads",
                "url": "http://www.amazon.de/MP3-Musik-Downloads/b/ref=nav_shopall_mp3_str?ie=UTF8\u0026node=77195031"
              },
              {
                "icon": "http://cdn.cliqz.com/extension/EZ/generic/disc.svg",
                "title": "DVD \u0026 Blu-ray",
                "url": "http://www.amazon.de/dvd-blu-ray-filme-3D-vhs-video/b/ref=nav_shopall_dvd_blu?ie=UTF8\u0026node=284266"
              }
            ],
            "name": "Amazon",
            "template": "entity-generic"
          },
          "url": "https://www.amazon.de/",
          "subType": "{\"class\": \"EntityGeneric\", \"ez\": \"deprecated\"}",
          "trigger_urls": [
              "amazon.de"
          ]
        }
      ]);

      contentWindow.jsAPI.search(query);
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
          "q": "titten",
          "url": "http://www.einfachporno.com/pornofilme/grosse-titten",
          "score": 334.36624,
          "source": "bm",
          "snippet": {
            "adult": true,
            "alternatives": [
              "http://www.einfachporno.com/pornofilme/grosse-titten/"
            ],
            "desc": "Grosse Titten :: Kostenlose porno von Grosse Titten. Auf Einfachporno finden Sie alle Pornofilme von Grosse Titten die Sie sich können vorstellen. Nur hier Qualitätsporno.",
            "language": {
              "nl": 0.9594114735588574
            },
            "title": "Grosse Titten"
          }
        }
      ], []);

      contentWindow.jsAPI.search(query);
    });

    it("should filter all results", function () {
      expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- noResult.tpl -->');
    });
  });

  context("Weather", function () {
    var query = "wetter münchen";

    beforeEach(function (done) {
      this.timeout(10000);

      contentWindow.addEventListener('imgLoadingDone', function () { done() });

      cliqzResponse(query, [], [
        {
          "q": "wetter mun",
          "ts": 1456133409,
          "data": {
            "__subType__": {
              "class": "EntityWeather",
              "id": "5138280142441694865",
              "name": "weather EZ"
            },
            "alert": {
              "alert-color": "#ffc802",
              "des": "Wetterwarnung: Wind",
              "icon_url": "http://cdn.cliqz.com/extension/EZ/weather-new2/warning_2.svg",
              "time": "aktiv seit 22.02.16, 11:00 Uhr"
            },
            "api_returned_location": "München, Germany",
            "forecast": [
              {
                "desc": "Rain",
                "description": "Regen",
                "icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg",
                "icon_bck": "http://icons.wxug.com/i/c/k/rain.gif",
                "max": "9°",
                "min": "0°",
                "weekday": "Dienstag"
              },
              {
                "desc": "Partly Cloudy",
                "description": "Teilweise bewölkt",
                "icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg",
                "icon_bck": "http://icons.wxug.com/i/c/k/partlycloudy.gif",
                "max": "7°",
                "min": "-1°",
                "weekday": "Mittwoch"
              },
              {
                "desc": "Snow Showers",
                "description": "Schneeregen",
                "icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/snow.svg",
                "icon_bck": "http://icons.wxug.com/i/c/k/snow.gif",
                "max": "4°",
                "min": "-2°",
                "weekday": "Donnerstag"
              },
              {
                "desc": "Partly Cloudy",
                "description": "Teilweise bewölkt",
                "icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg",
                "icon_bck": "http://icons.wxug.com/i/c/k/partlycloudy.gif",
                "max": "5°",
                "min": "-3°",
                "weekday": "Freitag"
              }
            ],
            "forecast_url": "http://www.wunderground.com/global/stations/10865.html#forecast",
            "friendly_url": "wunderground.com/global/stations/10865.html",
            "meta": {
              "cached_weather_data": "yes",
              "lazy-RH": 0.008195161819458008,
              "lazy-RH1": 0.007915019989013672,
              "lazy-snpt1": 0.0010120868682861328,
              "location": "München, Deutschland",
              "version": "21Dec15"
            },
            "returned_location": "München, Deutschland",
            "searched_city": "mun",
            "searched_country": "Germany - default",
            "template": "weatherAlert",
            "title_icon": "http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg",
            "todayDesc": "Clear",
            "todayDescription": "Klar",
            "todayIcon": "http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg",
            "todayIcon_bck": "http://icons.wxug.com/i/c/k/clear.gif",
            "todayMax": "16°",
            "todayMin": "7°",
            "todayTemp": "15°",
            "todayWeekday": "Heute"
          },
          "url": "http://www.wunderground.com/global/stations/10865.html",
          "subType": "{\"class\": \"EntityWeather\", \"ez\": \"deprecated\"}"
        }
      ]);

      contentWindow.jsAPI.search(query);
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

      cliqzResponse(query, [], [
        {
          "q": "fcbayern",
          "ts": 1456133742,
          "data": {
            "GUESS": "SV Darmstadt 98",
            "HOST": "Bayern München",
            "__subType__": {
              "class": "SoccerEZ",
              "id": "2296372664814577417",
              "name": "1. Bundesliga EZ CLUB"
            },
            "club": "Bayern München",
            "debug": {
              "club_name_tmp3": "Bayern München"
            },
            "friendly_url": "fcbayern.de",
            "gameTime": "Samstag 20 Februar, 15:30",
            "leagueName": "1. Bundesliga",
            "live_url": "http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2015-16/22/2855122/spielbericht_bayern-muenchen-14_sv-darmstadt-98-98.html",
            "location": "Allianz-Arena",
            "rank": "1. Bundesliga Position: 1",
            "scored": "3 - 1",
            "spielTag": "22. Spieltag",
            "static": {
              "actions": [
                {
                  "color": "",
                  "title": "Warenkorb",
                  "url": "http://shop.fcbayern.de/?action=viewcart"
                }
              ],
              "description": "Willkommen auf dem offiziellen Internetportal des FC Bayern München! Hier gibt es aktuelle News, Spielberichte, FCB.tv-Videos, Online-Shop, FCB Erlebniswelt u.v.m. Klicken Sie rein!",
              "links": [
                {
                  "icon": "http://cdn.cliqz.com/extension/EZ/generic/note.svg",
                  "title": "Tickets",
                  "url": "http://www.fcbayern.de/de/tickets/"
                },
                {
                  "icon": "http://cdn.cliqz.com/extension/EZ/generic/schedule.svg",
                  "title": "Spielplan",
                  "url": "http://www.fcbayern.de/de/spiele/spielplan/bundesliga/"
                },
                {
                  "icon": "http://cdn.cliqz.com/extension/EZ/generic/television.svg",
                  "title": "FCB.tv",
                  "url": "http://www.fcb.tv/de/"
                },
                {
                  "icon": "http://cdn.cliqz.com/extension/EZ/generic/shopping.svg",
                  "title": "Fan Shop",
                  "url": "http://shop.fcbayern.de/"
                }
              ],
              "name": "FC Bayern München",
              "url": "http://www.fcbayern.de/"
            },
            "template": "ligaEZ1Game"
          },
          "url": "http://www.fcbayern.de/",
          "subType": "{\"class\": \"SoccerEZ\", \"ez\": \"deprecated\"}"
        },
      ]);

      contentWindow.jsAPI.search(query);
    });

    it("should have the latest results smart card", function () {
      expect($('.soccer__result')).to.have.length(1);
      expect($('.meta__legend')).to.have.length(1);
    });
  });
});

describe("Freshtab", function () {
  var testBox, getTopSites;

  beforeEach(function () {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(10000);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame");
    testBox.src =   "/build/index.html";
    document.body.appendChild(testBox);


    contentWindow = testBox.contentWindow;

    function waitForWindow(win) {
      return new Promise(function (res) {
        win.addEventListener('newsLoadingDone', function () { res(); });
      });
    }

    return new Promise(function (resolve) {
      contentWindow.onload = resolve;
    }).then(function () {
      return Promise.all([
        injectSinon(contentWindow)
      ])
    }).then(function () {
      fakeServer = sinon.fakeServer.create({
        autoRespond: true,
        respondImmediately: true
      });
      newsResponse([]);

      contentWindow.sinonLoaded = true;
      return waitForWindow(contentWindow);
    });
  });

  afterEach(function () {
    contentWindow.CliqzUtils.getLocalStorage().clear();
    fakeServer.restore();
    document.body.removeChild(testBox);
  });

  context("display topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
    });

    it("display 2 top sites from history", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("block 1 of to topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.jsAPI.search();
    });

    it("should display 1 website", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Hide blocked topsites forever", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
    });

    it("should not display the blocked topsite again", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Cancel blocking topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('.blockTopsite')[0].click();
      $('#cancelEditTopsites')[0].click();
      contentWindow.jsAPI.search();
    });

    it("should not deleted the blocked topsite again", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("restore blocked topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[1].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.jsAPI.restoreBlockedTopSites();
      contentWindow.jsAPI.search();
    });

    it("should display the restored topsites", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Deduplicate sites with common domain", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink("http://www.tagesschau.com/eilmeldung/eilmeldung-1204.html");
      contentWindow.osAPI.openLink("http://m.tagesschau.de/eilmeldung/eilmeldung-1205.html");
      contentWindow.jsAPI.search();
    });

    it("should display one topsite", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
    });
  });
});



describe("Startup", function () {
  var testBox;

  beforeEach(function () {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(10000);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame");
    testBox.src =   "/build/index.html";
    document.body.appendChild(testBox);


    contentWindow = testBox.contentWindow;

    function waitForWindow(win) {
      return new Promise(function (res) {
        win.addEventListener('newsLoadingDone', function () { res(); });
      });
    }

    return new Promise(function (resolve) {
      contentWindow.onload = resolve;
    }).then(function () {
      return Promise.all([
        injectSinon(contentWindow)
      ])
    }).then(function () {
      fakeServer = sinon.fakeServer.create({
        autoRespond: true,
        respondImmediately: true
      });
      newsResponse([]);

      contentWindow.sinonLoaded = true;
      return waitForWindow(contentWindow);
    });
  });

  afterEach(function () {
    contentWindow.CliqzUtils.getLocalStorage().clear();
    fakeServer.restore();
    document.body.removeChild(testBox);
  });

  context("Language loading", function () {

    beforeEach(function () {
      contentWindow.sinon.FakeXMLHttpRequest.addFilter(function (method, url) {return url.indexOf('static/locale/') !== -1;});
      contentWindow.sinon.FakeXMLHttpRequest.useFilters = true;
      contentWindow.CliqzUtils.locale = {};
    });

    it("should load default language if locale is not recognized", function () {
      contentWindow.CliqzUtils.loadLocale('it-IT');

      expect(contentWindow.CliqzUtils.locale['it-IT']).to.be.not.ok;
      expect(contentWindow.CliqzUtils.locale.default).to.be.ok;
    });
  });
});
