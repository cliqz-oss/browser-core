Components.utils.import('chrome://cliqz/content/firefox-tests/screenshots/Screenshot.jsm');
Components.utils.import('chrome://cliqz/content/firefox-tests/screenshots/ConfigWriter.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


function loadScript(url, element, callback) {
    var script = document.createElement('script');
    script.src = url;
    script.onreadystatechange = callback;
    script.onload = callback;
    element.appendChild(script);
}

function fakeLanguage(lang) {
  var backup = {
    lang: CliqzLanguage.state,
    locale: CliqzUtils.encodeLocale
  };
  CliqzLanguage.state = function () {
    return [lang];
  };
  CliqzUtils.encodeLocale = function () {
    return '&locale=' + lang;
  };
  console.log('fake language: ' + lang);
  return backup;
}

function restoreLanguage(backup) {
  CliqzLanguage.state = backup.lang;
  CliqzUtils.encodeLocale = backup.locale;
  console.log('restore language');
}


function prepareScreenshotTest(cfg) {
    function padNumber(i, n) {
        var t = i;
        while (t >= 10) {
            n--;
            t /= 10;
        }
        var out = '';
        while (n > 0) {
            n--;
            out += '0';
        }
        return out + i;
    }

    function escapeQuery(query) {
        return query.replace(/\/|:| /g, '_');
    }

    function defaultBefore() {
        // Give browser some time to startup properly
        return new Promise(function (resolve) {
            setTimeout(resolve, 1000);
        });
    }

    function defaultAfter() {
        // Give browser some time save last image
        return new Promise(function (resolve) {
            setTimeout(resolve, 2000);
        });
    }

    function defaultBeforeEach() {
        CliqzUtils.getWindow().document.getElementById('mainPopupSet').style.position = 'relative';
        CliqzUtils.getWindow().CLIQZ.Core.popup.style.display = 'block';
        CliqzUtils.getWindow().CLIQZ.Core.popup.style.position = 'absolute';
        CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginTop = '72px';
        CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginLeft = '32px';
        CliqzUtils.getWindow().CLIQZ.Core.popup.style.boxShadow = '1px 1px 10px #ccc';
    }

    function writeLambdaConfig(cfg) {
        try {
            var data = {
                queries: cfg.queries,
                emails: cfg.emails,
                subject: cfg.subject,
                template: cfg.template,
                name: cfg.name,
                upload: cfg.upload
            };

            return ConfigWriter.writeFileToDownloads({
                data: data,
                filename: 'config.json'
            });
        }
        catch (e) {
            console.log(e);
        }
    }


    function runScreenshotTest(cfg) {
        var i = 0;
        var queries = cfg.queries;

        queries.forEach(function (query) {
            it('should take screenshot of query: '+ query, function() {
                fillIn(query);

                return waitForResult().then(function() {
                    return new Promise(function (resolve) {
                        setTimeout(resolve, 2000);
                        i++;
                    });
                }).then(function () {
                    return Screenshot.exec({
                        filename: (cfg.file_prefix !== undefined ?
                          cfg.file_prefix : 'dropdown-' + padNumber(i, 2) + '-') + escapeQuery(query)
                    });
                });
            });
        });

        writeLambdaConfig(cfg);
    }


    var testFunction = function(CliqzUtils) {
        describe('SmartCliqz', function(){
            var t = 5000;
            if (cfg.hasOwnProperty('timeout'))
                t = cfg.timeout;

            this.timeout(t);

            try {
                if (cfg.hasOwnProperty('width')) {
                    window.resizeTo(cfg.width, window.outerHeight);
                }

                // override, add extra steps, or use the default before() code
                if (cfg.hasOwnProperty('before')) {
                    if (typeof(cfg.before) == 'function')
                        before(cfg.before);
                }
                else {
                    before(defaultBefore);
                }

                if (cfg.hasOwnProperty('extraBefore')) {
                    for (var i=0; i<cfg.extraBefore.length; i++) {
                        before(cfg.extraBefore[i]);
                    }
                }

                // override, add extra steps, or use the default beforeEach() code
                if (cfg.hasOwnProperty('beforeEach')) {
                    if (typeof(cfg.beforeEach) == 'function')
                        beforeEach(cfg.beforeEach);
                }
                else {
                    beforeEach(defaultBeforeEach);
                }

                if (cfg.hasOwnProperty('extraBeforeEach')) {
                    for (var i=0; i<cfg.extraBeforeEach.length; i++) {
                        beforeEach(cfg.extraBeforeEach[i]);
                    }
                }

                // override, add extra steps, or use the default after() code
                if (cfg.hasOwnProperty('after')) {
                    if (typeof(cfg.after) == 'function')
                        after(cfg.after);
                }
                else {
                    after(defaultAfter);
                }

                if (cfg.hasOwnProperty('extraAfter')) {
                    for (var i=0; i<cfg.extraAfter.length; i++) {
                        after(cfg.extraAfter[i]);
                    }
                }

                // override, add extra steps, or use the default afterEach() code
                if (cfg.hasOwnProperty('afterEach')) {
                    if (typeof(cfg.afterEach) == 'function')
                        afterEach(cfg.afterEach);
                }
                // we don't have default afterEach() at the moment
                //else {
                //    afterEach(defaultAfterEach);
                // }

                if (cfg.hasOwnProperty('extraAfterEach')) {
                    for (var i=0; i<cfg.extraAfterEach.length; i++) {
                        afterEach(cfg.extraAfterEach[i]);
                    }
                }

                runScreenshotTest(cfg);
            }
            catch (e) {
                console.log(e);
                throw(e);
            }
        });
    };

    return testFunction;
}


// Load module with queries
loadScript(
  'chrome://cliqz/content/firefox-tests/screenshots/queries.js',
  document.getElementsByTagName('head')[0]
);

// Prepare selected test
setTimeout(
  function() {
    loadScript(
      'chrome://cliqz/content/firefox-tests/screenshots/' + getParameterByName('test'),
      document.getElementsByTagName('head')[0]
    );
  },
  250
);

// Give firefox some time to load the whole document
setTimeout(
    function(){
        loadScript(
          'chrome://cliqz/content/firefox-tests/tests-index.js',
          document.getElementById('mocha')
        );
    },
    1000
);
