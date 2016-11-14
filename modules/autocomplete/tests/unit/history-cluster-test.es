export default describeModule("autocomplete/history-cluster",
  function () {
    return {
      "core/cliqz": { utils: {} },
      "autocomplete/result": { default: {} },
      "core/history-manager": { default: {} },
    }
  },
  function () {

    describe('_removeDuplicates', function() {
      // Cannot load real CliqzUtils so had no other way than copy code
      let utils = {
        cleanUrlProtocol: function(url, cleanWWW){
          if(!url) return '';

          var protocolPos = url.indexOf('://');

          // removes protocol http(s), ftp, ...
          if(protocolPos != -1 && protocolPos <= 6)
            url = url.split('://')[1];

          // removes the www.
          if(cleanWWW && url.toLowerCase().indexOf('www.') == 0)
            url = url.slice(4);

          return url;
        },
        generalizeUrl(url, skipCorrection) {
          if (!url) {
            return '';
          }
          var val = url.toLowerCase();
          var cleanParts = utils.cleanUrlProtocol(val, false).split('/'),
          host = cleanParts[0],
          pathLength = 0,
          SYMBOLS = /,|\./g;
          if (!skipCorrection) {
            if (cleanParts.length > 1) {
              pathLength = ('/' + cleanParts.slice(1).join('/')).length;
            }
            if (host.indexOf('www') === 0 && host.length > 4) {
              // only fix symbols in host
              if (SYMBOLS.test(host[3]) && host[4] != ' ')
                // replace only issues in the host name, not ever in the path
                val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                  (pathLength ? val.substr(-pathLength) : '');
            }
          }
          url = utils.cleanUrlProtocol(val, true);
          return url[url.length - 1] == '/' ? url.slice(0,-1) : url;
        }
      };

      beforeEach(function () {
        this.deps("core/cliqz").utils.generalizeUrl = utils.generalizeUrl;
      });

      it('should take first if no https', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/'
          },
          { title: 'title 2',
            url: 'http://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take first if all https', function(){
        var source = [
          { title: 'title 1',
            url: 'https://www.abs.com/'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/'
          },
          { title: 'title 3',
            url: 'https://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https if in pos 0', function(){
        var source = [
          { title: 'title 1',
            url: 'https://www.abs.com/'
          },
          { title: 'title 2',
            url: 'http://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https if in pos 1', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https in pos 0 if titles the same', function(){
        var source = [
          { title: 'title',
            url: 'https://www.abs.com/gsgfds'
          },
          { title: 'title',
            url: 'http://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https in pos 1 if titles the same', function(){
        var source = [
          { title: 'title',
            url: 'http://www.abs.com/gsgfds'
          },
          { title: 'title',
            url: 'https://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should leave alone if all different urls and titles', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/gsgfds'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = source;

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take one with best title without www', function(){
        var source = [
          {"url":"https://www.twitter.com/",
           "title":"twitter.com"
          },
          {"url":"https://twitter.com/",
           "title":"Welcome to Twitter - Login or Sign up"
          },
          {"url":"http://www.twitter.com/",
           "title":"twitter.com"
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take one with best title with www', function(){
        var source = [
          {"url":"https://www.twitter.com/",
           "title":"www.twitter.com"
          },
          {"url":"https://twitter.com/",
           "title":"Welcome to Twitter - Login or Sign up"
          },
          {"url":"http://www.twitter.com/",
           "title":"www.twitter.com"
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: utils.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(this.module().default._removeDuplicates(source)).to.deep.equal(expected);
      });

    });
  }
);
