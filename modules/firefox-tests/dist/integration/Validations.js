//extracts only the key from a line of text
function key(line){
  return /\"(.*?)\"/.exec(line)[0];
}

TESTS.Validations = function (CliqzUtils, CLIQZEnvironment) {
  // translations files should have exactly the same keys on exactly the same lines
  describe('LocaleValidation_DE_EN', function(){
    this.retries(1);

    it('should be symetric', function () {
      var de = null, en = null;
      CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + 'de/cliqz.json',
        function(req){
          de = req.response;
        });

      CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + 'en/cliqz.json',
        function(req){
          en = req.response;
        });

      return waitFor(function () {
        return de != null && en != null;
      }).then(function(){

        de = de.split('\n').slice(1,-2);
        en = en.split('\n').slice(1,-2);
        chai.expect(de.length).to.equal(en.length);

        for(var i=0;i<de.length;i+=3){
          chai.expect(key(de[i])).to.equal(key(en[i]));
        }
      });
    });
  });
};
