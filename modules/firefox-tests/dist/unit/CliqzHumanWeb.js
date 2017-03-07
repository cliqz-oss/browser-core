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

	describe('human-web.isSuspiciousTitle', function() {
        var not_suspicious = ['',
            'Firefox',
            '\n  Booking.com:  Hotels in Berlin.  Buchen Sie jetzt Ihr Hotel!  \n',
            'bet365 - Sportwetten, Fußball-Quoten für die Bundesliga und Champions League, ATP- und WTA-Tennis-Quoten, sowie Basketball-Wetten auf die BBL und Euroleague, Casino, Poker, Spiele, Vegas'
            ];

        var suspicious = ['Redaxo 5.x.x (29.10.12 - 4f0849709c511232fe72059d5a1d3344a668035a): redaxo5/redaxo/src/addons/structure/plugins/content/lib/article_slice.php Source File',
        'meine telephone number +491861200214001',
        'Email id a@a.com',
        'Blog Nachhaltige Wissenschaft – Große gesellschaftliche Herausforderungen wie der Klimawandel und Umweltprobleme erfordern neues Wissen. Eine „transformative Wissenschaft\" steht vor der Herausforderung, die gesellschaftliche Transformation zu einer Nachhaltigen Entwicklung nicht nur zu analysieren und zu begleiten, sondern auch aktiv zu befördern. Um dies leisten zu können, muss sich das Wissenschaftssystem selbst institutionell transformieren. Hierfür setzen sich die „NaWis“-Runde und das „Ecological Research Network“ (Ecornet) ein. Auf diesem Blog geben sie einen Überblick über Akteure, Initiativen und Projekte einer transformativen Wissenschaft auf nationaler und internationaler Ebene.'
        ]

		suspicious.forEach( e => {
			it("'" + e + "' is suspicious title", function () {
				expect(CliqzHumanWeb.isSuspiciousTitle(e)).to.equal(true);
			});
		});


		not_suspicious.forEach( e => {
			it("'" + e + "' is not suspicious title", function () {
				expect(CliqzHumanWeb.isSuspiciousTitle(e)).to.equal(false);
			});
		});
	});

	describe('human-web.allowedCountryCode', function() {
        var allowed = [
            'de',
            'us'
            ];

        var not_allowed = ['gr', null, undefined, 'in','mm']

		not_allowed.forEach( e => {
			it("'" + e + "' is not allowed", function () {
				expect(CliqzHumanWeb.sanitizeCounrtyCode(e)).to.equal('--');
			});
		});


		allowed.forEach( e => {
			it("'" + e + "' is allowed", function () {
				expect(CliqzHumanWeb.sanitizeCounrtyCode(e)).to.equal(e);
			});
		});
	});
};

TESTS.HumanWebTest.MIN_BROWSER_VERSION = 48;