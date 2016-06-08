'use strict';

var expect = chai.expect;

TESTS.CliqzHandlebarsTest = function (CliqzHandlebars) {
    describe('CliqzHandlebarsTest', function () {
        describe('localizeNumber', function () {
            it('normal number string localisation 1', function () {
                expect(CliqzHandlebars.helpers.localizeNumbers('1203'))
                    .to.equal(getLocaliseString({'de': '1.203', 'default': '1,203'}));
            });

            it('number with postfix, e.g. 1202.3B (B= Billion)', function () {
                expect(CliqzHandlebars.helpers.localizeNumbers('1202.3B'))
                    .to.equal(getLocaliseString({'de': '1.202,3B', 'default': '1,202.3B'}));

            });
        });

    });
};
