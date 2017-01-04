import background from "core/base/background";
import utils from "core/utils";
import UITour from 'platform/ui-tour';

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, manager: Cm } =
    Components;

const StringInputStream = CC(
  '@mozilla.org/io/string-input-stream;1',
  'nsIStringInputStream',
  'setData');
const InputStreamChannel = Cc["@mozilla.org/network/input-stream-channel;1"];
const securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(
    Ci.nsIScriptSecurityManager);

const ONBOARDING_URL = utils.CLIQZ_ONBOARDING_URL;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

function AboutURL() {}
AboutURL.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: utils.CLIQZ_ONBOARDING,
  classID: Components.ID("{be8a8710-7611-11e6-bdf4-0800200c9a66}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=onboarding",

  newChannel: function(uri) {
    var html =  [
        '<!DOCTYPE html><html><head><title>CLIQZ</title><meta charset="UTF-8">',
        '<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>',
        `</head><body><iframe src="${ONBOARDING_URL}">`,
        '</iframe></body></html>'
    ].join("");

    let channel = InputStreamChannel.createInstance(Ci.nsIInputStreamChannel).
        QueryInterface(Ci.nsIChannel);
    channel.setURI(uri);
    channel.originalURI = uri;
    channel.contentStream = new StringInputStream(html, html.length);
    channel.owner = securityManager.getSystemPrincipal();

    return channel;
  },

  getURIFlags: function(uri) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  }
};

const AboutURLFactory =
    XPCOMUtils.generateNSGetFactory([AboutURL])(AboutURL.prototype.classID);

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  enabled() {
    return true;
  },

  /**
    @method init
    @param settings
  */
  init(settings) {
    Cm.registerFactory(
      AboutURL.prototype.classID,
      AboutURL.prototype.classDescription,
      AboutURL.prototype.contractID,
      AboutURLFactory
    );
  },

  unload() {
    Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    initOnboarding() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'addClassToWindow',
        ['cqz-onboarding', 'cqz-step1']
      );

      UITour.targets.set("cliqz", { query: '#cliqz-cc-btn', widgetName: 'cliqz-cc-btn', allowAdd: true });
      return this.actions._getStep();
    },

    _getStep() {
      return Promise.resolve(utils.getPref(utils.BROWSER_ONBOARDING_STEP_PREF, 1));
    },

    step1() {
      utils.setPref(utils.BROWSER_ONBOARDING_STEP_PREF, 1);
    },

    step2() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'addClassToWindow',
        ['cqz-step2']
      );

      utils.setPref(utils.BROWSER_ONBOARDING_STEP_PREF, 2);
      var mockedData = {"q-button":{},"static":{},"core":{},"autocomplete":{},"geolocation":{"visible":true,"state":{"yes":{"name":"Always","selected":true},"ask":{"name":"Always ask","selected":false},"no":{"name":"Never","selected":false}}},"ui":{},"human-web":{"visible":true,"state":false},"anti-phishing":{"visible":true,"active":true},"context-menu":{},"onboarding":{},"freshtab":{},"unblock":{},"theme":{},"telemetry-categories":{},"antitracking":{"visible":true,"strict":false,"hostname":"www.nytimes.com","cookiesCount":16,"requestsCount":1,"totalCount":17,"enabled":true,"isWhitelisted":true,"reload":false,"trackersList":{"tab":2147483649,"hostname":"www.nytimes.com","path":"6666cd76f9695646","cookies":{"allowed":0,"blocked":16},"requests":{"safe":41,"unsafe":1},"trackers":{"cdn.optimizely.com":{"c":2,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"securepubads.g.doubleclick.net":{"c":6,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"cdn.krxd.net":{"c":4,"cookie_set":4,"cookie_blocked":4,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"s.tagsrvcs.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"contextual.media.net":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"www.google-analytics.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"sb.scorecardresearch.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"dc8xl0ndzn2cb.cloudfront.net":{"c":2,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"z.moatads.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"pnytimes.chartbeat.net":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"b.scorecardresearch.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"st.dynamicyield.com":{"c":1,"cookie_set":1,"cookie_blocked":1,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"p2.keywee.co":{"c":1,"cookie_set":2,"cookie_blocked":2,"bad_cookie_sent":0,"bad_qs":1,"tokens_removed":1},"www.facebook.com":{"c":6,"cookie_set":6,"cookie_blocked":6,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"static.dynamicyield.com":{"c":1,"cookie_set":1,"cookie_blocked":1,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"beacon.krxd.net":{"c":2,"cookie_set":2,"cookie_blocked":2,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"ag.innovid.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"r.nexac.com":{"c":8,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0},"tpc.googlesyndication.com":{"c":1,"cookie_set":0,"cookie_blocked":0,"bad_cookie_sent":0,"bad_qs":0,"tokens_removed":0}},"companies":{"Optimizely":["cdn.optimizely.com"],"Doubleclick by Google":["securepubads.g.doubleclick.net"],"Krux":["cdn.krxd.net","beacon.krxd.net"],"tagsrvcs.com":["s.tagsrvcs.com"],"media.net":["contextual.media.net"],"Google Analytics":["www.google-analytics.com"],"comScore":["sb.scorecardresearch.com","b.scorecardresearch.com"],"Amazon.com":["dc8xl0ndzn2cb.cloudfront.net"],"Moat":["z.moatads.com"],"Chartbeat":["pnytimes.chartbeat.net"],"DYNAMIC YIELD":["st.dynamicyield.com","static.dynamicyield.com"],"keywee.co":["p2.keywee.co"],"Facebook":["www.facebook.com"],"innovid.com":["ag.innovid.com"],"Datalogix":["r.nexac.com"],"Google":["tpc.googlesyndication.com"]},"ps":{"tldHash":"1b3726503af8d49e","role":"site","score":51.32,"datetime":"2016090715"},"companiesArray":[{"name":"Krux","domains":[{"domain":"cdn.krxd.net","count":4},{"domain":"beacon.krxd.net","count":2}],"count":6},{"name":"Facebook","domains":[{"domain":"www.facebook.com","count":6}],"count":6},{"name":"keywee.co","domains":[{"domain":"p2.keywee.co","count":3}],"count":3},{"name":"DYNAMIC YIELD","domains":[{"domain":"st.dynamicyield.com","count":1},{"domain":"static.dynamicyield.com","count":1}],"count":2},{"name":"Optimizely","domains":[{"domain":"cdn.optimizely.com","count":0}],"count":0},{"name":"Doubleclick by Google","domains":[{"domain":"securepubads.g.doubleclick.net","count":0}],"count":0},{"name":"tagsrvcs.com","domains":[{"domain":"s.tagsrvcs.com","count":0}],"count":0},{"name":"media.net","domains":[{"domain":"contextual.media.net","count":0}],"count":0},{"name":"Google Analytics","domains":[{"domain":"www.google-analytics.com","count":0}],"count":0},{"name":"comScore","domains":[{"domain":"sb.scorecardresearch.com","count":0},{"domain":"b.scorecardresearch.com","count":0}],"count":0},{"name":"Amazon.com","domains":[{"domain":"dc8xl0ndzn2cb.cloudfront.net","count":0}],"count":0},{"name":"Moat","domains":[{"domain":"z.moatads.com","count":0}],"count":0},{"name":"Chartbeat","domains":[{"domain":"pnytimes.chartbeat.net","count":0}],"count":0},{"name":"innovid.com","domains":[{"domain":"ag.innovid.com","count":0}],"count":0},{"name":"Datalogix","domains":[{"domain":"r.nexac.com","count":0}],"count":0},{"name":"Google","domains":[{"domain":"tpc.googlesyndication.com","count":0}],"count":0}]},"ps":{"tldHash":"1b3726503af8d49e","role":"site","score":51.32,"datetime":"2016090715"},"state":"active"},"performance":{},"hpn":{"visible":true,"state":false},"control-center":{},"hm":{},"privacy-dashboard":{"visible":true},"offers":{},"adblocker":{"visible":true,"enabled":true,"optimized":false,"disabledForUrl":false,"disabledForDomain":false,"disabledEverywhere":false,"totalCount":26,"advertisersList":{"Optimizely":["https://cdn.optimizely.com/js/3338050995.js"],"Doubleclick by Google":["https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3%2C%2F0%2F1%2F2%2F3&prev_iu_szs=320x50%7C1605x300%7C970x250%7C970x66%7C970x90%7C970x300%7C970x400%2C184x90%2C184x91%2C300x601%2C177x197%2C177x197%2C177x197%2C177x197%2C177x197%2C188x194&fluid=height%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&prev_scp=pos%3Dtop%7C%7C%7Cpos%3Dmid1%7Cpos%3Dfivepack1%7Cpos%3Dfivepack2%7Cpos%3Dfivepack3%7Cpos%3Dfivepack4%7Cpos%3Dfivepack5%7Cpos%3Dhpmodulere2&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433475&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&adys=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&adks=2305949168%2C1963738955%2C4081115050%2C1463390921%2C225869624%2C225869625%2C225869606%2C225869607%2C225869604%2C2906619329&gut=v2&ifi=1&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=33&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705","https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3&prev_iu_szs=300x602%7C300x50&prev_scp=pos%3Dmid2&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433530&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0&adys=0&adks=4035057510&gut=v2&ifi=12&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=34&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705","https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3&prev_iu_szs=320x50%7C1605x300%7C970x250%7C970x66%7C970x90%7C970x300%7C970x400%7C728x90&fluid=height&prev_scp=pos%3Dmid3&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433557&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0&adys=0&adks=4138418775&gut=v2&ifi=14&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=34&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705","https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3&prev_iu_szs=301x250&prev_scp=pos%3Dmktg&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433582&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0&adys=0&adks=3786646892&gut=v2&ifi=16&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=34&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705","https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3&prev_iu_szs=300x250&prev_scp=pos%3Dmid4&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433604&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0&adys=0&adks=2232440092&gut=v2&ifi=18&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=34&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705","https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=4234932412223132&output=json_html&callback=callbackProxy&impl=fifs&json_a=1&eid=108809080%2C108809115%2C108809135%2C108809146&sc=0&sfv=1-0-4&iu_parts=29390238%2CNYT%2Chomepage%2Cus&enc_prev_ius=%2F0%2F1%2F2%2F3&prev_iu_szs=320x50%7C1605x300%7C970x250%7C970x66%7C970x90%7C970x300%7C970x400%7C728x90&fluid=height&prev_scp=pos%3Dmid5&cust_params=plat%3Dweb%26prop%3Dnyt%26ver%3Dnyt5%26sub%3Danon%26typ%3Dhp%26edn%3Dus%26sov%3D1%26refresh%3Dtrue%26page_view_id%3Db0e97873-7627-4057-89a3-8843143719db%26aid%3D3de128faa7ecf0e77f9542ecc0e5cbc2%26ksg%3Dpc9fhzd0e%26kuid%3DKwuMHJfU&cookie=ID%3Da14037f904fc4061%3AT%3D1472814791%3AS%3DALNI_MZRdQU8xZujfLAY0FsqIoXlnH1b7Q&lmt=1473694433&dt=1473694433626&cc=100&frm=20&biw=1275&bih=1002&oid=3&adxs=0&adys=0&adks=1610348515&gut=v2&ifi=20&u_tz=120&u_his=2&u_java=true&u_h=1608&u_w=2859&u_ah=1530&u_aw=2859&u_cd=24&u_nplug=6&u_nmime=64&u_sd=0.896&flash=21.0.0&url=http%3A%2F%2Fwww.nytimes.com%2F&dssz=30&icsg=536870912&std=34&vrg=95&vrp=95&ga_vid=2146725642.1472814789&ga_sid=1473694433&ga_hid=2090293705"],"media.net":["https://contextual.media.net/bidexchange.js?cid=8CU2553YN&hd=1"],"Google Analytics":["http://www.google-analytics.com/analytics.js"],"comScore":["https://sb.scorecardresearch.com/c2/3005403/cs.js","http://b.scorecardresearch.com/b?c1=2&c2=3005403&ns__t=1473694435933&ns_c=UTF-8&c8=The%20New%20York%20Times%20-%20Breaking%20News%2C%20World%20News%20%26%20Multimedia&c7=http%3A%2F%2Fwww.nytimes.com%2F&c9="],"Moat":["https://z.moatads.com/googleessencenyt485873431/moatcontent.js?firstimp_bsg=74&loyalty_bsg=14&avgsestime_bsg=1017804.7857142857&referral_bsg="],"Chartbeat":["http://pnytimes.chartbeat.net/ping?h=nytimes.com&p=nytimes.com%2F&u=BL1cfrPJNlVC-jV4K&d=nytimes.com&g=16698&g0=Homepage%2C%2C&n=0&f=a0639&c=0&x=0&m=0&y=6311&o=1275&w=1002&j=45&R=1&W=0&I=0&E=0&e=0&r=&t=j6PdDRMilBBi-CT7C_6iEzDujMSm&V=80&i=The%20New%20York%20Times%20-%20Breaking%20News%2C%20World%20News%20%26%20Multimedia&tz=-120&sn=1&EE=0&_"],"Datalogix":["http://r.nexac.com/e/getdata.xgi?dt=br&pkey=iqbg41iqbgj68&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3Dafae52b8-1e27-4650-bd6a-ed7d982f5a6a%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=iefs40iefsj26&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3D8da8b14d-5569-4bec-bcea-722864ee8d06%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=iyzu39iyzud95&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3Dbef9f122-393d-4c45-8d8d-32d8be7ac433%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=bckw15bckwu20&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3D8bf57916-aac8-4f01-a386-4baf103b3e1f%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=gwjn34gwjnh86&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3Dd7158cb7-a851-4e3c-b7ab-cc9e815b2399%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=iefs40iefsj26&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3D536f0daa-aaaa-4d9e-9a25-dde40646786a%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=rowp70rowpu60&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3D7c6392c9-e878-492c-8b14-bf06e3828ebd%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E","http://r.nexac.com/e/getdata.xgi?dt=br&pkey=rsxs71rsxsk73&ru=http://beacon.krxd.net/data.gif?_kuid%3DKwuMHJfU%26_kdpid%3Dbb8ae0e2-9cd7-45b2-ad37-7737269627d8%26dlxid%3D%3Cna_id%3E%26dlxdata%3D%3Cna_da%3E"],"Google":["http://tpc.googlesyndication.com/safeframe/1-0-4/html/container.html"],"companiesArray":[{"name":"First Party","count":2},{"name":"Datalogix","count":8},{"name":"Doubleclick by Google","count":6},{"name":"comScore","count":2},{"name":"Optimizely","count":1},{"name":"media.net","count":1},{"name":"Google Analytics","count":1},{"name":"Moat","count":1},{"name":"Chartbeat","count":1},{"name":"Google","count":1},{"name":"Other","count":1}]},"state":"active","off_state":"off_website"},"https-everywhere":{"visible": true, "active": true},"onboarding-v2":{},"telemetry":{},"adult":{"visible":true,"state":{"conservative":{"name":"Always","selected":true},"moderate":{"name":"Always ask","selected":false},"liberal":{"name":"Never","selected":false}}},"apt":{"visible":true,"state":true}};

      setTimeout(function() {
        utils.callWindowAction(
          utils.getWindow(),
            'control-center',
            'openMockPopUp',
            [mockedData]
          );
      }, 500);

      utils.callWindowAction(
        utils.getWindow(),
        'control-center',
        'setMockBadge',
        [17]
      );
      utils.setTimeout(function() {
        var targetPromise = UITour.getTarget(utils.getWindow(), "cliqz");
        targetPromise.then(function(target) {
          UITour.showHighlight(utils.getWindow(), target, "wobble");
        });
      }, 1500);
    },

    step3() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'removeClassFromWindow',
        ['cqz-onboarding', 'cqz-step1', 'cqz-step2']
      );

      var targetPromise = UITour.getTarget(utils.getWindow(), "cliqz");
        targetPromise.then(function(target) {
          UITour.hideHighlight(utils.getWindow(), target);
          UITour.hideInfo(utils.getWindow(), target);
        });

      //only at 3rd step we consider that user finished the onboarding
      utils.setPref(utils.BROWSER_ONBOARDING_PREF, true);
      utils.setPref(utils.BROWSER_ONBOARDING_STEP_PREF, 3);

      utils.callWindowAction(
        utils.getWindow(),
        'control-center',
        'setMockBadge',
        [0]
      );

      this.actions._focusUrlbar();

      utils.callWindowAction(
        utils.getWindow(),
        'control-center',
        'updateState',
        ['active']
      );
    },

    finishOnboarding() {
      utils.openLink(utils.getWindow(), "about:cliqz");
    },

    _focusUrlbar() {
      var urlBar = utils.getWindow().CLIQZ.Core.urlbar;
      urlBar.focus();
      urlBar.mInputField.focus();
    },

    shakeIt() {
      utils.callAction('core', 'broadcastMessage', [
        ONBOARDING_URL,
        {
          action: 'shakeIt'
        }
      ]);
    }

  }
});
