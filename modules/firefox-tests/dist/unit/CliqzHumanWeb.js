var expect = chai.expect;

DEPS.HumanWebTest = ["core/utils", "human-web/human-web"];
TESTS.HumanWebTest = function (CliqzUtils, CliqzHumanWeb) {
    // var System = CliqzUtils.getWindow().CLIQZ.System,
    //    CliqzHumanWeb = System.get("human-web/human-web").default;

	describe('human-web.isHash', function() {
        var not_hash = ['',
            'Firefox',
            'cliqz.com', // a url
            'anti-tracking',
            'front/ng',
            'javascript',
            'callback'
            ];

        var hashes = ['04C2EAD03B',
            '54f5095c96e'
        ]

		hashes.forEach( e => {
			it("'" + e + "' is a hash", function () {
				expect(CliqzHumanWeb.isHash(e)).to.equal(true);
			});
		});
	});


	describe('human-web.checkForEmail', function() {
		// Ref: https://en.wikipedia.org/wiki/Email_address
        var emails = ['email@domain.com',
            'firstname.lastname@domain.com',
            'firstname+lastname@domain.com	',
            '_______@domain.com'
        ]

		emails.forEach( e => {
			it("'" + e + "' is a email", function () {
				expect(CliqzHumanWeb.checkForEmail(e)).to.equal(true);
			});
		});
	});

	describe('human-web.vaildPrivateIP', function() {
        var privateIPs = [
        	'127.0.0.1',
        	'192.168.1.41',
        	'10.0.5.250'
        ]

		privateIPs.forEach( e => {
			it("'" + e + "' is a private IP", function () {
				expect(CliqzHumanWeb.isIPInternal(e)).to.equal(true);
			});
		});
	});

	describe('human-web.sha1', function() {
	    it("human-web-sha1", function (done) {
	    	this.timeout(2000);
			CliqzHumanWeb.sha1('hello').then( hash => {
				expect(hash).to.equal("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
				done();
			});

	    });
	});

};

TESTS.HumanWebTest.MIN_BROWSER_VERSION = 48;