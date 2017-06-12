const ENGINES = [
  {
    "name": "google",
    "alias": "",
    "icon": "data:image/x-icon;base64,aaabaaiaebaaaaaaaab9aqaajgaaacagaaaaaaaa8giaakmbaacjue5hdqoacgaaaa1jsersaaaaeaaaabaibgaaab/z/2eaaafesurbvdjlpznjswnbeixnt4le4khxovgt9bdwjhqpy0heeojbiaucrg+kudc4qs4krpc4gcbge3nq48jsnz6ez3uom6gjaephqu93v6+qq2q0pqgejj2s8edjt1hr0oxbtkcd5ied8qxdypvhvobaumdkurx9c9apu4ga1gevkzvmg10ubfyvewawgyap00v01fa+r9m2ba51wjvhin3qr+ybt3d3jnqbe5smjciolfpohzowdslro22qa6r6kiziwwxuvy/puqzihyz1vfm9cvcoosyndcbgysisdsjbnzjjmlr0fw8vap0xoz5gao/h+nzby4i/10xgwrpa+hmvdyhvrg2avu/lwcrkfadza16l1h330w1rngc3dijzcppyrm1bpvexx11clqr28xwblhpk1vq1ip/5mcos0coxdzil0vsj+dzfl+3t/vyaaaaasuvork5cyikjue5hdqoacgaaaa1jsersaaaaiaaaacaibgaaahn6evqaaak5surbvfjdxvfrsxrrfj9/jta/oywjf5xqm6d6ekhrgygiigjutcuevgqvwsrrkppeuqywwb8ye1igwilwlo/ude489s7m6zw7d9dlt53dmd29cfiwvxvo77x+51xpaausosxbauwzq4ecy5xji2xkzdycmlmew6lcniosgwzkjk1skckesealfp64t0mbjl4ow39mkdul0p2rsrootqhzdeueym1pbl39xcg/feeftwcy7g9w4csvuxjlbkcsq4nt9qywvfvt6rsakxw3aodgatzeyit+w1kjw7cjg0rctwdtrebbkd8a6h5pwsdb70ba3w/eur3wt/cmwgfw6yft4tnmqay7o1p2ncm4ft4anqh/jqbj2xv7kqixeaddql8es3+n8bku7oxnm+edim/du92upb3t/njgeanbdx/asbslruy5xn92cawxy5d8rv6gwllxsg4faentc90dqw13bllgxr2d3dcuedvkwotha1bxspxilwcm3hdthcfvufb26lcjpkoeaz9nki/lzqpsec7feol5ewnpseslixcalukapmuldjuqxqvaqnl3d/x/yqda4qbeq2tyc12by091mq17bg3r88nhklqbvmhvj89awnblyrwt9zxy2abaxtkgfdisxp/jp6fldw+as7gfsdjtj2eqso5khd43ngfbary/zxoqgzhe7gpm1jzuvchutmnbaxqpckgmjp3fdfgq6nbyehiao4b/yptffqjwnyq/bzkvqgcf90ja25ndiyrkboa/f8wipwi3x1g8ucxnu7ozus7tih0jbswws3riaf1w6lyku/ml2+8sgnjygqswtkrviy/qd9qqp6lno64q4fpakpxyziymho1jwk6p1ag2bsdnwqmhcc+m5khfjx+ylpxpvlbcx2mz5dzpi04k4kuwhhdsku3ph76iftg8ywlkaaaaaelftksuqmcc",
    "code": 3,
    "searchform": "https://www.google.com/search?q=&ie=utf-8&oe=utf-8"
  },
  {
    "name": "bing",
    "alias": "#bi",
    "icon": "data:image/x-icon;base64,aaabaaiaebaaaaeacadacwaajgaaacagaaabaagalaiaaaamaacjue5hdqoacgaaaa1jsersaaaaeaaaabaiagaaajcradyaaaajcehzcwaacxmaaastaqcanbgaaappaundufbob3rvc2hvccbjq0mgchjvzmlszqaaenqdu2duu+kwpffe9ejliicus29sfqggukklgbsrjiohcrbkicgh2rvrwrffrqqbykcia46ogiwvuswmigryb+qhoo6do4ikyvvhe6nr1rz35s3+tdc+56zznbppb8aidjzim1e1gaypqh4r4iphxmbh5c5agqokcaaqclnkixp9iwea+h48pcsiwae+aaf40wsiambnm8awhif/d+pcmvwbgiqbwhsroesigbqaqhqoqqyaqeybgj2yjlmaoaqaymtjyumauc0aycd/5tmagj34mxsbafuuirubojeaibnlieqaadsarm9wikuawdaafgzlxdka2c0amelxzkgaslcawm4qc7iacawamfgihskabhsaymgji3gahjkafebyvzzxk64q5yoaahizsjy5jdlfgvsilxehv1cuhijosrcrfdzhamgaqc7cezkzmoe0d+dzzaaaojeveecd8/14zg6uzs42jryoxy3qvwb/imji4/7lz6twqaaa4xr+0f4sl7magdsggg3+oixubghec6b194tmsg9atqcg6dpx83d4fjw8ragqudnz5etk2ereqlthyld9/mfcx8bx/wz5fjz89/xgvuikgtjdguce+odczprmprzpkgmeytzmj0f8twv//b3tisrjyrlykhtjurjxjksajpmypskjqpipxsxs/2ti3yz7az7fnqcwaj4be5etqf1ja/zljxbydmdi9waa8rtvwdqocaoaaiphz3f/7z/9r6alaibmszjxaabercquvmqzp8ciaabeoieqseeb9meylmaghmef3mel/ga2heikxmjceeikziaccmaprijckibnsb0qyc/uqb00wffohpnwdi7cvbgopxap+meinseoviejbehicbnhidqiawkkwcoocbezhfghwugeeoskimmiffeis5e1sdfsilqgvugd8j1yajmhxea6ktviadkc/ia8rzgugbjrpdqmtuo5qdcaheaic9bkddgajxagm9bytbo9jdah59craa/ajz5dxzda6bghm8rsmc7gw0kxocwjk2plssksdkvggrbwrao7ifvjz7f3bbkbrcajngr3qibhhkfiwexytthiqcacjdqr2gk3cqoeucinipoos7qmuhh5xbhimjghwegsi9ysjxmvehuiq8q3jbkjqzinuzacsbgkvnis0kbsblij6sypmzrigiotydpka7ihozqsicvihesd5mpkm+qb5chywwqdykbxppht4ihsympkgeuq5ttlbmwymkfvo5ps3aihvbe1j1pcrag2uq9rh6gtnhwaoc2dfkllpa2ildmaabdo92mv6hs6ed2vhk6x0ffsy+lh6jfoa/r3da2gfyphigcogzsybxhngxcyr5hmphntixnhvda3meuy55kpmw9vwcq2knwvkcokluqvjpubki9uqaqmqt6qc1xzvctuj6leu32urluzu+opcdswq1wqnvdruxttz6k7qieqz6hvvd+kfln9iqzzw0zdt0okuacxx+o8xialyxmzecwhaw2rhnwbncqmsc3zfhyqu5j9hbulpaqpotldm0ozv7ns85rmpwfjmhh4nhrocecop5fzforefo8p4ikbpjrmutflxguqlpewwktiq1grr+u9nq7tp52mvuw7wfubdkhhsidcj0dnj84fnedt2vpdpwqnfk09ovwulqprpruhu0r3v26n7pievl6ankxvp955vef6hh0v/vt9bfqn9ucmwaazdcqg2wzogdzfnxfvpb0vx9vxuundw0bdpwgvyzfhhjg50tyj1uanrg+maczc4ytjbcztxqmmbiyhjktn6k3umljnuayppjtmo0zhzcznos3wmtwbpthxmueb55vxm9+3yfp4wiy2qla4zumy5fqmwe62vg6fwjlzpvhvwl2zrq2drsxwu627pxgnuu6ttque1mfdspg2ybaptxmw5dgg2662bbz9ywdif2e3xa7d7po9k326fy39pqcnh9koqx1ahx5zthiuoly63prono4/fcx0lukvz1jpem/ym+o2e8spxgmdu5vtr2cxz7lzg/oii4llgssulz4umxvg3ci95ep09xfd4xrs9z2bs5vc7ajbr+427mnuh9yfzdsfkz5zm3pqw8hd4fhl0t8ln5uwa9+sfk9dt4fntecjl2mvkvet17c3pxeq92hvfz72pnkf4z7jpdfemt5zx8w3wlfit8tpw2+ex4xfq38j/2t/ev/rakeajqfna4mbqyfbavv4enwhv44/ottl9rlz7ugmollbfugpgq2c5cgtiwji7jctiffnmm6rzmkohvb+6nbqb2hmyyvdfgwnhyefv4y/jnciwbrrmzc1d9hcq3pfrppelktem2cxtzmvluo1kj6qlmo82je6nlo/xi5mwczvwj1yswxlhdkukq42bmy+3/zt84fineil43sxmc/ixxb5oc7c9iwnfqkueiw6lkbmie44lpbbecqofowl8hn3jy4kecidwmcil9e20yjyq1wqhk7yscpneplskbw1estfm6us5bmej6mqvewntn2bop4wmnygbti9or0xg5krkhfcqifnk7zn6mfmznblrgwfsv7fbou3lx6vb8lrs5csbvktcrzcpuhuwijxkgeyz2vxzr/nico5lquek83tzlpk25a3no+f/+0swhlhkralhktxlr1y5r2sajmyphf52wrjfqurhlygrdy4iryqbdvpq+1xl65+vsz6twubxshkgsg1awvrc1uk5yv969zx7v1pwc9z37vh+oadgz4viyqufnsxlxv/2cjceoubh2/kv5ncllspq8s5zm9m0mbp5t4tnlsolqqx5pcobg3z2rqn31a07fx2rdsvl80o27udtko5o788ulxlp8nozts/vkru9ft6vdbu0t21ydf4bthug3u89jts1dtbvpf9psm+21ubvu3vztvl+0n7s/c/romq6fiw+21dru5tce3ha9id/qcjdrbxudtvhdi9vfkp1ivrrw7hh77+ne93lq02dvwnnmbii3beeetp9wnf9x4notp2jhus4qfth3ydzx0vakka8ppgm1oa+1tiw7ppzd7r1ureevxh2x8pndq8wxlk81tjadrpgtotz/lpjj2vnx1+lvncynuitnvny87fag9v77oqdohsrf+l5zu8o85c8rh08rlb5rnxufearzpfbep06jz+k9npx7ucu5quuvxrue56vbv7zvfpg543zt30vxnxfv/w1z45pd2983pv98x39d8w3x5yj/3oy7vzdyfurbxpvf/0qo1b2updh9u/w/7c2o/cf2rad6dz0dxh9wafg8/+kfwpd0mfj5mpy4ynhuueod45oei/cv3p/kddz2tpjp4x/ql+y64xfi9++nxr187rmnghl/kxk79tfkx96sdrga/bxslghr7jedmxxvrw++3bd9x3he+j3w9p5hwgfyj/apmx9vpqp/utgzot/wqdmpp8yzmt2waaacbjsfjnaab6jqaagimaapn/aaca6qaadtaaaopgaaa6maaaf2+sx8vgaaabbuleqvr42ml8v4objmaez/0ntgmlnlxtitkro9jmci9cnr/wsp8mrohfp8ybl4rvvbbwfxuvi/wgsjmyshusmujby8ln/ttm4bmo1btw5n+endippmndbrhjqiin6x9duzc2yk8tlz7hc5kx/atzxecmdazff7mcuys9/7goat8wmjauoz9x0xhi2a98hl+eub/vusg/8ozgmy+ceef+zp/ynyjxfvptv9o63flpbx6iccvz32dd24egt7fo4gb/zcx2z84rpbiiqfylzjtl4rzfsdvjuf3r91+sc09o//7ljmn/ndxmkqhssyzeq0t8j9/znn8s7ql9dy34cwogibuscqadaj+jwqrh9lcsaaaaaelftksuqmccivborw0kggoaaaansuheugaaacaaaaagcaiaaad8go2jaaacw0leqvr4ngp8v5obpocjtsbtwqiwtkguxe5mci9m5v/osl9mzf5hoqwmmheqod0awubg/wmo+8pb/zgzwguylcdiazj48zvl+d2ptz/yklgacbxcfszctulewuahgdqw3hstcoof8p//jkragc+skqe/58/0pa7c7l9n5v+aktw3kh3fxvkxmhyi83y3vxl64jbs3htye2/isbh8nzb9zabw3ft+jr/ntypywmdaegbw+8atwqj71x/mu/clt92xzgt8ry7+zlzxhbnic0n+lxrzic/8yuju5blh4sic//8z3nghfoof8mlj2jkcnydh7extrvoqcjc4g0f2yxtetehslncvft0wcnhm4qxxiymeiiiatcm3mpjvn37gmx7q8oozyylqyclotz/wldulryzpdmt4qff6nzz95gvnyjma+27i/sm6xxgwqjj7r6rtjqyghk8/2naeu9t+rfh3x2zcihwep5fmgazg53qfy9zsv1ed0dh4uexbl5ykudl/r5tdd9o6t4ifghjvyz1ohbkts/qc2qfv7liumtiwogk8irw4yo8jp2o3wezxubhcy7i1dq+/coiymogbqvn0q5rtrtxx93juylfax+b1sw88p+5l4thgy/er2uy6m9ydrsb/ejrht8bs+emcy7q4ndaymlhppyixumbd/gu/0vd1wbtezz7w9o81vvnkee1ctfxdmu0lzdepxbinzwigboa//xhxndfyfu4nusnwcf6ms7jmppgq1bohpwuqcoof0ot9roayryjnr3oz/ybrccisobwmmkp/8foaadmgy6ulkggyaaaaaelftksuqmcc",
    "code": 5,
    "searchform": "https://www.bing.com/search?q=&pc=mozi"
  },
  {
    "name": "amazon.com",
    "alias": "amazon",
    "icon": "data:image/x-icon;base64,aaabaaiaebaaaaaaaac0aqaajgaaacagaaaaaaaa6qiaanobaacjue5hdqoacgaaaa1jsersaaaaeaaaabaibgaaab/z/2eaaaf7surbvdjllzplasjafiafrf+ivv+h6ho0gf+gvb9aahwdt64qcg03tqgtdcfiuyhuelmgli66mxthst24knifbulayi6ezjnnxsuawb/itp7v/hnmjgqaeazzpghs/gwctytexuxl2u6na8viebk5hkler28cvrawnb9ptvrah8mrqucaz4ia8fziqsgcxwzptiasun/rwgwdylwcubqfzfkgszlgqdmee7yen8voakyaskuw4nnbafmnyikzpdrx1wqwbbzp089n5f/neqsfl4wqqtsbwjlzdajr5pwsmm1awezzdxibgi3hvc6jczevfgrqrwpy7qcw3ktgfpr8wlrxcpaot/x4gs95mppff6dx9n2a3f+kazycat8bazju6r6b/dud6d3byg9wqq/tkyzhy1bleiz5lmqygc95mro6r2cxgpjcbxgnsjvviolpxjiraeoijjre10juua4sr8v+mo17vvmgqtuocdnlwut8ztqjcj0njifyb2bgtdkh6w4baaaaaelftksuqmccivborw0kggoaaaansuheugaaacaaaaagcayaaabzenr0aaacseleqvryw71xqwsturbe2lqgenklb+tvemt6txctensd/qgc6veigdx5s+ekpqqfgjhlndflbwmp7cu0osawjb70koc9whbvq5so8+xts14mr7svyaydh9m87jv55puzt1npi4yizjmemj7t9owji88455ngc1czx+nsdesumjmpfdwiaqrx6z00gg1qt9vjkjgfgueuo16vy3rjezkymzm9+my1fsm9i9h9zyv7zaznzra4faofvwj1z+wuoysrg1lnmolkhjx4k0igzi5sarywf7vezek0rvo6iyusujfljuqm7zysqrdira4oouzpmnzsnrsl8uvtpkjajh1gzmaspj8mawmyezb5urhrhw5snofuccdo47w1bvpzsp2qahipy3nz1kalg8ducebqm5avpgelqfar01ngizsdco7zb7vasu2yigiyl5tjqcl7q5ykfqxklcqq7dbhthialk/iwakor82xpihshxwabcyiodmz51sexcvi0xog4dpliyvjjktark3scdqnrvo0mdtruhgikzcp4tngo6baei08eqh9z2qow0hypypjgia9p6jwkcn4sa8jskmjidgyrvpjkcrxjfuwngr/i8+mo32ihzwithbd4nm60bet9p77/uba728rltjmiwih6zeefvirwdzftqmmj7w/ofidbzd5m3mvzgwjcop2kmililcke45hopwurwcsg0+uqrd4zyxxid+t7gqb9+4q9sioy5ltrog3l5vqxiijffdx/aui83zj7jr2ohceu8hh6/m+i7owgivxbwkhsz+o3vsoakqfqdsfgqejuikd7wv9ykxbgcesuc3v2km5ejhlhdh3ncgcplg1bxzu98sdmtuba4fsmnz9fnijuagzs+emc540xur0ado2l8y3qpymcdom+r/8xcqra3qp9gaaaabjru5erkjggg==",
    "code": 7,
    "searchform": "http://www.amazon.com/exec/obidos/external-search/?field-keywords=&mode=blended&tag=mozilla-20&sourceid=mozilla-search"
  },
  {
    "name": "youtube",
    "alias": "#yt",
    "icon": "data:image/gif;base64,r0lgodlheganaomkaaaaabuvfroagisrkzk5ouxmtgrkzls0tm/pz9/f3////////////////////////yh5baekaa8alaaaaaasaa0aaart8ml5arg3nmkluqihxmruyniwsceanyawakocgisbjc4mskmdwpjbhfc/h+xhqaemsuso9efrnscmezrdcomagbgbsuf0phjq9wipnyjb9/umfyiaow==",
    "code": 1,
    "searchform": "http://www.google.de"
  }
];


export default describeModule("autocomplete/result-providers",
  function () {
    return {
      "core/utils": { default: { getLanguageFromLocale() {} } },
      "core/console": { default: { log() {} } },
      "autocomplete/result": { default: {} },
      "autocomplete/calculator": { default: { init() {} } },
      "core/search-engines": { setSearchEngine: function () {} }
    }
  },
  function () {
    let resultProviders, utils;
    beforeEach(function() {
      this.deps("core/utils").default.getPref = () => {};
      resultProviders = new (this.module().default)();
    });

    describe('custom search - #team', function(){
      it('should return #team result', function(){
        const team = resultProviders.customizeQuery('#team'),
          expected = {"updatedQ":"#team","engineName":"CLIQZ","queryURI":"https://cliqz.com/team/","code":"#"}
        chai.expect(team).to.deep.equal(expected);
      });
    });

    describe('custom search - maps', function(){
      const queryURI = "https://maps.google.de/maps?q=wisen";
      let resultProviders;
      beforeEach(function () {
        this.deps("core/utils").default.getPref = () => {};
        this.deps("core/utils").default.getEngineByAlias = function (alias) {
          if (alias === "#gm") {
            return {
              name: "Google Maps",
            }
          }
        };
        this.deps("core/utils").default.getSearchEngines = function () {
          return [{
            name: "Google Maps",
            getSubmissionForQuery() { return queryURI; }
          }];
        };
        resultProviders = new (this.module().default)();
      });

      it('should return google maps result for wisen', function(){
        const customQuery = resultProviders.customizeQuery('#gm wisen'),
          expected = {"updatedQ":"wisen","engineName":"Google Maps", queryURI,"code":2};

        chai.expect(customQuery).to.deep.equal(expected);
      });

      it('should return google maps result for wisen when shortcut is in the end', function(){
        const customQuery = resultProviders.customizeQuery('wisen #gm'),
          expected = {"updatedQ":"wisen","engineName":"Google Maps","queryURI":"https://maps.google.de/maps?q=wisen","code":2};

        chai.expect(customQuery).to.deep.equal(expected);
      });
    });

    describe('custom search - updateAliases', function() {

      beforeEach(function () {
        const CliqzResultProviders = new (this.module().default)();
        this.deps("core/utils").default.getEngineByName = function (name) {
          return ENGINES.find(engine => engine.name === name);
        };
        this.deps("core/utils").default.updateAlias = function (name, newAlias) {
          for(var engine in ENGINES) {
            if(ENGINES[engine].name === name) {
              ENGINES[engine].alias = newAlias;
            }
          }
        };
        this.deps("core/utils").default.getSearchEngines = function () {
          return ENGINES;
        };
      });

      it('should update an empty alias to first 2 letters', function() {
        var resultProviders = new (this.module().default)();
        //arrange
        const expected = "#go";

        //act
        resultProviders.updateEngineAliases()

        //asert
        chai.expect(resultProviders.getEngineByName('google').alias).to.equal(expected);
      });
    });
  }
);
